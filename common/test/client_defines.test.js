const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

const CLIENT_DEFINES = [
  ['gobang', 9001, '001/gobang_client/assets/Script/data/defines.js'],
  ['doudizhu', 9002, '002/doudizhu_client/assets/scripts/defines.js'],
  ['uno', 9003, '003/uno_client/assets/scripts/defines.js'],
  ['china_chess', 9005, '005/china_chess_client/assets/Script/data/defines.js'],
  ['flychess', 9006, '006/flychess_client/assets/Script/data/defines.js'],
];

function loadDefines(file, href, host, port) {
  const sandbox = {
    cc: {},
    console: {log() {}},
    window: {
      location: {href, host, port: String(port || '')},
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), sandbox, {
    filename: file,
  });
  return sandbox.window.defines;
}

for (const [name, port, file] of CLIENT_DEFINES) {
  test(`${name} direct game port enables force login mode`, () => {
    const host = `121.40.149.243:${port}`;
    const defines = loadDefines(file, `http://${host}/?uid=1&room=qa`, host, port);

    assert.equal(defines.serverUrl, host);
    assert.equal(defines.isForce, true);
  });
}

test('signed production domain still uses platform auth mode', () => {
  const defines = loadDefines(
    '001/gobang_client/assets/Script/data/defines.js',
    'https://game.example.com/?sign=abc&room=qa',
    'game.example.com',
    '',
  );

  assert.equal(defines.serverUrl, 'game.example.com');
  assert.notEqual(defines.isForce, true);
});
