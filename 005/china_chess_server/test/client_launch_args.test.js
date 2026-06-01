const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const LAUNCH_ARGS_FILE = '005/china_chess_client/assets/Script/data/launchArgs.js';
const SOCKET_MGR_FILE = '005/china_chess_client/assets/Script/data/socketMgr.js';

function loadLaunchArgs() {
  const source = fs
    .readFileSync(path.join(ROOT, LAUNCH_ARGS_FILE), 'utf8')
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

test('china chess launch args parse normal and hash query strings', () => {
  const launchArgs = loadLaunchArgs();

  assert.deepEqual(
    plain(launchArgs.parse('https://game.test/zgxq?uid=50001&name=%E6%B5%8B%E8%AF%95+1&room=qa&sign=a%3Db#ready')),
    {
      uid: '50001',
      name: '测试 1',
      room: 'qa',
      sign: 'a=b',
    },
  );
  assert.deepEqual(
    plain(launchArgs.parse('https://game.test/zgxq#/play?uid=50002&room=qa_hash&play_count=1')),
    {
      uid: '50002',
      room: 'qa_hash',
      play_count: '1',
    },
  );
});

test('china chess launch args can build a direct-play debug fallback', () => {
  const launchArgs = loadLaunchArgs();
  const args = launchArgs.createDebugFallbackArgs(12345);

  assert.equal(args.uid, 'guest_12345');
  assert.equal(args.name, '游客');
  assert.equal(args.room, 'guest_12345');
  assert.equal(args.play_mode, '0');
  assert.equal(args.play_count, '1');
  assert.equal(args.auto_ready, '1');
  assert.equal(launchArgs.hasRequiredLoginArgs(args), true);
  assert.equal(launchArgs.hasRequiredLoginArgs({ uid: 'u1' }), false);
});

test('china chess client forwards auto_ready during login', () => {
  const source = fs.readFileSync(path.join(ROOT, SOCKET_MGR_FILE), 'utf8');

  assert.match(source, /auto_ready\s*:\s*cc\.args\['auto_ready'\]/);
});
