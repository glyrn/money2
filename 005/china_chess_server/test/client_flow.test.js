const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const GAME_FILE = '005/china_chess_client/assets/Script/Game.js';
const PLAY_LOGIC_FILE = '005/china_chess_client/assets/Script/data/playLogic.js';

function sourceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

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

test('client check-end does not settle when AI search has no response move', () => {
  const source = fs.readFileSync(path.join(ROOT, PLAY_LOGIC_FILE), 'utf8');
  const redCheck = sourceBetween(source, 'playLogic.AICheckRedEnd = function', 'playLogic.AICheckBlackEnd = function');
  const blackCheck = sourceBetween(source, 'playLogic.AICheckBlackEnd = function', '//Ai自动走棋');

  assert.match(redCheck, /if\(!ret\)\{\s*console\.log[\s\S]*return\s+-1;\s*\}/);
  assert.match(blackCheck, /if\(!ret\)\{\s*console\.log[\s\S]*return\s+-1;\s*\}/);
  assert.doesNotMatch(redCheck, /return\s+isRed;/);
  assert.doesNotMatch(blackCheck, /return\s+isBlack;/);
});
