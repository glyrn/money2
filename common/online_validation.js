const assert = require('node:assert/strict');
const http = require('node:http');
const io = require('../001/gobang_server/node_modules/socket.io-client');

const chinaChess = require('../005/china_chess_server/robot');

const HOST = process.env.GAME_HOST || '121.40.149.243';
const BASE_UID = Number(process.env.QA_UID || Date.now() % 100000000);
const WAIT = Number(process.env.QA_WAIT_MS || 9000);

const EVENTS = [
  'LOGIN_SUCCESS',
  'SIT_CHANGE',
  'PREPARE_SUCCESS',
  'GAME_START',
  'PLAY_CHESS_SUCCESS',
  'MAKE_DICE_NUM_SUCCESS',
  'PLAY_MOVE_STEP_SUCCESS',
  'NEXT_PLAYER_DICE_SUCCESS',
  'CTX_USER_CHANGE',
  'CALL_SCORE_SUCCESS',
  'SHOW_TOP_CARD',
  'CTX_PLAY_CHANGE',
  'PLAY_CARD_SUCCESS',
  'PLAY_CARD_ERROR',
  'PLAY_PASS_SUCCESS',
  'PLUS_CARD',
  'PLUS_CARD_ONLY',
  'MESSAGE',
  'GAME_OVER',
  'CONNECT_STATE',
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestStatus(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${port}/`, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.setTimeout(5000, () => {
      req.destroy(new Error(`HTTP timeout on ${port}`));
    });
    req.on('error', reject);
  });
}

class QAClient {
  constructor(name, port, path) {
    this.name = name;
    this.events = [];
    this.waiters = [];
    this.socket = io(`http://${HOST}:${port}`, {
      path,
      forceNew: true,
      reconnection: false,
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });
    EVENTS.forEach((event) => {
      this.socket.on(event, (data) => this.record(event, data));
    });
  }

  connect() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${this.name} connect timeout`)), 7000);
      this.socket.once('connect', () => {
        clearTimeout(timer);
        resolve();
      });
      this.socket.once('connect_error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  record(event, data) {
    const item = {event, data, at: Date.now(), seq: this.events.length};
    this.events.push(item);
    const waiters = this.waiters.slice();
    waiters.forEach((waiter) => {
      if (waiter.event === event && item.seq >= waiter.sinceSeq && waiter.predicate(data)) {
        waiter.resolve(data);
        this.waiters = this.waiters.filter((next) => next !== waiter);
      }
    });
  }

  emit(event, data) {
    this.socket.emit(event, data);
  }

  waitFor(event, predicate, timeoutMs) {
    const pred = predicate || (() => true);
    const existing = this.events.find((item) => item.event === event && pred(item.data));
    if (existing) {
      return Promise.resolve(existing.data);
    }
    return new Promise((resolve, reject) => {
      const waiter = {
        event,
        predicate: pred,
        sinceSeq: 0,
        resolve,
        reject,
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((next) => next !== waiter);
        reject(new Error(`${this.name} wait ${event} timeout`));
      }, timeoutMs || WAIT);
      waiter.resolve = (data) => {
        clearTimeout(timer);
        resolve(data);
      };
      this.waiters.push(waiter);
    });
  }

  waitForNext(event, predicate, timeoutMs) {
    const pred = predicate || (() => true);
    return new Promise((resolve, reject) => {
      const waiter = {
        event,
        predicate: pred,
        sinceSeq: this.events.length,
        resolve,
        reject,
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((next) => next !== waiter);
        reject(new Error(`${this.name} wait next ${event} timeout`));
      }, timeoutMs || WAIT);
      waiter.resolve = (data) => {
        clearTimeout(timer);
        resolve(data);
      };
      this.waiters.push(waiter);
    });
  }

  count(event, predicate) {
    const pred = predicate || (() => true);
    return this.events.filter((item) => item.event === event && pred(item.data)).length;
  }

  async assertNoEvent(event, predicate, ms, label) {
    const before = this.count(event, predicate);
    await delay(ms);
    const after = this.count(event, predicate);
    assert.equal(after, before, label || `${this.name} unexpected ${event}`);
  }

  close() {
    this.socket.close();
  }
}

async function withClients(clients, fn) {
  try {
    await Promise.all(clients.map((client) => client.connect()));
    return await fn();
  } finally {
    clients.forEach((client) => client.close());
    await delay(100);
  }
}

function loginPayload(room, uid, extra) {
  return Object.assign({
    uid,
    name: `QA${uid}`,
    avatorUrl: '',
    score: 0,
    room,
    play_mode: 1,
    play_count: 1,
    auto_ready: 1,
    lanuch_url: `http://qa.test/?room=${room}&auto_ready=1`,
  }, extra || {});
}

