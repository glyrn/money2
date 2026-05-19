const WIDTH = 9;
const HEIGHT = 10;

const INITIAL_BOARD = [
  ['C0', 'M0', 'X0', 'S0', 'J0', 'S1', 'X1', 'M1', 'C1'],
  [null, null, null, null, null, null, null, null, null],
  [null, 'P0', null, null, null, null, null, 'P1', null],
  ['Z0', null, 'Z1', null, 'Z2', null, 'Z3', null, 'Z4'],
  [null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null],
  ['z0', null, 'z1', null, 'z2', null, 'z3', null, 'z4'],
  [null, 'p0', null, null, null, null, null, 'p1', null],
  [null, null, null, null, null, null, null, null, null],
  ['c0', 'm0', 'x0', 's0', 'j0', 's1', 'x1', 'm1', 'c1'],
];

function createInitialBoard() {
  return INITIAL_BOARD.map((row) => row.slice());
}

function inBounds(x, y) {
  return x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT;
}

function getPieceSide(piece) {
  if (!piece) {
    return null;
  }
  return piece[0] === piece[0].toLowerCase() ? 0 : 1;
}

function getPieceType(piece) {
  return piece ? piece[0].toLowerCase() : null;
}

function isOwnPiece(piece, side) {
  return getPieceSide(piece) === side;
}

function palaceContains(side, x, y) {
  if (x < 3 || x > 5) {
    return false;
  }
  return side === 0 ? y >= 7 && y <= 9 : y >= 0 && y <= 2;
}

function countBetween(board, from, to) {
  if (from.x !== to.x && from.y !== to.y) {
    return -1;
  }
  let count = 0;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x + dx;
  let y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    if (board[y][x]) {
      count++;
    }
    x += dx;
    y += dy;
  }
  return count;
}

function isRiverSideValidForElephant(side, y) {
  return side === 0 ? y >= 5 : y <= 4;
}

function isSoldierForward(side, dy) {
  return side === 0 ? dy === -1 : dy === 1;
}

function hasSoldierCrossed(side, y) {
  return side === 0 ? y <= 4 : y >= 5;
}

function isLegalPieceMove(board, side, from, to) {
  const piece = board[from.y][from.x];
  const target = board[to.y][to.x];
  const type = getPieceType(piece);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);

  if (type === 'c') {
    return (dx === 0 || dy === 0) && countBetween(board, from, to) === 0;
  }
  if (type === 'p') {
    const between = countBetween(board, from, to);
    if (between < 0) {
      return false;
    }
    return target ? between === 1 : between === 0;
  }
  if (type === 'm') {
    if (!((adx === 1 && ady === 2) || (adx === 2 && ady === 1))) {
      return false;
    }
    const legX = from.x + (adx === 2 ? Math.sign(dx) : 0);
    const legY = from.y + (ady === 2 ? Math.sign(dy) : 0);
    return !board[legY][legX];
  }
  if (type === 'x') {
    if (adx !== 2 || ady !== 2 || !isRiverSideValidForElephant(side, to.y)) {
      return false;
    }
    return !board[from.y + dy / 2][from.x + dx / 2];
  }
  if (type === 's') {
    return adx === 1 && ady === 1 && palaceContains(side, to.x, to.y);
  }
  if (type === 'j') {
    if (to.x === from.x && target && getPieceType(target) === 'j') {
      return countBetween(board, from, to) === 0;
    }
    return adx + ady === 1 && palaceContains(side, to.x, to.y);
  }
  if (type === 'z') {
    if (dx === 0 && isSoldierForward(side, dy)) {
      return true;
    }
    return ady === 0 && adx === 1 && hasSoldierCrossed(side, from.y);
  }
  return false;
}

function isLegalMove(board, side, from, to) {
  if (!board || !from || !to || !inBounds(from.x, from.y) || !inBounds(to.x, to.y)) {
    return false;
  }
  const piece = board[from.y][from.x];
  if (!piece || getPieceSide(piece) !== side) {
    return false;
  }
  const target = board[to.y][to.x];
  if (target && isOwnPiece(target, side)) {
    return false;
  }
  return isLegalPieceMove(board, side, from, to);
}

function applyMove(board, from, to) {
  const piece = board[from.y][from.x];
  const captured = board[to.y][to.x] || null;
  board[to.y][to.x] = piece;
  board[from.y][from.x] = null;
  return {piece, captured};
}

function getLegalMoves(board, side) {
  const moves = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const piece = board[y][x];
      if (!piece || getPieceSide(piece) !== side) {
        continue;
      }
      for (let ty = 0; ty < HEIGHT; ty++) {
        for (let tx = 0; tx < WIDTH; tx++) {
          const from = {x, y};
          const to = {x: tx, y: ty};
          if (isLegalMove(board, side, from, to)) {
            moves.push({from, to});
          }
        }
      }
    }
  }
  return moves;
}

function selectRobotMove(board, side, randomFn) {
  const moves = getLegalMoves(board, side);
  if (moves.length === 0) {
    return null;
  }
  const captures = moves.filter((move) => board[move.to.y][move.to.x]);
  const candidates = captures.length > 0 ? captures : moves;
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  const index = Math.floor(rng() * candidates.length);
  return candidates[Math.max(0, Math.min(index, candidates.length - 1))];
}

module.exports = {
  WIDTH,
  HEIGHT,
  createInitialBoard,
  getPieceSide,
  isLegalMove,
  applyMove,
  getLegalMoves,
  selectRobotMove,
};
