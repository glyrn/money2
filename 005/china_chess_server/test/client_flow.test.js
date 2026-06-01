const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const GAME_FILE = '005/china_chess_client/assets/Script/Game.js';

test('client preserves opponent selection while replaying a completed chess move', () => {
  const source = fs.readFileSync(path.join(ROOT, GAME_FILE), 'utf8');
  const handlerStart = source.indexOf("globalData.eventlister.on('PLAY_CHESS_SUCCESS'");
  assert.notEqual(handlerStart, -1);
  const handlerEnd = source.indexOf("globalData.eventlister.on('CHECK_END'", handlerStart);
  assert.notEqual(handlerEnd, -1);
  const handler = source.slice(handlerStart, handlerEnd);

  assert.match(handler, /data\.posId\s*!==\s*globalData\.gameMgr\.playerData\.self\.posId/);
  assert.match(handler, /data\.time_out\s*===\s*undefined/);
  assert.match(handler, /playLogic\.clearSelection\(\)/);
});

test('client maps red pieces to posId 0 and black pieces to posId 1', () => {
  const source = fs.readFileSync(path.join(ROOT, GAME_FILE), 'utf8');
  const redOwnerPattern = /chessLogic\.mans\[key\]\.my\s*===\s*1\s*&&\s*globalData\.gameMgr\.playerData\.self\.posId\s*==\s*0/;
  const blackOwnerPattern = /chessLogic\.mans\[key\]\.my\s*===\s*-1\s*&&\s*globalData\.gameMgr\.playerData\.self\.posId\s*==\s*1/;

  assert.match(source, redOwnerPattern);
  assert.match(source, blackOwnerPattern);
});
