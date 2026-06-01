const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFINES_FILE = '001/gobang_client/assets/Script/data/defines.js';
const LAUNCH_ARGS_FILE = '001/gobang_client/assets/Script/data/launchArgs.js';
const SOCKET_MGR_FILE = '001/gobang_client/assets/Script/data/socketMgr.js';
const SERVER_FILE = '001/gobang_server/index.js';
const GAME_PORT = 9001;

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

function loadLaunchArgs() {
  const fullPath = path.join(ROOT, LAUNCH_ARGS_FILE);
  assert.equal(fs.existsSync(fullPath), true, `${LAUNCH_ARGS_FILE} should exist`);
  const source = fs
    .readFileSync(fullPath, 'utf8')
    .replace(/export\s+default\s+launchArgs\s*;?/, 'module.exports = launchArgs;');
  const sandbox = {
    module: { exports: {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: LAUNCH_ARGS_FILE });
  return sandbox.module.exports;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test('gobang direct game port enables force login mode', () => {
  const host = `121.40.149.243:${GAME_PORT}`;
  const defines = loadDefines(`http://${host}/?uid=1&room=qa`, host, GAME_PORT);

  assert.equal(defines.serverUrl, host);
  assert.equal(defines.isForce, true);
});

test('gobang signed production domain still uses platform auth mode', () => {
  const defines = loadDefines(
    'https://game.example.com/?sign=abc&room=qa',
    'game.example.com',
    '',
  );

  assert.equal(defines.serverUrl, 'game.example.com');
  assert.notEqual(defines.isForce, true);
});

test('gobang local debug keeps custom socket path', () => {
  const source = fs.readFileSync(path.join(ROOT, SERVER_FILE), 'utf8');
  const localDebugBlock = source.slice(
    source.indexOf('if(getCurrentIP().indexOf("192.168") != -1)'),
    source.indexOf('const gameCfg'),
  );

  assert.match(source, /var ioParam = \{path:'\/wzq_socket\.io'\};/);
  assert.equal(localDebugBlock.includes('ioParam = null'), false);
});

test('gobang client forwards robot profile list during login', () => {
  const source = fs.readFileSync(path.join(ROOT, SOCKET_MGR_FILE), 'utf8');

  assert.match(source, /robot\s*:\s*cc\.args\['robot'\]/);
  assert.match(source, /robots\s*:\s*cc\.args\['robots'\]/);
  assert.match(source, /auto_ready\s*:\s*cc\.args\['auto_ready'\]/);
});

test('gobang launch args parse query variants and provide direct-play fallback', () => {
  const launchArgs = loadLaunchArgs();

  assert.deepEqual(
    plain(launchArgs.parse('https://game.test/wzq?uid=10001&name=%E6%B5%8B%E8%AF%95+1&room=qa&sign=a%3Db#ready')),
    {
      uid: '10001',
      name: '测试 1',
      room: 'qa',
      sign: 'a=b',
    },
  );
  assert.deepEqual(
    plain(launchArgs.parse('https://game.test/wzq#/play?uid=10002&room=qa_hash&play_count=1')),
    {
      uid: '10002',
      room: 'qa_hash',
      play_count: '1',
    },
  );

  const args = launchArgs.createDebugFallbackArgs(12345);
  assert.equal(args.uid, 'guest_12345');
  assert.equal(args.room, 'guest_12345');
  assert.equal(args.play_mode, '1');
  assert.equal(args.play_count, '1');
  assert.equal(args.robot, '1');
  assert.equal(args.auto_ready, '1');
  assert.equal(launchArgs.hasRequiredLoginArgs(args), true);
  assert.equal(launchArgs.hasRequiredLoginArgs({ uid: 'u1' }), false);
});
