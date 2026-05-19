const test = require('node:test');
const assert = require('node:assert/strict');

const robot = require('../robot');

function emptyBoard() {
  return Array.from({length: 225}, (_, tag) => ({tag, state: -1, idx: -1}));
}

function place(board, tag, state) {
  board[tag].state = state;
}

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

test('selectRobotMove chooses center-ish random empty cell without urgent lines', () => {
  const board = emptyBoard();

  assert.equal(robot.selectRobotMove(board, 1, () => 0), 112);
});

test('selectRobotMove returns null when board is full', () => {
  const board = emptyBoard().map((cell) => Object.assign({}, cell, {state: 0}));

  assert.equal(robot.selectRobotMove(board, 1, () => 0), null);
});
