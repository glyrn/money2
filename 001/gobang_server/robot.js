const MAX_ROBOT_COUNT = 3;
const BOARD_SIZE = 15;
const CENTER_TAG = 112;
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

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

function getRandomDelayMs(randomFn) {
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  return 1000 + Math.floor(rng() * 2001);
}

function makeRobotUid(desk, posId) {
  return 900000000 + parseInt(desk.deskId, 10) * 10 + parseInt(posId, 10);
}

function buildRobotLoginData(userObj) {
  return {
    uid: userObj.uid,
    state: userObj.state,
    name: userObj.name,
    avatorUrl: userObj.avatorUrl,
    score: userObj.score,
    posId: userObj.posId,
    isRobot: true,
  };
}

function getCell(board, x, y) {
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return null;
  }
  return board[y * BOARD_SIZE + x] || null;
}

function getState(board, x, y) {
  const cell = getCell(board, x, y);
  return cell ? parseInt(cell.state, 10) : null;
}

function stateForPosId(posId) {
  return parseInt(posId, 10) === 0 ? 1 : 0;
}

function countLine(board, x, y, dx, dy, state) {
  let count = 0;
  let cx = x + dx;
  let cy = y + dy;
  while (getState(board, cx, cy) === state) {
    count++;
    cx += dx;
    cy += dy;
  }
  return count;
}

function isEmpty(board, x, y) {
  return getState(board, x, y) === -1;
}

function wouldCompleteFive(board, tag, state) {
  const x = tag % BOARD_SIZE;
  const y = Math.floor(tag / BOARD_SIZE);
  return DIRECTIONS.some(([dx, dy]) => {
    const count = 1
      + countLine(board, x, y, dx, dy, state)
      + countLine(board, x, y, -dx, -dy, state);
    return count >= 5;
  });
}

function evaluateDirection(board, x, y, dx, dy, state) {
  const forward = countLine(board, x, y, dx, dy, state);
  const backward = countLine(board, x, y, -dx, -dy, state);
  const total = 1 + forward + backward;
  const forwardOpen = isEmpty(board, x + dx * (forward + 1), y + dy * (forward + 1));
  const backwardOpen = isEmpty(board, x - dx * (backward + 1), y - dy * (backward + 1));
  const openEnds = (forwardOpen ? 1 : 0) + (backwardOpen ? 1 : 0);

  if (total >= 5) {
    return 1000000;
  }
  if (total === 4) {
    return openEnds === 2 ? 220000 : (openEnds === 1 ? 140000 : 0);
  }
  if (total === 3) {
    return openEnds === 2 ? 60000 : (openEnds === 1 ? 25000 : 0);
  }
  if (total === 2) {
    return openEnds === 2 ? 8000 : (openEnds === 1 ? 1500 : 0);
  }
  return openEnds === 2 ? 300 : 30;
}

function scoreMoveForState(board, tag, state) {
  const x = tag % BOARD_SIZE;
  const y = Math.floor(tag / BOARD_SIZE);
  return DIRECTIONS.reduce((score, [dx, dy]) => (
    score + evaluateDirection(board, x, y, dx, dy, state)
  ), 0);
}

function getEmptyTags(board) {
  return (board || [])
    .filter((cell) => cell && parseInt(cell.state, 10) === -1)
    .map((cell) => parseInt(cell.tag, 10))
    .filter((tag) => Number.isFinite(tag));
}

function sortByCenter(tags) {
  return tags.slice().sort((a, b) => {
    const ax = a % BOARD_SIZE;
    const ay = Math.floor(a / BOARD_SIZE);
    const bx = b % BOARD_SIZE;
    const by = Math.floor(b / BOARD_SIZE);
    const ad = Math.abs(ax - 7) + Math.abs(ay - 7);
    const bd = Math.abs(bx - 7) + Math.abs(by - 7);
    return ad - bd || a - b;
  });
}

function selectRobotMove(board, posId, randomFn) {
  const emptyTags = getEmptyTags(board);
  if (emptyTags.length === 0) {
    return null;
  }

  const robotState = stateForPosId(posId);
  const opponentState = robotState === 1 ? 0 : 1;
  const ordered = sortByCenter(emptyTags);
  const winning = ordered.find((tag) => wouldCompleteFive(board, tag, robotState));
  if (winning !== undefined) {
    return winning;
  }

  const blocking = ordered.find((tag) => wouldCompleteFive(board, tag, opponentState));
  if (blocking !== undefined) {
    return blocking;
  }

  let bestTag = ordered[0];
  let bestScore = -1;
  for (const tag of ordered) {
    const attackScore = scoreMoveForState(board, tag, robotState);
    const defenseScore = scoreMoveForState(board, tag, opponentState);
    const score = attackScore + defenseScore * 1.2;
    if (score > bestScore) {
      bestScore = score;
      bestTag = tag;
    }
  }
  if (bestScore > 0) {
    return bestTag;
  }

  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  const index = Math.floor(rng() * ordered.length);
  return ordered[Math.max(0, Math.min(index, ordered.length - 1))];
}

module.exports = {
  BOARD_SIZE,
  MAX_ROBOT_COUNT,
  buildRobotLoginData,
  getRandomDelayMs,
  makeRobotUid,
  normalizeRobotCount,
  parseRobotCountFromLaunchUrl,
  stateForPosId,
  wouldCompleteFive,
  selectRobotMove,
};
