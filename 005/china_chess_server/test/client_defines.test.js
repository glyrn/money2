const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFINES_FILE = '005/china_chess_client/assets/Script/data/defines.js';
const SOCKET_MGR_FILE = '005/china_chess_client/assets/Script/data/socketMgr.js';
const SERVER_FILE = '005/china_chess_server/index.js';
const GAME_PORT = 9005;

function loadDefines(href, host, port) {
  const sandbox = {
    cc: {},
    console: {log() {}},
    window: {
      location: {href, host, port: String(port || '')},
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, DEFINES_FILE), 'utf8'), sandbox, {
    filename: DEFINES_FILE,
  });
  return sandbox.window.defines;
}

test('china chess direct game port enables force login mode', () => {
  const host = `121.40.149.243:${GAME_PORT}`;
  const defines = loadDefines(`http://${host}/?uid=1&room=qa`, host, GAME_PORT);

  assert.equal(defines.serverUrl, host);
  assert.equal(defines.isForce, true);
});

test('china chess local debug keeps custom socket path', () => {
  const source = fs.readFileSync(path.join(ROOT, SERVER_FILE), 'utf8');
  const localDebugBlock = source.slice(
    source.indexOf('if(getCurrentIP().indexOf("192.168") != -1)'),
    source.indexOf('const gameCfg'),
  );

  assert.match(source, /var ioParam = \{path:'\/zgxq_socket\.io'\};/);
  assert.equal(localDebugBlock.includes('ioParam = null'), false);
});

test('china chess client forwards robot profile list during login', () => {
  const source = fs.readFileSync(path.join(ROOT, SOCKET_MGR_FILE), 'utf8');

  assert.match(source, /robot\s*:\s*cc\.args\['robot'\]/);
  assert.match(source, /robots\s*:\s*cc\.args\['robots'\]/);
});
