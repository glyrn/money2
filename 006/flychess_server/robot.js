const MAX_ROBOT_COUNT = 3;
const FINISH_STEP = 55;
const RING_STEP_COUNT = 50;
const RING_PLACE_COUNT = 52;
const STRAIGHT_MID_STEP = 52;
const START_OFFSETS = [0, 13, 26, 39];
const JUMP_STEPS = [4, 17, 30, 43];
const NO_JUMP_STEPS = [10, 23, 36, 49];

function normalizeRobotCount(value) {
  const count = parseInt(value, 10);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.min(count, MAX_ROBOT_COUNT);
}

function parseQueryValue(rawUrl, name) {
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
  return params.get(name);
}

function parseQueryRobotValue(rawUrl) {
  return parseQueryValue(rawUrl, 'robot');
}

function parseRobotCountFromLaunchUrl(rawUrl) {
  return normalizeRobotCount(parseQueryRobotValue(rawUrl));
}

function tryParseRobotProfilesText(value) {
  if (!value || typeof value !== 'string') {
    return [];
  }

  const variants = [value.trim()];
  try {
    const decoded = decodeURIComponent(value).trim();
    if (decoded && decoded !== variants[0]) {
      variants.push(decoded);
    }
  } catch (err) {
  }

  for (const raw of variants) {
    if (!raw) {
      continue;
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
    }

    try {
      const normalized = raw
        .replace(/([{,]\s*)(id|uid|name|nickname|avatar|avatorUrl|score)\s*:/g, '$1"$2":')
        .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, function(match, inner) {
          return JSON.stringify(inner.replace(/\\'/g, "'"));
        });
      return JSON.parse(normalized);
    } catch (err) {
    }
  }

  return [];
}

function parseRobotProfiles(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    return [value];
  }
  return tryParseRobotProfilesText(value);
}

function firstFilledValue(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
}

function normalizeRobotProfile(profile, index) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const score = parseInt(profile.score, 10);
  return {
    uid: String(firstFilledValue([profile.id, profile.uid])),
    name: String(firstFilledValue([profile.name, profile.nickname]) || ('机器人' + (index + 1))),
    avatorUrl: String(firstFilledValue([profile.avatar, profile.avatorUrl])),
    score: Number.isFinite(score) ? score : 0,
  };
}

function getSupplementalRobotProfiles(loginObj) {
  if (!loginObj) {
    return [];
  }

  let rawProfiles = parseRobotProfiles(loginObj.robots);
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    rawProfiles = parseRobotProfiles(parseQueryValue(loginObj.lanuch_url, 'robots'));
  }
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    return [];
  }

  const currentUid = loginObj.uid === undefined || loginObj.uid === null ? '' : String(loginObj.uid);
  return rawProfiles
    .slice(0, MAX_ROBOT_COUNT)
    .map(normalizeRobotProfile)
    .filter(Boolean)
    .filter((profile) => !currentUid || String(profile.uid) !== currentUid);
}

