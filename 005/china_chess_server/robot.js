const MAX_ROBOT_COUNT = 3;
const WIDTH = 9;
const HEIGHT = 10;
const robotProfiles = require('./robot_profiles');

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

function getSupplementalRobotProfiles(loginObj) {
  return robotProfiles.getSupplementalRobotProfiles(loginObj, MAX_ROBOT_COUNT);
}

function getSupplementalRobotCount(loginObj) {
  return robotProfiles.getSupplementalRobotCount(loginObj, MAX_ROBOT_COUNT);
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
  if (!isLegalPieceMove(board, side, from, to)) {
    return false;
  }
  const nextBoard = cloneBoard(board);
  applyMove(nextBoard, from, to);
  return !isSideInCheck(nextBoard, side);
}

function applyMove(board, from, to) {
  const piece = board[from.y][from.x];
  const captured = board[to.y][to.x] || null;
  board[to.y][to.x] = piece;
  board[from.y][from.x] = null;
  return {piece, captured};
}

function cloneBoard(board) {
  return (board || []).map((row) => row.slice());
}

function getKingPosition(board, side) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const piece = board[y][x];
      if (piece && getPieceSide(piece) === side && getPieceType(piece) === 'j') {
        return {x, y};
      }
    }
  }
  return null;
}

function areKingsFacing(board) {
  const redKing = getKingPosition(board, 0);
  const blackKing = getKingPosition(board, 1);
  if (!redKing || !blackKing || redKing.x !== blackKing.x) {
    return false;
  }
  return countBetween(board, redKing, blackKing) === 0;
}

function isSideInCheck(board, side) {
  if (!board) {
    return false;
  }
  const king = getKingPosition(board, side);
  if (!king) {
    return true;
  }
  if (areKingsFacing(board)) {
    return true;
  }

  const opponent = side === 0 ? 1 : 0;
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const piece = board[y][x];
      if (!piece || getPieceSide(piece) !== opponent) {
        continue;
      }
      if (isLegalPieceMove(board, opponent, {x, y}, king)) {
        return true;
      }
    }
  }
  return false;
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

function getInitialPosition(piece) {
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (INITIAL_BOARD[y][x] === piece) {
        return {x, y};
      }
    }
  }
  return null;
}

function getDevelopedPieces(board, side) {
  const pieces = [];
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const piece = board[y][x];
      if (!piece || getPieceSide(piece) !== side) {
        continue;
      }
      const initial = getInitialPosition(piece);
      if (!initial || initial.x !== x || initial.y !== y) {
        pieces.push({piece, x, y});
      }
    }
  }
  return pieces;
}

function getMovePieceType(board, move) {
  return getPieceType(board[move.from.y][move.from.x]);
}

function getCaptureMoves(board, moves) {
  return moves.filter((move) => board[move.to.y][move.to.x]);
}

function chooseRandom(candidates, randomFn) {
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;
  const index = Math.floor(rng() * candidates.length);
  return candidates[Math.max(0, Math.min(index, candidates.length - 1))];
}

function getOpeningDevelopmentMoves(board, side, moves) {
  const developedPieces = getDevelopedPieces(board, side);
  if (developedPieces.length > 2) {
    return [];
  }

  const nonCannonMoves = moves.filter((move) => getMovePieceType(board, move) !== 'p');
  if (nonCannonMoves.length === 0) {
    return [];
  }

  const nonCannonCaptures = getCaptureMoves(board, nonCannonMoves);
  if (nonCannonCaptures.length > 0) {
    return nonCannonCaptures;
  }

  // Black side (side=0) should prioritize defensive opening:
  // move knight (m) or elephant (x) to protect the center pawn
  if (side === 0) {
    const defensiveMoves = nonCannonMoves.filter((move) => {
      const type = getMovePieceType(board, move);
      if (type === 'm') {
        // Prefer knight moves that protect the center pawn (z2 at position 4,6)
        // m0 at (1,9) -> (2,7) or m1 at (7,9) -> (6,7)
        if (move.to.x === 2 && move.to.y === 7) return true;
        if (move.to.x === 6 && move.to.y === 7) return true;
        return false;
      }
      if (type === 'x') {
        // Elephant moves to connect defense
        return true;
      }
      return false;
    });
    if (defensiveMoves.length > 0) {
      return defensiveMoves;
    }
    // Fallback: prefer any knight move over other non-cannon moves
    const knightMoves = nonCannonMoves.filter((move) => getMovePieceType(board, move) === 'm');
    if (knightMoves.length > 0) {
      return knightMoves;
    }
  }

  const developedCannonCount = developedPieces
    .filter((item) => getPieceType(item.piece) === 'p')
    .length;
  if (developedPieces.length === 0 || developedCannonCount > 0) {
    return nonCannonMoves;
  }

  return [];
}

function selectRobotMove(board, side, randomFn) {
  const moves = getLegalMoves(board, side);
  if (moves.length === 0) {
    return null;
  }
  const openingMoves = getOpeningDevelopmentMoves(board, side, moves);
  if (openingMoves.length > 0) {
    return chooseRandom(openingMoves, randomFn);
  }

  const captures = getCaptureMoves(board, moves);
  return chooseRandom(captures.length > 0 ? captures : moves, randomFn);
}

module.exports = {
  WIDTH,
  HEIGHT,
  MAX_ROBOT_COUNT,
  buildRobotLoginData,
  createInitialBoard,
  getRandomDelayMs,
  getSupplementalRobotCount,
  getSupplementalRobotProfiles,
  getPieceSide,
  isSideInCheck,
  makeRobotUid,
  normalizeRobotCount,
  parseRobotCountFromLaunchUrl,
  isLegalMove,
  applyMove,
  getLegalMoves,
  selectRobotMove,
};
