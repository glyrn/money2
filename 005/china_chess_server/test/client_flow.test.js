const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const GAME_FILE = '005/china_chess_client/assets/Script/Game.js';

test('client clears stale local selection before applying opponent chess events', () => {
  const source = fs.readFileSync(path.join(ROOT, GAME_FILE), 'utf8');
  const handlerStart = source.indexOf("globalData.eventlister.on('PLAY_CHESS_SUCCESS'");
  assert.notEqual(handlerStart, -1);
  const handlerEnd = source.indexOf("globalData.eventlister.on('CHECK_END'", handlerStart);
  assert.notEqual(handlerEnd, -1);
  const handler = source.slice(handlerStart, handlerEnd);

  assert.match(handler, /data\.posId\s*!==\s*globalData\.gameMgr\.playerData\.self\.posId/);
  assert.match(handler, /playLogic\.clearSelection\(\)/);
});