async function validateHttp() {
  const checks = [
    ['gobang', 9001],
    ['doudizhu', 9002],
    ['uno', 9003],
    ['china_chess', 9005],
    ['flychess', 9006],
  ];
  for (const [name, port] of checks) {
    const status = await requestStatus(port);
    assert.ok(status >= 200 && status < 400, `${name} HTTP status ${status}`);
  }
  return 'HTTP roots reachable';
}

async function validateGobang() {
  const room = `qa_wzq_${Date.now()}`;
  const client = new QAClient('gobang-human', 9001, '/wzq_socket.io');
  const occupied = new Set();
  let myPos = null;
  let turn = null;
  let nextTag = 112;

  function actIfMine() {
    if (turn === myPos) {
      while (occupied.has(nextTag)) nextTag++;
      client.emit('PLAY_CHESS', nextTag);
    }
  }

  return withClients([client], async () => {
    client.emit('LOGIN', loginPayload(room, BASE_UID + 101, {
      robot: 1,
      lanuch_url: `http://qa.test/?room=${room}&robot=1&auto_ready=1`,
    }));
    const login = await client.waitFor('LOGIN_SUCCESS');
    myPos = login.self.posId;
    await client.waitFor('SIT_CHANGE', (data) => data.target && data.target.isRobot === true);
    const start = await client.waitFor('GAME_START');
    turn = start.posId;
    actIfMine();
    const until = Date.now() + WAIT;
    while (Date.now() < until && client.count('PLAY_CHESS_SUCCESS') < 2) {
      try {
        const move = await client.waitForNext('PLAY_CHESS_SUCCESS', null, 3000);
        occupied.add(move.tag);
        turn = move.posId === 0 ? 1 : 0;
        actIfMine();
      } catch (err) {
        break;
      }
    }
    assert.ok(client.count('PLAY_CHESS_SUCCESS') >= 1, 'gobang should accept at least one move');
    return 'gobang login/robot/start/move ok';
  });
}

async function validateChinaChess() {
  const room = `qa_zgxq_${Date.now()}`;
  const client = new QAClient('china-human', 9005, '/zgxq_socket.io');
  const board = chinaChess.createInitialBoard();
  const selected = {};
  let myPos = null;
  let turn = null;

  function applyServerMove(data) {
    if (data.move === 0 && !selected[turn]) {
      selected[turn] = {x: data.x, y: data.y};
      return;
    }
    if (data.move === 0 && selected[turn] && board[data.y] && board[data.y][data.x] && chinaChess.getPieceSide(board[data.y][data.x]) === turn) {
      selected[turn] = {x: data.x, y: data.y};
      return;
    }
    if (selected[turn]) {
      chinaChess.applyMove(board, selected[turn], {x: data.x, y: data.y});
      selected[turn] = null;
      turn = turn === 0 ? 1 : 0;
    }
  }

  function actIfMine() {
    if (turn !== myPos) return;
    const move = chinaChess.selectRobotMove(board, myPos, () => 0);
    assert.ok(move, 'china chess should have legal move');
    client.emit('PLAY_CHESS', {x: move.from.x, y: move.from.y, move: 0});
    setTimeout(() => client.emit('PLAY_CHESS', {x: move.to.x, y: move.to.y, move: 1}), 80);
  }

  return withClients([client], async () => {
    client.emit('LOGIN', loginPayload(room, BASE_UID + 501, {
      robot: 1,
      lanuch_url: `http://qa.test/?room=${room}&robot=1&auto_ready=1`,
    }));
    const login = await client.waitFor('LOGIN_SUCCESS');
    myPos = login.self.posId;
    await client.waitFor('SIT_CHANGE', (data) => data.target && data.target.isRobot === true);
    const start = await client.waitFor('GAME_START');
    turn = start.posId;
    actIfMine();
    const until = Date.now() + WAIT;
    while (Date.now() < until && client.count('PLAY_CHESS_SUCCESS', (data) => data.move === 1) < 1) {
      const move = await client.waitForNext('PLAY_CHESS_SUCCESS', null, 4000);
      applyServerMove(move);
      actIfMine();
    }
    assert.ok(client.count('PLAY_CHESS_SUCCESS') >= 2, 'china chess should select and move');
    return 'china chess login/robot/start/move ok';
  });
}

