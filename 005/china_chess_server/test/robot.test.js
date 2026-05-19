const test = require('node:test');
const assert = require('node:assert/strict');

const robot = require('../robot');

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

test('createInitialBoard places both sides in client-compatible coordinates', () => {
  const board = robot.createInitialBoard();

  assert.equal(board[0][0], 'C0');
  assert.equal(board[9][0], 'c0');
  assert.equal(robot.getPieceSide('c0'), 0);
  assert.equal(robot.getPieceSide('C0'), 1);
});

test('isLegalMove validates rook paths and same-side captures', () => {
  const board = robot.createInitialBoard();

  assert.equal(robot.isLegalMove(board, 0, {x: 0, y: 9}, {x: 0, y: 8}), true);
  assert.equal(robot.isLegalMove(board, 0, {x: 0, y: 9}, {x: 0, y: 6}), false);
  assert.equal(robot.isLegalMove(board, 0, {x: 0, y: 9}, {x: 1, y: 9}), false);
});

test('isLegalMove validates horse legs', () => {
  const board = robot.createInitialBoard();

  assert.equal(robot.isLegalMove(board, 0, {x: 1, y: 9}, {x: 2, y: 7}), true);
  assert.equal(robot.isLegalMove(board, 0, {x: 1, y: 9}, {x: 3, y: 8}), false);
});

test('applyMove moves pieces and reports captures', () => {
  const board = robot.createInitialBoard();
  board[8][0] = 'Z9';

  const result = robot.applyMove(board, {x: 0, y: 9}, {x: 0, y: 8});

  assert.deepEqual(result, {piece: 'c0', captured: 'Z9'});
  assert.equal(board[9][0], null);
  assert.equal(board[8][0], 'c0');
});

test('selectRobotMove prefers legal captures', () => {
  const board = robot.createInitialBoard();
  board[8][0] = 'Z9';

  const move = robot.selectRobotMove(board, 0, () => 0);

  assert.equal(robot.isLegalMove(board, 0, move.from, move.to), true);
  assert.notEqual(board[move.to.y][move.to.x], null);
});
