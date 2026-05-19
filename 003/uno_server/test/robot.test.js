const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const robot = require('../robot');

test('selectRobotCard matches top card color before value', () => {
  const hand = [
    {type: 1, value: 5, color: 2},
    {type: 1, value: 8, color: 1},
  ];
  const outCards = [{type: 1, value: 3, color: 2}];

  assert.deepEqual(robot.selectRobotCard(hand, outCards), {type: 1, value: 5, color: 2});
});

test('selectRobotCard can match top card value', () => {
  const hand = [
    {type: 1, value: 9, color: 1},
    {type: 2, value: 'stop', color: 3},
  ];
  const outCards = [{type: 1, value: 9, color: 4}];

  assert.deepEqual(robot.selectRobotCard(hand, outCards), {type: 1, value: 9, color: 1});
});

test('selectRobotCard stacks plus cards when required', () => {
  const hand = [
    {type: 1, value: 3, color: 2},
    {type: 2, value: 'plus2', color: 4},
  ];
  const outCards = [{type: 2, value: 'plus2', color: 1}];

  assert.deepEqual(robot.selectRobotCard(hand, outCards), {type: 2, value: 'plus2', color: 4});
});

test('selectRobotCard assigns a color to wild cards', () => {
  const hand = [
    {type: 1, value: 3, color: 2},
    {type: 1, value: 4, color: 2},
    {type: 2, value: 'color', color: 0},
  ];
  const outCards = [{type: 1, value: 9, color: 4}];

  assert.deepEqual(robot.selectRobotCard(hand, outCards), {type: 2, value: 'color', color: 2});
});

test('selectRobotCard returns null when no card is playable', () => {
  const hand = [{type: 1, value: 3, color: 2}];
  const outCards = [{type: 2, value: 'stop', color: 1}];

  assert.equal(robot.selectRobotCard(hand, outCards), null);
});

test('canActOnTurn rejects actions from non-current players', () => {
  assert.equal(robot.canActOnTurn({state: 1, cur_posId: 2}, 2), true);
  assert.equal(robot.canActOnTurn({state: 1, cur_posId: 2}, 1), false);
  assert.equal(robot.canActOnTurn({state: 0, cur_posId: 2}, 2), false);
});

test('timeout game-over path uses instance methods instead of undefined self', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const timeoutPath = source.slice(source.indexOf('checkTimeGameOver:function'), source.indexOf('broadCastRoom:function'));
  assert.equal(timeoutPath.includes('self.broadCastRoom("GAME_OVER",desk.deskId'), false);
});

test('timeout game-over path does not reference undefined settlement variables', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const timeoutPath = source.slice(source.indexOf('checkTimeGameOver:function'), source.indexOf('broadCastRoom:function'));
  assert.equal(timeoutPath.includes('is_quit:is_over_specific_score'), false);
  assert.equal(timeoutPath.includes('score_list:desk.score_list'), false);
});