async function validateFlychess() {
  const room = `qa_fxq_${Date.now()}`;
  const client = new QAClient('fly-human', 9006, '/fxq_socket.io');
  let myPos = null;
  let turn = null;
  let activeChess = false;

  function rollIfMine() {
    if (turn === myPos) {
      client.emit('MAKE_DICE_NUM');
    }
  }

  return withClients([client], async () => {
    client.emit('LOGIN', loginPayload(room, BASE_UID + 601, {
      play_mode: 1,
      ready_count: 2,
      robot: 1,
      lanuch_url: `http://qa.test/?room=${room}&robot=1&auto_ready=1`,
    }));
    const login = await client.waitFor('LOGIN_SUCCESS');
    myPos = login.posId;
    await client.waitFor('SIT_CHANGE', (data) => data.target && data.target.isRobot === true);
    const start = await client.waitFor('GAME_START');
    turn = start.posId;
    rollIfMine();
    const dice = await client.waitFor('MAKE_DICE_NUM_SUCCESS', null, WAIT);
    if (dice.posId === myPos) {
      const canTakeoff = !activeChess && [2, 4, 6].includes(dice.num);
      if (activeChess || canTakeoff) {
        client.emit('PLAY_MOVE_STEP', {idx: 0, num: dice.num});
        activeChess = true;
        await client.waitFor('PLAY_MOVE_STEP_SUCCESS', (data) => data.posId === myPos, 5000);
        client.emit('NEXT_PLAYER_DICE');
      } else {
        client.emit('NEXT_PLAYER_DICE');
      }
    }
    assert.ok(client.count('MAKE_DICE_NUM_SUCCESS') >= 1, 'flychess should roll dice');
    return 'flychess login/robot/start/dice ok';
  });
}

async function validateUnoTurnGuard() {
  const room = `qa_uno_${Date.now()}`;
  const a = new QAClient('uno-a', 9003, '/uno_socket.io');
  const b = new QAClient('uno-b', 9003, '/uno_socket.io');
  const byPos = {};

  return withClients([a, b], async () => {
    a.emit('LOGIN', loginPayload(room, BASE_UID + 301, {ready_count: 2, game_time: 1, specific_score: 1000}));
    b.emit('LOGIN', loginPayload(room, BASE_UID + 302, {ready_count: 2, game_time: 1, specific_score: 1000}));
    const la = await a.waitFor('LOGIN_SUCCESS');
    const lb = await b.waitFor('LOGIN_SUCCESS');
    byPos[la.posId] = a;
    byPos[lb.posId] = b;
    a.emit('PREPARE');
    b.emit('PREPARE');
    const start = await a.waitFor('GAME_START');
    const active = byPos[start.turn];
    const inactive = byPos[start.turn === la.posId ? lb.posId : la.posId];
    inactive.emit('PLAY_PASS');
    await a.assertNoEvent('PLUS_CARD', null, 800, 'UNO out-of-turn PLAY_PASS must not advance turn');
    active.emit('PLAY_PASS');
    await a.waitFor('PLUS_CARD', (data) => data.posId === start.turn, 5000);
    return 'uno turn guard and legal pass ok';
  });
}

