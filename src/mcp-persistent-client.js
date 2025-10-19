/**
 * MCP Persistent SSE Client
 * Playwright MCPサーバーとの永続的なSSE接続を管理
 * 
 * 接続フロー:
 * 1. GET /sse → セッションID取得
 * 2. GET /sse?sessionId=xxx → SSEストリーム確立（永続）
 * 3. POST /mcp + X-Session-ID → リクエスト送信
 * 4. SSEストリームでレスポンス受信
 */

const axios = require('axios');
const EventEmitter = require('events');

class MCPPersistentClient extends EventEmitter {
  constructor(baseUrl) {
    super();
    this.baseUrl = baseUrl.replace('/mcp', ''); // http://localhost:8931
    this.sessionId = null;
    this.sseStream = null;
    this.connected = false;
    this.initialized = false;
    this.messageBuffer = '';
    this.pendingRequests = new Map(); // requestId -> {resolve, reject, timeout}
    this.requestId = 0;
  }

  /**
   * 永続的なSSE接続を確立
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.connected) {
      console.log('Already connected, sessionId:', this.sessionId);
      return;
    }

    try {
      // Step 1: セッションIDを取得
      console.log('[1/3] Requesting session ID from /sse...');
      const initResponse = await axios.get(`${this.baseUrl}/sse`, {
        responseType: 'stream',
        timeout: 10000
      });

      // セッションIDを抽出
      await new Promise((resolve, reject) => {
        let buffer = '';
        const timeout = setTimeout(() => {
          initResponse.data.destroy();
          reject(new Error('Timeout waiting for session ID'));
        }, 5000);

        initResponse.data.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // event: endpoint を探す
          const match = buffer.match(/event: endpoint\ndata: \/sse\?sessionId=([a-f0-9-]+)/);
          if (match) {
            this.sessionId = match[1];
            console.log('[2/3] Session ID acquired:', this.sessionId);
            clearTimeout(timeout);
            initResponse.data.destroy();
            resolve();
          }
        });

        initResponse.data.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      // Step 2: セッションIDを使って永続SSEストリームを確立
      console.log('[3/3] Establishing persistent SSE stream...');
      const streamResponse = await axios.get(`${this.baseUrl}/sse`, {
        params: { sessionId: this.sessionId },
        responseType: 'stream',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

      this.sseStream = streamResponse.data;
      this.connected = true;

      // SSEストリームのイベントハンドリング
      this.sseStream.on('data', (chunk) => {
        this.handleStreamData(chunk);
      });

      this.sseStream.on('error', (error) => {
        console.error('SSE stream error:', error);
        this.handleDisconnect();
      });

      this.sseStream.on('end', () => {
        console.log('SSE stream ended');
        this.handleDisconnect();
      });

      console.log('✅ Persistent SSE connection established!');
      this.emit('connected');

    } catch (error) {
      console.error('Connection error:', error);
      throw new Error(`Failed to establish persistent SSE connection: ${error.message}`);
    }
  }

  /**
   * リクエストを送信（永続接続を利用）
   * @param {string} method - JSON-RPC method
   * @param {Object} params - リクエストパラメータ
   * @returns {Promise<Object>} レスポンス
   */
  async sendRequest(method, params = {}) {
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    const requestId = ++this.requestId;
    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    console.log(`→ [Request ${requestId}] ${method}`);

    // レスポンスを待つPromiseを作成
    const responsePromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${requestId} timeout`));
      }, 30000); // 30秒タイムアウト

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeout,
        method
      });
    });

    // リクエストを送信（POST /mcp）
    // 注意: レスポンスはこのPOSTではなく、永続的なSSEストリームから返される
    try {
      await axios.post(`${this.baseUrl}/mcp`, request, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream', // SSEレスポンスを期待
          'X-Session-ID': this.sessionId
        },
        timeout: 5000,
        validateStatus: (status) => status < 500 // 4xxエラーも許容
      });
    } catch (error) {
      const pending = this.pendingRequests.get(requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(requestId);
      }
      throw new Error(`Failed to send request: ${error.message}`);
    }

    // SSEストリームからのレスポンスを待つ
    return responsePromise;
  }

  /**
   * 通知を送信（レスポンス不要）
   * @param {string} method - JSON-RPC method
   * @param {Object} params - パラメータ
   */
  async sendNotification(method, params = {}) {
    if (!this.connected || !this.sessionId) {
      throw new Error('Not connected. Call connect() first.');
    }

    const notification = {
      jsonrpc: '2.0',
      method,
      params
    };

    console.log(`→ [Notification] ${method}`);

    await axios.post(`${this.baseUrl}/mcp`, notification, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'X-Session-ID': this.sessionId
      },
      timeout: 5000,
      validateStatus: (status) => status < 500
    });
  }

  /**
   * SSEストリームデータを処理
   * @param {Buffer} chunk - データチャンク
   */
  handleStreamData(chunk) {
    const data = chunk.toString();
    console.log('[SSE Stream]', data.substring(0, 200).replace(/\n/g, '\\n'));
    
    this.messageBuffer += data;

    // SSEメッセージを解析（改行2つで区切り）
    const messages = this.messageBuffer.split('\n\n');
    
    // 最後のメッセージは不完全な可能性があるので保持
    this.messageBuffer = messages.pop() || '';

    for (const message of messages) {
      if (!message.trim()) continue;

      try {
        const parsed = this.parseSSEMessage(message);
        if (parsed) {
          this.handleMessage(parsed);
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    }
  }

  /**
   * SSEメッセージをパース
   * @param {string} message - SSEメッセージ
   * @returns {Object|null} パースされたメッセージ
   */
  parseSSEMessage(message) {
    const lines = message.split('\n');
    let event = null;
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        event = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.substring(6).trim();
      }
    }

    if (!data) return null;

    // JSONパース
    try {
      const parsed = JSON.parse(data);
      return { event, data: parsed };
    } catch (error) {
      console.warn('Failed to parse data as JSON:', data);
      return { event, data };
    }
  }

  /**
   * メッセージを処理
   * @param {Object} message - パースされたメッセージ
   */
  handleMessage(message) {
    const { event, data } = message;

    // イベントタイプによる処理
    if (event === 'message') {
      // JSON-RPCレスポンス
      if (data.id !== undefined) {
        const requestId = data.id;
        const pending = this.pendingRequests.get(requestId);

        if (pending) {
          console.log(`← [Response ${requestId}] ${pending.method}`);
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(requestId);

          if (data.error) {
            pending.reject(new Error(data.error.message || JSON.stringify(data.error)));
          } else {
            pending.resolve(data.result || data);
          }
        }
      }
      // JSON-RPC通知
      else if (data.method) {
        console.log(`← [Notification] ${data.method}`);
        this.emit('notification', data);
      }
    } else if (event === 'endpoint') {
      // endpointイベント（通常は接続時のみ）
      console.log('Endpoint event:', data);
    } else {
      console.log(`← [Event ${event}]`, data);
      this.emit('event', { event, data });
    }
  }

  /**
   * 切断処理
   */
  handleDisconnect() {
    this.connected = false;
    this.initialized = false;

    // 保留中のリクエストをすべて拒否
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    this.emit('disconnected');
  }

  /**
   * MCP初期化ハンドシェイク
   * @param {Object} clientInfo - クライアント情報
   * @returns {Promise<Object>} サーバー情報
   */
  async initialize(clientInfo = { name: 'Othello', version: '2.0.0' }) {
    if (this.initialized) {
      console.log('Already initialized');
      return;
    }

    console.log('Initializing MCP session...');
    
    const result = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo
    });

    this.initialized = true;
    console.log('✅ MCP initialized:', result);

    // initialized通知を送信
    await this.sendNotification('notifications/initialized');

    return result;
  }

  /**
   * 接続を閉じる
   */
  async close() {
    console.log('Closing connection...');
    
    if (this.sseStream) {
      this.sseStream.destroy();
      this.sseStream = null;
    }

    this.handleDisconnect();
  }

  /**
   * 接続状態を確認
   * @returns {boolean} 接続中かどうか
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 初期化状態を確認
   * @returns {boolean} 初期化済みかどうか
   */
  isInitialized() {
    return this.initialized;
  }
}

module.exports = MCPPersistentClient;
