const test = require('node:test');
const assert = require('node:assert/strict');

const robot = require('../robot');

test('parseRobotCountFromLaunchUrl reads and clamps robot query values', () => {
  assert.equal(robot.parseRobotCountFromLaunchUrl('https://game.test/fxq?room=1&robot=2'), 2);
  assert.equal(robot.parseRobotCountFromLaunchUrl('https://game.test/fxq?robot=9'), 3);
  assert.equal(robot.parseRobotCountFromLaunchUrl('https://game.test/fxq?robot=-1'), 0);
  assert.equal(robot.parseRobotCountFromLaunchUrl('https://game.test/fxq?room=1'), 0);
  assert.equal(robot.parseRobotCountFromLaunchUrl('not a url?robot=1'), 1);
});

test('canTakeoff follows flychess play mode rules', () => {
  assert.equal(robot.canTakeoff(0, 6), true);
  assert.equal(robot.canTakeoff(0, 4), false);
  assert.equal(robot.canTakeoff(1, 2), true);
  assert.equal(robot.canTakeoff(1, 4), true);
  assert.equal(robot.canTakeoff(1, 6), true);
  assert.equal(robot.canTakeoff(2, 5), false);
});

test('getMovableChessIndexes includes takeoff and active chess but excludes finished chess', () => {
  const player = robot.createRobotState({
    chess_status: {0: 0, 1: 1, 2: 2, 3: 3},
    chess_steps: {0: -1, 1: 0, 2: 12, 3: -1},
  });

  assert.deepEqual(robot.getMovableChessIndexes(player, 1, 2), [0, 1, 2]);
  assert.deepEqual(robot.getMovableChessIndexes(player, 1, 5), [1, 2]);
});

test('selectRobotMove prioritizes exact finishing before takeoff and random active moves', () => {
  const player = robot.createRobotState({
    chess_status: {0: 0, 1: 2, 2: 2, 3: 3},
    chess_steps: {0: -1, 1: 12, 2: robot.FINISH_STEP - 1, 3: -1},
  });

  assert.equal(robot.selectRobotMove(player, 1, 1, () => 0), 2);
  assert.equal(robot.selectRobotMove(player, 1, 2, () => 0), 1);
});

test('advanceChessState takes off, advances, and only marks exact finish', () => {
  const player = robot.createRobotState();

  let result = robot.advanceChessState(player, 0, 6, 0);
  assert.deepEqual(result, {moved: true, finished: false});
  assert.equal(player.chess_status[0], 1);
  assert.equal(player.chess_steps[0], 0);

  player.chess_status[0] = 2;
  player.chess_steps[0] = robot.FINISH_STEP - 1;
  result = robot.advanceChessState(player, 0, 1, 1);
  assert.deepEqual(result, {moved: true, finished: true});
  assert.equal(player.chess_status[0], 3);
  assert.equal(player.finish_chess[0], 1);
});

test('advanceChessState matches client movement and bonus from takeoff point', () => {
  const player = robot.createRobotState({
    chess_status: {0: 1},
    chess_steps: {0: 0},
  });

  const result = robot.advanceChessState(player, 0, 2, 1);
  assert.deepEqual(result, {moved: true, finished: false});
  assert.equal(player.chess_status[0], 2);
  assert.equal(player.chess_steps[0], 5);
});

test('advanceChessState applies same-color bonus and jump squares like the client', () => {
  const player = robot.createRobotState({
    chess_status: {0: 2},
    chess_steps: {0: 11},
  });

  const result = robot.advanceChessState(player, 0, 2, 1, 0);
  assert.equal(result.moved, true);
  assert.equal(result.finished, false);
  assert.equal(player.chess_status[0], 2);
  assert.equal(player.chess_steps[0], 29);
});

test('advanceChessState keeps final-lane bounce correct after previous bonus movement', () => {
  const player = robot.createRobotState({
    chess_status: {0: 2},
    chess_steps: {0: 51},
  });

  const result = robot.advanceChessState(player, 0, 4, 1, 0);
  assert.deepEqual(result, {moved: true, finished: true});
  assert.equal(player.chess_status[0], 3);
  assert.equal(player.chess_steps[0], -1);
});

test('advanceChessState bounces back instead of finishing when dice overshoots finish', () => {
  const player = robot.createRobotState({
    chess_status: {0: 2},
    chess_steps: {0: robot.FINISH_STEP - 1},
  });

  const result = robot.advanceChessState(player, 0, 2, 1);
  assert.deepEqual(result, {moved: true, finished: false});
  assert.equal(player.chess_status[0], 2);
  assert.equal(player.chess_steps[0], robot.FINISH_STEP - 1);
  assert.equal(player.finish_chess[0], 0);
});

test('advanceChessState bounces multiple excess steps on the final lane', () => {
  const player = robot.createRobotState({
    chess_status: {0: 2},
    chess_steps: {0: robot.FINISH_STEP - 2},
  });

  const result = robot.advanceChessState(player, 0, 4, 1);
  assert.deepEqual(result, {moved: true, finished: false});
  assert.equal(player.chess_status[0], 2);
  assert.equal(player.chess_steps[0], robot.FINISH_STEP - 2);
  assert.equal(player.finish_chess[0], 0);
});

test('simulated robot game finishes all pieces only on exact finish landings', () => {
  const players = [robot.createRobotState(), robot.createRobotState()];
  const diceCycle = [6, 5, 4, 3, 2, 1];
  let diceIndex = 0;
  let finishEvents = 0;
  let completedPlayer = null;

  for (let turn = 0; turn < 5000; turn++) {
    const playerIndex = turn % players.length;
    const player = players[playerIndex];
    const dice = diceCycle[diceIndex++ % diceCycle.length];
    const idx = robot.selectRobotMove(player, 1, dice, () => 0);
    if (idx == null) {
      continue;
    }

    const status = parseInt(player.chess_status[idx], 10);
    const step = parseInt(player.chess_steps[idx], 10);
    const expectedTarget = (status === 1 || status === 2)
      ? robot.resolveMoveTargetStep(step, dice, status)
      : null;
    const result = robot.advanceChessState(player, idx, dice, 1);
    if (result.finished) {
      assert.equal(expectedTarget, robot.FINISH_STEP);
      finishEvents++;
    }

    if (Object.values(player.finish_chess).filter(Number).length === 4) {
      completedPlayer = playerIndex;
      break;
    }
  }

  assert.notEqual(completedPlayer, null);
  assert.equal(finishEvents, 4);
});