function isTrueLike(value) {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function parseRobotIdentityFromLaunchUrl(rawUrl) {
  return isTrueLike(parseQueryValue(rawUrl, 'isRobot'));
}

function isSignedRobotLogin(loginObj) {
  if (!loginObj) {
    return false;
  }
  return isTrueLike(loginObj.isRobot) || parseRobotIdentityFromLaunchUrl(loginObj.lanuch_url);
}

function shouldAutoPrepareLogin(loginObj) {
  if (!loginObj) {
    return false;
  }
  if (isSignedRobotLogin(loginObj) || isTrueLike(loginObj.auto_ready)) {
    return true;
  }
  return isTrueLike(parseQueryValue(loginObj.lanuch_url, 'auto_ready'));
}

function getSupplementalRobotCount(loginObj) {
  if (!loginObj) {
    return 0;
  }
  const robotProfiles = getSupplementalRobotProfiles(loginObj);
  if (robotProfiles.length > 0) {
    return robotProfiles.length;
  }
  if (isSignedRobotLogin(loginObj)) {
    return 0;
  }
  const robotCount = normalizeRobotCount(loginObj.robot);
  if (robotCount > 0) {
    return robotCount;
  }
  return parseRobotCountFromLaunchUrl(loginObj.lanuch_url);
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

function createMoveResult(moved, finished, effects) {
  const result = {moved, finished};
  Object.defineProperty(result, 'effects', {
    enumerable: false,
    value: effects || {landings: [], flyHit: false},
  });
  return result;
}

function getPlaceInfo(posId, step) {
  const pos = parseInt(posId, 10);
  const idx = parseInt(step, 10);
  if (!Number.isFinite(pos) || !Number.isFinite(idx) || idx < 0) {
    return null;
  }
  if (idx === FINISH_STEP) {
    return {type: 6, color: pos, ringIndex: null, eatable: false, midStraight: false};
  }
  if (idx >= RING_STEP_COUNT && idx < FINISH_STEP) {
    return {type: 3, color: pos, ringIndex: null, eatable: false, midStraight: idx === STRAIGHT_MID_STEP};
  }

  let type = 0;
  if (JUMP_STEPS.includes(idx)) {
    type = 2;
  } else if (NO_JUMP_STEPS.includes(idx)) {
    type = 7;
  }

  const color = (idx + pos + 3) % 4;
  const ringIndex = (START_OFFSETS[pos] + idx) % RING_PLACE_COUNT;
  return {type, color, ringIndex, eatable: type === 0 || type === 2 || type === 7, midStraight: false};
}

function resolveMoveTargetStep(currentStep, diceNum, chessStatus, finishStep) {
  const num = parseInt(diceNum, 10);
  const status = parseInt(chessStatus, 10);
  const parsedFinishStep = parseInt(finishStep, 10);
  const maxStep = Number.isFinite(parsedFinishStep) ? parsedFinishStep : FINISH_STEP;
  const parsedStep = parseInt(currentStep, 10);
  let step = Number.isFinite(parsedStep) && parsedStep >= 0 ? parsedStep : 0;
  let directForward = true;

  if (!Number.isFinite(num) || num <= 0) {
    return step;
  }

  if (step > 0 || status === 2) {
    step++;
  }

  for (let i = 0; i < num; i++) {
    if (i >= num - 1) {
      continue;
    }
    if (directForward) {
      if (step + 1 > maxStep) {
        step--;
        directForward = false;
      } else {
        step++;
      }
    } else {
      step--;
    }
  }

  return Math.max(0, step);
}

function applyBombMove(currentStep) {
  let step = Math.max(0, parseInt(currentStep, 10));
  for (let i = 0; i < 3; i++) {
    if (step - 1 >= 0) {
      step--;
    } else {
      step = 0;
    }
  }
  return step;
}

function resolveActiveMoveOutcome(currentStep, diceNum, chessStatus, posId) {
  const pos = Number.isFinite(parseInt(posId, 10)) ? parseInt(posId, 10) : 0;
  const effects = {landings: [], flyHit: false};
  let step = resolveMoveTargetStep(currentStep, diceNum, chessStatus);
  let status = 2;
  let finished = false;

  function landOnCurrentStep() {
    const place = getPlaceInfo(pos, step);
    if (!place) {
      return false;
    }

    effects.landings.push({posId: pos, step});

    if (place.type === 2 && place.color === pos) {
      step += 12;
      effects.flyHit = true;
      effects.landings.push({posId: pos, step});
      const jumpTarget = getPlaceInfo(pos, step);
      if (jumpTarget && jumpTarget.type === 1) {
        step = applyBombMove(step);
        effects.landings.push({posId: pos, step});
      }
      return true;
    }

    if (place.type === 1) {
      step = applyBombMove(step);
      effects.landings.push({posId: pos, step});
      return true;
    }

    return false;
  }

  const firstPlace = getPlaceInfo(pos, step);
  if (firstPlace && firstPlace.type === 6) {
    return {step: -1, status: 3, finished: true, effects};
  }

  const isSpecial = landOnCurrentStep();
  if (!isSpecial) {
    const targetPlace = getPlaceInfo(pos, step);
    if (targetPlace && targetPlace.type === 6) {
      finished = true;
      status = 3;
      step = -1;
    } else if (targetPlace && targetPlace.type === 0 && targetPlace.color === pos) {
      step = resolveMoveTargetStep(step, 4, 2);
      landOnCurrentStep();
    }
  }

  return {step, status, finished, effects};
}

function getCollisionLandingSteps(effects) {
  const landings = Array.isArray(effects && effects.landings) ? effects.landings : [];
  if (landings.length === 0) {
    return [];
  }

  const finalStep = parseInt(landings[landings.length - 1].step, 10);
  if (!Number.isFinite(finalStep)) {
    return [];
  }
  return [finalStep];
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
    return (status === 1 || status === 2) && step >= 0 && resolveActiveMoveOutcome(step, diceNum, status, state.posId).finished;
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

function advanceChessState(player, chessIdx, diceNum, playMode, posId) {
  const state = createRobotState(player);
  const idx = parseInt(chessIdx, 10);
  const num = parseInt(diceNum, 10);
  if (idx < 0 || idx > 3 || !Number.isFinite(num) || num <= 0) {
    return createMoveResult(false, false);
  }

  const status = parseInt(state.chess_status[idx], 10);
  if (status === 3) {
    return createMoveResult(false, false);
  }

  if (status === 0) {
    if (!canTakeoff(playMode, num)) {
      return createMoveResult(false, false);
    }
    state.chess_status[idx] = 1;
    state.chess_steps[idx] = 0;
    return createMoveResult(true, false);
  }

  if (status === 1 || status === 2) {
    const currentStep = state.chess_steps[idx];
    const outcome = resolveActiveMoveOutcome(currentStep, num, status, posId !== undefined ? posId : state.posId);
    if (outcome.finished) {
      state.chess_status[idx] = 3;
      state.chess_steps[idx] = -1;
      state.finish_chess[idx] = 1;
      return createMoveResult(true, true, outcome.effects);
    }
    state.chess_status[idx] = outcome.status;
    state.chess_steps[idx] = outcome.step;
    return createMoveResult(true, false, outcome.effects);
  }

  return createMoveResult(false, false);
}

function getRandomDelayMs(randomFn) {
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  return 1000 + Math.floor(rng() * 2001);
}

module.exports = {
  FINISH_STEP,
  MAX_ROBOT_COUNT,
  STRAIGHT_MID_STEP,
  advanceChessState,
  canTakeoff,
  createRobotState,
  getCollisionLandingSteps,
  getPlaceInfo,
  getMovableChessIndexes,
  getRandomDelayMs,
  getSupplementalRobotProfiles,
  getSupplementalRobotCount,
  isSignedRobotLogin,
  normalizeRobotCount,
  parseRobotIdentityFromLaunchUrl,
  parseRobotCountFromLaunchUrl,
  resolveActiveMoveOutcome,
  resolveMoveTargetStep,
  selectRobotMove,
  shouldAutoPrepareLogin,
};
