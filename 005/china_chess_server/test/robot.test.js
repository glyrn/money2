const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const robot = require('../robot');

function readIndexSource() {
  return fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
}

function getIndexSection(startMarker, endMarker) {
  const source = readIndexSource();
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

function assertCleanupOnlyDeprecatesActiveGame(section) {
  const captureIndex = section.indexOf('var shouldDeprecateGame = this.isActiveGame(desk);');
  assert.notEqual(captureIndex, -1);
  const resetIndex = section.indexOf('this.resetUser(userObj);');
  assert.notEqual(resetIndex, -1);
  assert.ok(captureIndex < resetIndex);

  const calls = section.match(/this\.deprecateGame\(desk\);/g) || [];
  assert.equal(calls.length, 1);
  assert.match(
    section.slice(resetIndex),
    /if\(shouldDeprecateGame\)\{\s*this\.deprecateGame\(desk\);\s*\}/
  );
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

test('selectRobotMove avoids opening cannon captures from the initial setup', () => {
  const board = robot.createInitialBoard();

  [0, 0.5, 0.99].forEach((randomValue) => {
    const move = robot.selectRobotMove(board, 0, () => randomValue);
    const piece = board[move.from.y][move.from.x];

    assert.equal(robot.isLegalMove(board, 0, move.from, move.to), true);
    assert.notEqual(piece[0].toLowerCase(), 'p');
  });
});

test('REQ_GAME_OVER disables deprecate countdown after settlement', () => {
  const source = readIndexSource();
  const reqGameOverPath = source.slice(source.indexOf("socket.on('REQ_GAME_OVER'"), source.indexOf('http.listen'));

  assert.match(reqGameOverPath, /room\.state\s*=\s*0;/);
  assert.equal(reqGameOverPath.includes('room.deprecate_time = 30;'), false);
  assert.match(reqGameOverPath, /room\.deprecate_time\s*=\s*0;/);
});

test('disconnect and change-room cleanup deprecate only active games', () => {
  const activeGamePath = getIndexSection('isActiveGame:function', 'countRobotUsers:function');
  assert.match(activeGamePath, /return\s+desk\s+&&\s+desk\.state\s*==\s*1;/);

  assertCleanupOnlyDeprecatesActiveGame(getIndexSection('checkDisconnect:function', '//切换房间'));
  assertCleanupOnlyDeprecatesActiveGame(getIndexSection('checkChangeRoom:function', 'clearRoomByUid:function'));
});
