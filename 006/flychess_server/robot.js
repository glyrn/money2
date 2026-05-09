const MAX_ROBOT_COUNT = 3;
const FINISH_STEP = 55;

function normalizeRobotCount(value) {
  const count = parseInt(value, 10);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.min(count, MAX_ROBOT_COUNT);
}

function parseQueryRobotValue(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return undefined;
  }
  const queryStart = rawUrl.indexOf('?');
  if (queryStart < 0) {
    return undefined;
  }
  const hashStart = rawUrl.indexOf('#', queryStart);
  const query = rawUrl.slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined);
  const params = new URLSearchParams(query);
  return params.get('robot');
}

function parseRobotCountFromLaunchUrl(rawUrl) {
  return normalizeRobotCount(parseQueryRobotValue(rawUrl));
}

function createRobotState(overrides) {
  const state = overrides || {};
  state.chess_status = Object.assign({0: 0, 1: 0, 2: 0, 3: 0}, state.chess_status || {});
  state.chess_steps = Object.assign({0: -1, 1: -1, 2: -1, 3: -1}, state.chess_steps || {});
  state.finish_chess = Object.assign({0: 0, 1: 0, 2: 0, 3: 0}, state.finish_chess || {});
  return state;
}

function canTakeoff(playMode, diceNum) {
  const num = parseInt(diceNum, 10);
  const mode = parseInt(playMode, 10);
  if (mode === 0) {
    return num === 6;
  }
  return num === 2 || num === 4 || num === 6;
}

function getMovableChessIndexes(player, playMode, diceNum) {
  const state = createRobotState(player);
  const movable = [];
  for (let i = 0; i < 4; i++) {
    const status = parseInt(state.chess_status[i], 10);
    if (status === 3) {
      continue;
    }
    if (status === 0) {
      if (canTakeoff(playMode, diceNum)) {
        movable.push(i);
      }
      continue;
    }
    if (status === 1 || status === 2) {
      movable.push(i);
    }
  }
  return movable;
}

function selectRobotMove(player, playMode, diceNum, randomFn) {
  const state = createRobotState(player);
  const movable = getMovableChessIndexes(state, playMode, diceNum);
  if (movable.length === 0) {
    return null;
  }

  const finishing = movable.find((idx) => {
    const status = parseInt(state.chess_status[idx], 10);
    const step = parseInt(state.chess_steps[idx], 10);
    return (status === 1 || status === 2) && step >= 0 && step + parseInt(diceNum, 10) >= FINISH_STEP;
  });
  if (finishing !== undefined) {
    return finishing;
  }

  const active = movable.filter((idx) => parseInt(state.chess_status[idx], 10) === 1 || parseInt(state.chess_status[idx], 10) === 2);
  const candidates = active.length > 0 ? active : movable;
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  const index = Math.floor(rng() * candidates.length);
  return candidates[Math.max(0, Math.min(index, candidates.length - 1))];
}

function advanceChessState(player, chessIdx, diceNum, playMode) {
  const state = createRobotState(player);
  const idx = parseInt(chessIdx, 10);
  const num = parseInt(diceNum, 10);
  if (idx < 0 || idx > 3 || !Number.isFinite(num) || num <= 0) {
    return {moved: false, finished: false};
  }

  const status = parseInt(state.chess_status[idx], 10);
  if (status === 3) {
    return {moved: false, finished: false};
  }

  if (status === 0) {
    if (!canTakeoff(playMode, num)) {
      return {moved: false, finished: false};
    }
    state.chess_status[idx] = 1;
    state.chess_steps[idx] = 0;
    return {moved: true, finished: false};
  }

  if (status === 1 || status === 2) {
    const currentStep = Math.max(0, parseInt(state.chess_steps[idx], 10));
    const nextStep = currentStep + num;
    if (nextStep >= FINISH_STEP) {
      state.chess_status[idx] = 3;
      state.chess_steps[idx] = -1;
      state.finish_chess[idx] = 1;
      return {moved: true, finished: true};
    }
    state.chess_status[idx] = 2;
    state.chess_steps[idx] = nextStep;
    return {moved: true, finished: false};
  }

  return {moved: false, finished: false};
}

function getRandomDelayMs(randomFn) {
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  return 1000 + Math.floor(rng() * 2001);
}

module.exports = {
  FINISH_STEP,
  MAX_ROBOT_COUNT,
  advanceChessState,
  canTakeoff,
  createRobotState,
  getMovableChessIndexes,
  getRandomDelayMs,
  normalizeRobotCount,
  parseRobotCountFromLaunchUrl,
  selectRobotMove,
};
