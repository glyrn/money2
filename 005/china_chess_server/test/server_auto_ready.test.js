const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SERVER_FILE = '005/china_chess_server/index.js';

test('server starts a two-player auto-ready room after the second login', () => {
  const source = fs.readFileSync(path.join(ROOT, SERVER_FILE), 'utf8');
  const autoReadyStart = source.indexOf('self.shouldAutoPrepareUser(obj)');
  assert.notEqual(autoReadyStart, -1);
  const autoReadyEnd = source.indexOf('}else{', autoReadyStart);
  assert.notEqual(autoReadyEnd, -1);
  const autoReadyBlock = source.slice(autoReadyStart, autoReadyEnd);

  assert.match(autoReadyBlock, /self\.tryStartGame\(room\)/);
});

test('server does not deprecate a two-player room while only one player is seated', () => {
  const source = fs.readFileSync(path.join(ROOT, SERVER_FILE), 'utf8');
  const gameScheduleStart = source.indexOf('gameSchedule:function');
  assert.notEqual(gameScheduleStart, -1);
  const gameScheduleEnd = source.indexOf('checkDisconnect:function', gameScheduleStart);
  assert.notEqual(gameScheduleEnd, -1);
  const gameScheduleBlock = source.slice(gameScheduleStart, gameScheduleEnd);

  assert.match(gameScheduleBlock, /countSeatedUsers\(desk\)\s*<\s*2/);
  assert.match(gameScheduleBlock, /continue;/);
});
