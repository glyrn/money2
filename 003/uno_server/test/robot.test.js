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

function robotProfilesLaunchUrl() {
  const text = "[{id: 9876425344, name: 呆呆嘿😘, avatar: https://cdn.test/avatar_1405.jpg}, {id: 9964265128, name: 你悲的蜂, avatar: https://cdn.test/avatar_49.jpg}]";
  return 'https://game.test/uno?robot=2&robots=' + encodeURIComponent(text);
}

test('robot helpers parse counts and build local robot login data', () => {
  assert.equal(robot.normalizeRobotCount(undefined), 0);
  assert.equal(robot.normalizeRobotCount('2'), 2);
  assert.equal(robot.normalizeRobotCount(9), 3);
  assert.equal(robot.parseRobotCountFromLaunchUrl('/index.html?room=a&robot=3#hash'), 3);
  assert.equal(robot.getRandomDelayMs(() => 0.5), 2000);
  const uid = robot.makeRobotUid({deskId: 12}, 3);
  assert.equal(uid, 900000123);
  assert.deepEqual(robot.buildRobotLoginData({
    uid,
    state: 2,
    name: '机器人1',
    avatorUrl: '',
    score: 0,
    posId: 3,
  }), {
    uid,
    state: 2,
    name: '机器人1',
    avatorUrl: '',
    score: 0,
    posId: 3,
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

test('drawCards recycles discard pile without consuming the top card', () => {
  const desk = {
    cards: [],
    out_cards: [
      {type: 1, value: 5, color: 1},
      {type: 2, value: 'plus2', color: 2, mark: true},
      {type: 1, value: 9, color: 4},
    ],
  };

  const cards = robot.drawCards(desk, 2, () => 0);

  assert.deepEqual(cards, [
    {type: 1, value: 5, color: 1},
    {type: 2, value: 'plus2', color: 2},
  ]);
  assert.deepEqual(desk.out_cards, [{type: 1, value: 9, color: 4}]);
  assert.equal(desk.cards.length, 0);
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

test('timeout game-over path does not settle simply because the draw pile is empty', () => {
  const source = readIndexSource();
  const timeoutPath = sourceBetween(source, 'checkTimeGameOver:function', 'broadCastRoom:function');

  assert.equal(timeoutPath.includes('desk.cards.length <= 0'), false);
});

test('normal game-over paths do not arm deprecate countdown', () => {
  const source = readIndexSource();
  const timeoutPath = sourceBetween(source, 'checkTimeGameOver:function', 'broadCastRoom:function');
  const robotPlayPath = sourceBetween(source, 'handlePlayCard:function', 'checkDisconnect:function');
  const socketPlayPath = sourceBetween(source, 'socket.on("PLAY_CARD"', 'socket.on("PLAY_PASS"');

  for (const normalGameOverPath of [timeoutPath, robotPlayPath, socketPlayPath]) {
    assert.equal(normalGameOverPath.includes('desk.deprecate_time = 30'), false);
    assert.match(normalGameOverPath, /desk\.deprecate_time = 0/);
  }
});

test('normal round scoring keeps robot winners and losers in the score rows', () => {
  const source = readIndexSource();
  const robotPlayPath = sourceBetween(source, 'handlePlayCard:function', 'checkDisconnect:function');

  assert.equal(robotPlayPath.includes('if(!this.isRobotUser(desk.positions[i]))'), false);
  assert.equal(robotPlayPath.includes('if(!this.isRobotUser(desk.positions[winer]))'), false);
  assert.match(robotPlayPath, /ycscore_list\.push\(\{uid:desk\.positions\[i\]\.uid/);
  assert.match(robotPlayPath, /ycscore_list\.push\(\{uid:desk\.positions\[winer\]\.uid/);
});

test('disconnect and change-room cleanup only deprecate active games', () => {
  const source = readIndexSource();
  const disconnectPath = sourceBetween(source, 'checkDisconnect:function', '//切换房间');
  const changeRoomPath = sourceBetween(source, 'checkChangeRoom:function', 'clearRoomByUid:function');

  assert.match(disconnectPath, /var wasPlaying = desk\.state == 1;/);
  assert.match(disconnectPath, /if\s*\(wasPlaying\)\s*\{\s*this\.deprecateGame\(desk\);\s*\}/);
  assert.match(changeRoomPath, /var wasPlaying = roomObj\.state == 1;/);
  assert.match(changeRoomPath, /if\s*\(wasPlaying\)\s*\{\s*this\.deprecateGame\(desk\);\s*\}/);
});

test('start game deals and rotates through actual ready users', () => {
  const source = readIndexSource();
  const startPath = sourceBetween(source, 'tryStartGame:function', 'scheduleRobotTurnIfNeeded:function');
  const nextPosPath = sourceBetween(source, 'getNextPosId:function', 'getDeskByName:function');

  assert.match(source, /getReadyUsers:function/);
  assert.match(startPath, /var readyUsers = this\.getReadyUsers\(desk\);/);
  assert.match(startPath, /desk\.cur_posId = readyUsers\[this\.getRandomNumForRange\(ready_count-1\)\]\.posId;/);
  assert.equal(startPath.includes('const userObj = desk.positions[i];'), false);
  assert.match(nextPosPath, /var readyUsers = this\.getReadyUsers\(desk\);/);
  assert.equal(nextPosPath.includes('curPosId + 1 >= desk.ready_count'), false);
});
