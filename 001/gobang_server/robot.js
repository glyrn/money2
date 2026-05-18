const BOARD_SIZE = 15;
const CENTER_TAG = 112;
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

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

  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  const index = Math.floor(rng() * ordered.length);
  return ordered[Math.max(0, Math.min(index, ordered.length - 1))];
}

module.exports = {
  BOARD_SIZE,
  stateForPosId,
  wouldCompleteFive,
  selectRobotMove,
};