async function driveDoudizhuToPlay(clients, byPos) {
  let play = null;
  const deadline = Date.now() + WAIT;
  const cursors = new Map(clients.map((client) => [client, 0]));
  async function nextDeskEvent() {
    const names = ['CTX_USER_CHANGE', 'CTX_PLAY_CHANGE', 'SHOW_TOP_CARD'];
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      for (const client of clients) {
        const cursor = cursors.get(client) || 0;
        const existing = client.events.find((item) => item.seq >= cursor && names.includes(item.event));
        if (existing) {
          cursors.set(client, existing.seq + 1);
          return existing;
        }
      }
      await delay(50);
    }
    throw new Error('doudizhu wait desk event timeout');
  }
  while (!play && Date.now() < deadline) {
    const ctx = await nextDeskEvent();
    if (ctx.event === 'CTX_PLAY_CHANGE') {
      play = ctx.data;
      break;
    }
    if (ctx.event === 'SHOW_TOP_CARD') {
      continue;
    }
    const scoreOptions = ctx.data.ctxScore || [];
    const score = scoreOptions.length ? Math.max.apply(null, scoreOptions) : 0;
    byPos[ctx.data.ctxPos].emit('CALL_SCORE', {score});
  }
  assert.ok(play, 'doudizhu should enter play phase');
  return play;
}

async function validateDoudizhuTurnGuard() {
  const room = `qa_ddz_${Date.now()}`;
  const clients = [
    new QAClient('ddz-a', 9002, '/hlddz_socket.io'),
    new QAClient('ddz-b', 9002, '/hlddz_socket.io'),
    new QAClient('ddz-c', 9002, '/hlddz_socket.io'),
  ];
  const byPos = {};

  return withClients(clients, async () => {
    clients.forEach((client, idx) => {
      client.emit('LOGIN', loginPayload(room, BASE_UID + 201 + idx, {
        ready_count: 3,
        base_score: 100,
        play_mode: 0,
      }));
    });
    const logins = await Promise.all(clients.map((client) => client.waitFor('LOGIN_SUCCESS')));
    logins.forEach((login, idx) => {
      byPos[login.posId] = clients[idx];
    });
    clients.forEach((client) => client.emit('PREPARE'));
    await clients[0].waitFor('GAME_START');
    const play = await driveDoudizhuToPlay(clients, byPos);
    const activePos = play.posId;
    const inactivePos = Object.keys(byPos).map(Number).find((pos) => pos !== activePos);
    byPos[inactivePos].emit('PLAY_CARD', []);
    await clients[0].assertNoEvent('CTX_PLAY_CHANGE', (data) => data.isPass === true, 800, 'doudizhu out-of-turn pass must not advance turn');
    byPos[activePos].emit('PLAY_CARD', []);
    await clients[0].assertNoEvent('CTX_PLAY_CHANGE', (data) => data.isPass === true, 800, 'doudizhu leading player must not pass');
    return 'doudizhu turn guard and leading-pass guard ok';
  });
}

async function run() {
  const checks = [
    ['http', validateHttp],
    ['gobang', validateGobang],
    ['china_chess', validateChinaChess],
    ['flychess', validateFlychess],
    ['uno_turn_guard', validateUnoTurnGuard],
    ['doudizhu_turn_guard', validateDoudizhuTurnGuard],
  ];

  const results = [];
  for (const [name, fn] of checks) {
    process.stdout.write(`[RUN] ${name}\n`);
    try {
      const message = await fn();
      results.push({name, ok: true, message});
      process.stdout.write(`[PASS] ${name}: ${message}\n`);
    } catch (err) {
      results.push({name, ok: false, message: err.stack || String(err)});
      process.stdout.write(`[FAIL] ${name}: ${err.stack || err}\n`);
    }
  }

  const failed = results.filter((item) => !item.ok);
  process.stdout.write(`\nSummary: ${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

run();
