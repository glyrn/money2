const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const robot = require('../robot');

function readIndexSource() {
  return fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
}

function sourceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1);
  return source.slice(startIndex, endIndex);
}

function emptyBoard() {
  return Array.from({length: 225}, (_, tag) => ({tag, state: -1, idx: -1}));
}

function place(board, tag, state) {
  board[tag].state = state;
}

test('robot helpers parse counts and build local robot login data', () => {
  assert.equal(robot.normalizeRobotCount(undefined), 0);
  assert.equal(robot.normalizeRobotCount('2'), 2);
  assert.equal(robot.normalizeRobotCount(9), 3);
  assert.equal(robot.parseRobotCountFromLaunchUrl('/index.html?room=a&robot=1#hash'), 1);
  assert.equal(robot.getRandomDelayMs(() => 0.5), 2000);
  const uid = robot.makeRobotUid({deskId: 12}, 1);
  assert.equal(uid, 900000121);
  assert.deepEqual(robot.buildRobotLoginData({
    uid,
    state: 2,
    name: '机器人1',
    avatorUrl: '',
    score: 0,
    posId: 1,
  }), {
    uid,
    state: 2,
    name: '机器人1',
    avatorUrl: '',
    score: 0,
    posId: 1,
    isRobot: true,
  });
});

test('selectRobotMove returns an empty tag', () => {
  const board = emptyBoard();
  place(board, 112, 0);

  const move = robot.selectRobotMove(board, 1, () => 0);

  assert.notEqual(move, 112);
  assert.equal(board[move].state, -1);
});

test('selectRobotMove completes an immediate five', () => {
  const board = emptyBoard();
  [0, 1, 2, 3].forEach((tag) => place(board, tag, 0));

  assert.equal(robot.selectRobotMove(board, 1, () => 0.5), 4);
});

test('selectRobotMove blocks opponent immediate five', () => {
  const board = emptyBoard();
  [30, 45, 60, 75].forEach((tag) => place(board, tag, 1));

  assert.equal(robot.selectRobotMove(board, 1, () => 0.5), 90);
});

test('selectRobotMove blocks opponent open three before it becomes four', () => {
  const board = emptyBoard();
  [31, 32, 33].forEach((tag) => place(board, tag, 1));

  assert.equal(robot.selectRobotMove(board, 1, () => 0.5), 34);
});

test('selectRobotMove extends robot open three before quiet moves', () => {
  const board = emptyBoard();
  [31, 32, 33].forEach((tag) => place(board, tag, 0));

  assert.equal(robot.selectRobotMove(board, 1, () => 0.5), 34);
});

test('selectRobotMove chooses center-ish random empty cell without urgent lines', () => {
  const board = emptyBoard();

  assert.equal(robot.selectRobotMove(board, 1, () => 0), 112);
});

test('selectRobotMove returns null when board is full', () => {
  const board = emptyBoard().map((cell) => Object.assign({}, cell, {state: 0}));

  assert.equal(robot.selectRobotMove(board, 1, () => 0), null);
});

test('normal gameOver does not arm deprecate countdown', () => {
  const source = readIndexSource();
  const gameOverPath = sourceBetween(source, 'gameOver:function', 'hasUser:function');

  assert.equal(gameOverPath.includes('desk.deprecate_time = 30'), false);
  assert.match(gameOverPath, /desk\.deprecate_time = 0/);
});

test('disconnect and change-room cleanup only deprecate active games', () => {
  const source = readIndexSource();
  const disconnectPath = sourceBetween(source, 'checkDisconnect:function', '//切换房间');
  const changeRoomPath = sourceBetween(source, 'checkChangeRoom:function', 'clearRoomByUid:function');

  assert.match(disconnectPath, /var wasPlaying = desk\.state == 1;/);
  assert.match(disconnectPath, /if\s*\(wasPlaying\)\s*\{\s*this\.deprecateGame\(desk\);\s*\}/);
  assert.match(changeRoomPath, /var wasPlaying = roomObj\.state == 1;/);
  assert.match(changeRoomPath, /if\s*\(wasPlaying\)\s*\{\s*this\.deprecateGame\(roomObj\);\s*\}/);
});
