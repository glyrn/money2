const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Game = require('../game');
const robot = require('../robot');

function setCards(game, posId, cards) {
  game.contextCards = game.contextCards.filter((item) => item.id !== posId);
  game.contextCards.push({id: posId, cards});
}

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

function robotProfilesLaunchUrl() {
  const text = "[{id: 9876425344, name: 呆呆嘿😘, avatar: https://cdn.test/avatar_1405.jpg}, {id: 9964265128, name: 你悲的蜂, avatar: https://cdn.test/avatar_49.jpg}]";
  return 'https://game.test/ddz?robot=2&robots=' + encodeURIComponent(text);
}

test('robot helpers parse counts and build local robot login data', () => {
  assert.equal(robot.normalizeRobotCount(undefined), 0);
  assert.equal(robot.normalizeRobotCount('2'), 2);
  assert.equal(robot.normalizeRobotCount(9), 3);
  assert.equal(robot.parseRobotCountFromLaunchUrl('/index.html?room=a&robot=2#hash'), 2);
  assert.equal(robot.getRandomDelayMs(() => 0.5), 2000);
  const uid = robot.makeRobotUid({deskId: 12}, 2);
  assert.equal(uid, 900000122);
  assert.deepEqual(robot.buildRobotLoginData({
    uid,
    state: 2,
    name: '机器人1',
    avatorUrl: '',
    score: 0,
    posId: 2,
  }), {
    uid,
    state: 2,
    name: '机器人1',
    avatorUrl: '',
    score: 0,
    posId: 2,
    isRobot: true,
  });
});

test('robot helpers parse robot identity profiles from launch urls', () => {
  const profiles = robot.getSupplementalRobotProfiles({lanuch_url: robotProfilesLaunchUrl()});

  assert.deepEqual(profiles, [
    {
      uid: '9876425344',
      name: '呆呆嘿😘',
      avatorUrl: 'https://cdn.test/avatar_1405.jpg',
      score: 0,
    },
    {
      uid: '9964265128',
      name: '你悲的蜂',
      avatorUrl: 'https://cdn.test/avatar_49.jpg',
      score: 0,
    },
  ]);
  assert.equal(robot.getSupplementalRobotCount({robot: 2, lanuch_url: robotProfilesLaunchUrl()}), 2);
});

test('selectCallScore bids within available score options', () => {
  assert.equal(robot.selectCallScore([1, 2, 3], [{value: 16}, {value: 17}]), 3);
  assert.equal(robot.selectCallScore([1, 2], [{value: 3}, {value: 4}]), 1);
  assert.equal(robot.selectCallScore([], [{value: 16}]), 0);
});

test('selectPlayCards starts with system-style straight recommendation when possible', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 0;
  game.lastCardInfo = {posId: 0, len: 0, key: '', type: ''};
  setCards(game, 0, [
    {value: 9, type: 0},
    {value: 7, type: 0},
    {value: 6, type: 0},
    {value: 5, type: 0},
    {value: 4, type: 0},
    {value: 3, type: 1},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 0, 0), [
    {value: 3, type: 1},
    {value: 4, type: 0},
    {value: 5, type: 0},
    {value: 6, type: 0},
    {value: 7, type: 0},
  ]);
});

test('selectPlayCards starts with triple-with-pair before a quiet single', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 0;
  game.lastCardInfo = {posId: 0, len: 0, key: '', type: ''};
  setCards(game, 0, [
    {value: 9, type: 0},
    {value: 9, type: 1},
    {value: 9, type: 2},
    {value: 4, type: 0},
    {value: 4, type: 1},
    {value: 3, type: 1},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 0, 0), [
    {value: 9, type: 0},
    {value: 9, type: 1},
    {value: 9, type: 2},
    {value: 4, type: 0},
    {value: 4, type: 1},
  ]);
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

test('selectPlayCards keeps triples intact when answering a single', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 1, key: 8, type: 'A', is_normal: true};
  setCards(game, 1, [
    {value: 9, type: 0},
    {value: 9, type: 1},
    {value: 9, type: 2},
    {value: 10, type: 0},
    {value: 4, type: 0},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 1, 0), [{value: 10, type: 0}]);
});

test('selectPlayCards passes instead of splitting the only triple for a single', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 1, key: 8, type: 'A', is_normal: true};
  setCards(game, 1, [
    {value: 9, type: 0},
    {value: 9, type: 1},
    {value: 9, type: 2},
    {value: 4, type: 0},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 1, 0), []);
});

