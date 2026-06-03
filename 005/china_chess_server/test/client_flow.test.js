const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const GAME_FILE = '005/china_chess_client/assets/Script/Game.js';
const PLAY_LOGIC_FILE = '005/china_chess_client/assets/Script/data/playLogic.js';
const SOCKET_MGR_FILE = '005/china_chess_client/assets/Script/data/socketMgr.js';
const READY_TIMER_FILE = '005/china_chess_client/assets/Script/data/ready_timer.js';
const CONTINUE_TIMER_FILE = '005/china_chess_client/assets/Script/data/continue_timer.js';

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

test('client consumes authoritative server game over without echoing settlement', () => {
  const socketSource = fs.readFileSync(path.join(ROOT, SOCKET_MGR_FILE), 'utf8');
  const gameSource = fs.readFileSync(path.join(ROOT, GAME_FILE), 'utf8');
  const serverGameOver = sourceBetween(socketSource, '_socket.on("GAME_OVER"', '_socket.on("RETRACK_CHESS_REQ"');
  const gameOver = sourceBetween(gameSource, 'gameOver:function(data){', 'renderScorePanel(){');

  assert.match(serverGameOver, /_gameMgr\.is_quit\s*=\s*_gameMgr\.play_index\s*>=\s*_gameMgr\.play_count/);
  assert.match(serverGameOver, /_eventMgr\.fire\("GAME_OVER",\s*data\)/);
  assert.match(gameOver, /if\(globalData\.gameMgr\.roomState\.state\s*==\s*2\)\{\s*return;\s*\}/);
  assert.match(gameOver, /if\(!data\.from_server\)\{\s*globalData\.socketMgr\.reqGameOver\(data\);\s*\}/);
});

test('client post-round countdown timers use ten seconds', () => {
  const readyTimer = fs.readFileSync(path.join(ROOT, READY_TIMER_FILE), 'utf8');
  const continueTimer = fs.readFileSync(path.join(ROOT, CONTINUE_TIMER_FILE), 'utf8');

  assert.match(readyTimer, /server_time\s*\+\s*10\s*-\s*now/);
  assert.match(continueTimer, /this\._target_time\s*=\s*now\s*\+\s*10/);
  assert.equal(readyTimer.includes('+ 5 - now'), false);
  assert.equal(continueTimer.includes('now + 5'), false);
});
