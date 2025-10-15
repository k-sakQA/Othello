const fs = require('fs');

async function writeJsonLog(filePath, obj) {
  return fs.promises.writeFile(filePath, JSON.stringify(obj, null, 2), 'utf8');
}

module.exports = { writeJsonLog };
