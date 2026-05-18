const test = require('node:test');
const assert = require('node:assert/strict');

const Game = require('../game');
const robot = require('../robot');

function setCards(game, posId, cards) {
  game.contextCards = game.contextCards.filter((item) => item.id !== posId);
  game.contextCards.push({id: posId, cards});
}

test('selectCallScore bids within available score options', () => {
  assert.equal(robot.selectCallScore([1, 2, 3], [{value: 16}, {value: 17}]), 3);
  assert.equal(robot.selectCallScore([1, 2], [{value: 3}, {value: 4}]), 1);
  assert.equal(robot.selectCallScore([], [{value: 16}]), 0);
});

test('selectPlayCards starts with the lowest legal single', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 0;
  game.lastCardInfo = {posId: 0, len: 0, key: '', type: ''};
  setCards(game, 0, [{value: 9, type: 0}, {value: 3, type: 1}]);

  assert.deepEqual(robot.selectPlayCards(game, 0, 0), [{value: 3, type: 1}]);
});

test('selectPlayCards beats the previous single through Game.validate', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 1, key: 8, type: 'A', is_normal: true};
  setCards(game, 1, [{value: 7, type: 0}, {value: 9, type: 1}, {value: 10, type: 2}]);

  assert.deepEqual(robot.selectPlayCards(game, 1, 0), [{value: 9, type: 1}]);
});

test('selectPlayCards returns empty pass when no legal response exists', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 2, key: 14, type: 'AA', is_normal: true};
  setCards(game, 1, [{value: 3, type: 0}, {value: 4, type: 1}]);

  assert.deepEqual(robot.selectPlayCards(game, 1, 0), []);
});

test('canPlayCards rejects out-of-turn play and leading pass', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 1, len: 0, key: '', type: '', is_normal: true};
  setCards(game, 0, [{value: 9, type: 1}]);
  setCards(game, 1, [{value: 3, type: 1}]);

  assert.deepEqual(game.canPlayCards(0, [{value: 9, type: 1}], 0), {status: false, reason: 'not_turn'});
  assert.deepEqual(game.canPlayCards(1, [], 0), {status: false, reason: 'cannot_pass'});
});

test('canPlayCards allows pass only when responding to another player', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 1, key: 8, type: 'A', is_normal: true};
  setCards(game, 1, [{value: 3, type: 1}]);

  assert.deepEqual(game.canPlayCards(1, [], 0), {status: true, isPass: true});
});

test('canCallScore rejects out-of-turn and unavailable bids', () => {
  const game = new Game();
  game.init();
  game.status = 1;
  game.contextPosId = 2;
  game.contextScore = [2, 3];

  assert.deepEqual(game.canCallScore(1, 2), {status: false, reason: 'not_turn'});
  assert.deepEqual(game.canCallScore(2, 1), {status: false, reason: 'invalid_score'});
  assert.deepEqual(game.canCallScore(2, 3), {status: true, score: 3});
  assert.deepEqual(game.canCallScore(2, 0), {status: true, score: 0});
});
