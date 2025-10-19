/**
 * MCP SSE Client
 * Playwright MCPサーバーとのSSE接続を管理
 */

const axios = require('axios');

class MCPSSEClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace('/mcp', ''); // http://localhost:8931
    this.sseEndpoint = null; // /sse?sessionId=xxx
    this.sessionId = null;
    this.pendingRequests = new Map(); // id -> {resolve, reject, timeout}
    this.requestId = 0;
    this.connected = false;
    this.messageBuffer = '';
  }

  /**
   * SSE接続を確立
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) {
      return;
    }

    try {
      // Step 1: SSEエンドポイントを取得
      console.log('Connecting to SSE endpoint...');
      const response = await axios.get(`${this.baseUrl}/sse`, {
        responseType: 'stream'
      });

      // レスポンスから最初のイベント（endpoint）を読み取る
      await new Promise((resolve, reject) => {
        let buffer = '';
        
        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // endpoint イベントを探す
          const match = buffer.match(/event: endpoint\ndata: (.+)/);
          if (match) {
            this.sseEndpoint = match[1].trim();
            console.log('SSE endpoint received:', this.sseEndpoint);
            
            // セッションIDを抽出
            const sessionMatch = this.sseEndpoint.match(/sessionId=([^&]+)/);
            if (sessionMatch) {
              this.sessionId = sessionMatch[1];
              console.log('Session ID:', this.sessionId);
            }
            
            response.data.destroy(); // 最初の接続を閉じる
            resolve();
          }
        });

        response.data.on('error', (error) => {
          console.error('Stream error:', error);
          reject(error);
        });
        
        setTimeout(() => {
          console.error('Timeout waiting for SSE endpoint. Buffer:', buffer);
          reject(new Error('Timeout waiting for SSE endpoint'));
        }, 5000);
      });

      // Step 2: セッションIDを使って再接続
      await this.reconnect();
      
    } catch (error) {
      console.error('Connect error details:', error);
      throw new Error(`Failed to connect to SSE: ${error.message}`);
    }
  }

  /**
   * セッションIDを使ってSSE接続を再確立（永続化）
   * @returns {Promise<void>}
   */
  async reconnect() {
    if (!this.sseEndpoint) {
      throw new Error('No SSE endpoint available');
    }

    console.log('Reconnecting to:', `${this.baseUrl}${this.sseEndpoint}`);

    const response = await axios.get(`${this.baseUrl}${this.sseEndpoint}`, {
      responseType: 'stream',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

    this.stream = response.data;
    this.connected = true;

    // イベントストリームを処理
    this.stream.on('data', (chunk) => {
      this.handleStreamData(chunk);
    });

    this.stream.on('error', (error) => {
      console.error('SSE stream error:', error);
      this.connected = false;
    });

    this.stream.on('end', () => {
      console.log('SSE stream ended');
      this.connected = false;
    });

    console.log('SSE connection established');
  }

  /**
   * ストリームデータを処理
   * @param {Buffer} chunk - データチャンク
   */
  handleStreamData(chunk) {
    this.messageBuffer += chunk.toString();

    // SSEメッセージを解析（event: xxx\ndata: {...}\n\n 形式）
    const messages = this.messageBuffer.split('\n\n');
    
    // 最後の不完全なメッセージを保持
    this.messageBuffer = messages.pop() || '';

    for (const message of messages) {
      if (!message.trim()) continue;

      const lines = message.split('\n');
      let eventType = 'message';
      let data = null;

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.substring(7).trim();
        } else if (line.startsWith('data: ')) {
          try {
            data = JSON.parse(line.substring(6));
          } catch (error) {
            console.error('Failed to parse SSE data:', line);
          }
        }
      }

      if (data) {
        this.handleMessage(eventType, data);
      }
    }
  }

  /**
   * SSEメッセージ文字列をパース
   * @param {string} sseData - SSE形式の文字列
   * @returns {Object|null} パース済みJSON
   */
  parseSSEMessage(sseData) {
    try {
      const lines = sseData.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          return JSON.parse(line.substring(6));
        }
      }
    } catch (error) {
      console.error('Failed to parse SSE message:', error.message);
    }
    return null;
  }

  /**
   * メッセージを処理
   * @param {string} eventType - イベントタイプ
   * @param {Object} data - JSONデータ
   */
  handleMessage(eventType, data) {
    console.log('Received message:', eventType, JSON.stringify(data, null, 2));

    // JSON-RPC 2.0レスポンス
    if (data.jsonrpc === '2.0' && data.id !== undefined) {
      const pending = this.pendingRequests.get(data.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(data.id);

        if (data.error) {
          pending.reject(new Error(data.error.message || JSON.stringify(data.error)));
        } else {
          pending.resolve(data.result);
        }
      }
    }
  }

  /**
   * JSON-RPCリクエストを送信
   * @param {string} method - メソッド名
   * @param {Object} params - パラメータ
   * @returns {Promise<any>} レスポンス
   */
  async sendRequest(method, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to SSE');
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    console.log('Sending request:', JSON.stringify(request, null, 2));

    // リクエストを送信（POST）
    return new Promise((resolve, reject) => {
      // タイムアウト設定
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      // HTTPリクエストで送信
      // 注意：レスポンスはPOST自体から返される（SSE形式の文字列として）
      axios.post(`${this.baseUrl}/mcp`, request, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'X-Session-ID': this.sessionId
        }
      }).then((response) => {
        console.log('POST response received');
        
        // レスポンスをパース（SSE形式の文字列またはJSON）
        if (typeof response.data === 'string' && response.data.includes('event:')) {
          // SSE形式
          const parsed = this.parseSSEMessage(response.data);
          if (parsed && parsed.jsonrpc === '2.0' && parsed.id === id) {
            clearTimeout(timeout);
            this.pendingRequests.delete(id);
            
            if (parsed.error) {
              reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
            } else {
              resolve(parsed.result);
            }
          }
        } else if (response.data && response.data.jsonrpc === '2.0') {
          // JSON形式
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          
          if (response.data.error) {
            reject(new Error(response.data.error.message || JSON.stringify(response.data.error)));
          } else {
            resolve(response.data.result);
          }
        }
      }).catch((error) => {
        console.error('POST error:', error.message);
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      });
    });
  }

  /**
   * 通知を送信（レスポンスなし）
   * @param {string} method - メソッド名
   * @param {Object} params - パラメータ
   * @returns {Promise<void>}
   */
  async sendNotification(method, params = {}) {
    if (!this.connected) {
      throw new Error('Not connected to SSE');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };

    console.log('Sending notification:', JSON.stringify(notification, null, 2));

    // 通知はレスポンスを期待しない
    await axios.post(`${this.baseUrl}/mcp`, notification, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'X-Session-ID': this.sessionId
      }
    });

    console.log('Notification sent');
  }

  /**
   * 接続を閉じる
   */
  close() {
    if (this.stream) {
      this.stream.destroy();
    }
    this.connected = false;
    
    // 保留中のリクエストをすべて拒否
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();
  }
}

module.exports = MCPSSEClient;
