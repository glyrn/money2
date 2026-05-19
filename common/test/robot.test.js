const test = require('node:test');
const assert = require('node:assert/strict');

const robot = require('../robot');

test('normalizeRobotCount clamps invalid and large robot counts', () => {
  assert.equal(robot.normalizeRobotCount(undefined), 0);
  assert.equal(robot.normalizeRobotCount('0'), 0);
  assert.equal(robot.normalizeRobotCount('-2'), 0);
  assert.equal(robot.normalizeRobotCount('2'), 2);
  assert.equal(robot.normalizeRobotCount(9), 3);
});

test('parseRobotCountFromLaunchUrl reads robot from raw launch URLs', () => {
  assert.equal(robot.parseRobotCountFromLaunchUrl('https://game.test/wzq?room=a&robot=1'), 1);
  assert.equal(robot.parseRobotCountFromLaunchUrl('/index.html?robot=2#hash'), 2);
  assert.equal(robot.parseRobotCountFromLaunchUrl('not a full url?robot=3'), 3);
  assert.equal(robot.parseRobotCountFromLaunchUrl('/index.html?room=a'), 0);
});

test('getRandomDelayMs returns a delay in the accepted 1-3 second range', () => {
  assert.equal(robot.getRandomDelayMs(() => 0), 1000);
  assert.equal(robot.getRandomDelayMs(() => 0.5), 2000);
  const highDelay = robot.getRandomDelayMs(() => 0.999);
  assert.ok(highDelay >= 1000);
  assert.ok(highDelay <= 3000);
});

test('makeRobotUid and buildRobotLoginData create stable robot player data', () => {
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