test('selectPlayCards passes instead of casually beating a teammate high single', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 2;
  game.userScore = {0: 3, 1: 0, 2: 0};
  game.lastCardInfo = {posId: 1, len: 1, key: 14, type: 'A', is_normal: true};
  setCards(game, 2, [{value: 15, type: 0}, {value: 6, type: 1}]);

  assert.deepEqual(robot.selectPlayCards(game, 2, 0), []);
});

test('selectPlayCards avoids leading a single laizi while the hand is still large', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 0;
  game.contextLaiziCards = [{value: 3, type: 1}];
  game.lastCardInfo = {posId: 0, len: 0, key: '', type: ''};
  setCards(game, 0, [
    {value: 3, type: 1},
    {value: 4, type: 0},
    {value: 6, type: 0},
    {value: 8, type: 0},
    {value: 10, type: 0},
    {value: 12, type: 0},
    {value: 14, type: 0},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 0, 1), [{value: 4, type: 0}]);
});

test('selectPlayCards follows system-style straight response', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 5, key: 7, type: 'ABCDE', is_normal: true};
  setCards(game, 1, [
    {value: 12, type: 0},
    {value: 11, type: 1},
    {value: 10, type: 2},
    {value: 9, type: 3},
    {value: 8, type: 0},
    {value: 3, type: 1},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 1, 0), [
    {value: 8, type: 0},
    {value: 9, type: 3},
    {value: 10, type: 2},
    {value: 11, type: 1},
    {value: 12, type: 0},
  ]);
});

test('selectPlayCards uses triple-with-single response before bomb fallback', () => {
  const game = new Game();
  game.init();
  game.status = 2;
  game.contextPosId = 1;
  game.lastCardInfo = {posId: 0, len: 4, key: 6, type: 'AAAB', is_normal: true};
  setCards(game, 1, [
    {value: 8, type: 0},
    {value: 8, type: 1},
    {value: 8, type: 2},
    {value: 3, type: 0},
    {value: 14, type: 0},
    {value: 14, type: 1},
    {value: 14, type: 2},
    {value: 14, type: 3},
  ]);

  assert.deepEqual(robot.selectPlayCards(game, 1, 0), [
    {value: 8, type: 0},
    {value: 8, type: 1},
    {value: 8, type: 2},
    {value: 3, type: 0},
  ]);
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

test('normal game over disables deprecate countdown after settlement', () => {
  const doGameOverPath = getIndexSection('doGameOver:function', '//发送给云村数据');

  assert.match(doGameOverPath, /desk\.state\s*=\s*0;/);
  assert.equal(doGameOverPath.includes('desk.deprecate_time = 30;'), false);
  assert.match(doGameOverPath, /desk\.deprecate_time\s*=\s*0;/);
});

test('disconnect and change-room cleanup deprecate only active games', () => {
  const activeGamePath = getIndexSection('isActiveGame:function', 'countRobotUsers:function');
  assert.match(activeGamePath, /return\s+desk\s+&&\s+desk\.state\s*==\s*1;/);

  assertCleanupOnlyDeprecatesActiveGame(getIndexSection('checkDisconnect:function', '//切换房间'));
  assertCleanupOnlyDeprecatesActiveGame(getIndexSection('checkChangeRoom:function', 'startGame:function'));
});

test('timeout auto play schedules robot turn after advancing context', () => {
  const gameSchedulePath = getIndexSection('gameSchedule:function', '//检测弃局');

  const autoPassStart = gameSchedulePath.indexOf('game.next(curUserObj, [], desk.islaizi);');
  assert.notEqual(autoPassStart, -1);
  const autoPassEnd = gameSchedulePath.indexOf('}else {', autoPassStart);
  assert.notEqual(autoPassEnd, -1);
  const autoPassPath = gameSchedulePath.slice(autoPassStart, autoPassEnd);

  assert.match(
    autoPassPath,
    /broadCastRoom\('CTX_PLAY_CHANGE'[\s\S]*isPass:\s*true[\s\S]*\);\s*self\.scheduleRobotTurnIfNeeded\(desk\);/
  );

  const autoMinCardStart = gameSchedulePath.indexOf('game.next(curUserObj.posId, [minCard], desk.islaizi);');
  assert.notEqual(autoMinCardStart, -1);
  const autoMinCardPath = gameSchedulePath.slice(autoMinCardStart);

  assert.match(
    autoMinCardPath,
    /broadCastRoom\('CTX_PLAY_CHANGE'[\s\S]*isPass:\s*false[\s\S]*if \(game\.getStatus\(\) === 3\)[\s\S]*self\.doGameOver\(desk,game\);[\s\S]*\}\s*else\s*\{[\s\S]*self\.scheduleRobotTurnIfNeeded\(desk\);/
  );
});
