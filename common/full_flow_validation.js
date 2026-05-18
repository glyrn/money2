const assert = require('node:assert/strict');
const http = require('node:http');
const io = require('../001/gobang_server/node_modules/socket.io-client');

const unoRobot = require('../003/uno_server/robot');
const chinaChess = require('../005/china_chess_server/robot');
const flychess = require('../006/flychess_server/robot');

const HOST = process.env.GAME_HOST || '121.40.149.243';
const BASE_UID = Number(process.env.QA_UID || (900000000 + Math.floor(Math.random() * 50000000)));
const WAIT = Number(process.env.QA_WAIT_MS || 12000);
const LONG_WAIT = Number(process.env.QA_LONG_WAIT_MS || 240000);

const EVENTS = [
  'LOGIN_SUCCESS',
  'SIT_CHANGE',
  'PREPARE_SUCCESS',
  'GAME_START',
  'PLAY_CHESS_SUCCESS',
  'MAKE_DICE_NUM_SUCCESS',
  'PLAY_MOVE_STEP_SUCCESS',
  'FINISH_CHESS_SUCCESS',
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
  'GAME_OVER_DEPRECATE',
  'CONNECT_STATE',
  'SET_RECOVER_STATUS',
];

function now() {
  return Date.now();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requestStatus(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${port}/`, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.setTimeout(5000, () => req.destroy(new Error(`HTTP timeout on ${port}`)));
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
    const item = {event, data, at: now(), seq: this.events.length, client: this};
    this.events.push(item);
    const waiters = this.waiters.slice();
    waiters.forEach((waiter) => {
      if (waiter.event === event && item.seq >= waiter.sinceSeq && waiter.predicate(data, item)) {
        waiter.resolve(item);
        this.waiters = this.waiters.filter((next) => next !== waiter);
      }
    });
  }

  emit(event, data) {
    this.socket.emit(event, data);
  }

  waitFor(event, predicate, timeoutMs) {
    const pred = predicate || (() => true);
    const existing = this.events.find((item) => item.event === event && pred(item.data, item));
    if (existing) {
      return Promise.resolve(existing);
    }
    return this.waitForNext(event, pred, timeoutMs, 0);
  }

  waitForNext(event, predicate, timeoutMs, sinceSeq) {
    const pred = predicate || (() => true);
    return new Promise((resolve, reject) => {
      const waiter = {
        event,
        predicate: pred,
        sinceSeq: sinceSeq === undefined ? this.events.length : sinceSeq,
        resolve,
        reject,
      };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((next) => next !== waiter);
        reject(new Error(`${this.name} wait ${event} timeout`));
      }, timeoutMs || WAIT);
      waiter.resolve = (item) => {
        clearTimeout(timer);
        resolve(item);
      };
      this.waiters.push(waiter);
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitAny(clients, names, predicate, timeoutMs) {
  const pred = predicate || (() => true);
  const deadline = now() + (timeoutMs || WAIT);
  const cursors = new Map(clients.map((client) => [client, client.events.length]));
  while (now() < deadline) {
    for (const client of clients) {
      const cursor = cursors.get(client) || 0;
      const item = client.events.find((eventItem) => eventItem.seq >= cursor && names.includes(eventItem.event) && pred(eventItem, client));
      if (item) {
        cursors.set(client, item.seq + 1);
        return item;
      }
    }
    await delay(25);
  }
  throw new Error(`waitAny timeout: ${names.join(',')}`);
}

function makeEventReader(clients) {
  const cursors = new Map(clients.map((client) => [client, client.events.length]));
  return async function nextEvent(names, predicate, timeoutMs) {
    const pred = predicate || (() => true);
    const deadline = now() + (timeoutMs || WAIT);
    while (now() < deadline) {
      for (const client of clients) {
        const cursor = cursors.get(client) || 0;
        const item = client.events.find((eventItem) => eventItem.seq >= cursor && names.includes(eventItem.event));
        if (item) {
          cursors.set(client, item.seq + 1);
          if (pred(item, client)) {
            return item;
          }
        }
      }
      await delay(25);
    }
    throw new Error(`nextEvent timeout: ${names.join(',')}`);
  };
}

async function withClients(clients, fn) {
  try {
    await Promise.all(clients.map((client) => client.connect()));
    return await fn();
  } finally {
    clients.forEach((client) => client.close());
    await delay(120);
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

async function prepareAll(clients) {
  clients.forEach((client) => client.emit('PREPARE'));
}

async function fullGobang() {
  const room = `full_wzq_${Date.now()}`;
  const clients = [
    new QAClient('wzq-a', 9001, '/wzq_socket.io'),
    new QAClient('wzq-b', 9001, '/wzq_socket.io'),
  ];
  const byPos = {};
  let moves = 0;

  return withClients(clients, async () => {
    clients.forEach((client, idx) => client.emit('LOGIN', loginPayload(room, BASE_UID + 1000 + idx, {play_mode: 1})));
    const logins = await Promise.all(clients.map((client) => client.waitFor('LOGIN_SUCCESS')));
    logins.forEach((item, idx) => {
      byPos[item.data.self.posId] = clients[idx];
    });
    await prepareAll(clients);
    const start = await clients[0].waitFor('GAME_START');
    const nextEvent = makeEventReader([clients[0]]);
    const winner = start.data.posId;
    const winTags = [0, 1, 2, 3, 4];
    const loseTags = [15, 16, 17, 18];
    let turn = winner;
    let gameOver = null;

    while (!gameOver) {
      const tag = turn === winner ? winTags.shift() : loseTags.shift();
      assert.notEqual(tag, undefined, 'gobang scripted tags exhausted');
      byPos[turn].emit('PLAY_CHESS', tag);
      await nextEvent(['PLAY_CHESS_SUCCESS'], (item) => item.data.tag === tag, WAIT);
      moves++;
      if (turn === winner && winTags.length === 0) {
        gameOver = await nextEvent(['GAME_OVER'], (item) => item.data.winer === winner, WAIT);
        break;
      }
      turn = turn === 0 ? 1 : 0;
    }

    return {game: '欢乐五子棋', room, result: 'GAME_OVER', winner, moves, detail: gameOver.data};
  });
}

function sortCardsAsc(cards) {
  return (cards || []).slice().sort((a, b) => a.value - b.value || a.type - b.type);
}

function removeCardsFromHand(hand, cards) {
  (cards || []).forEach((card) => {
    const index = hand.findIndex((item) => item.value === card.value && item.type === card.type);
    assert.notEqual(index, -1, `card ${JSON.stringify(card)} should exist in hand`);
    hand.splice(index, 1);
  });
}

function chooseDoudizhuPlay(hand, lastActive, posId) {
  const sorted = sortCardsAsc(hand);
  if (sorted.length === 0) {
    return [];
  }
  if (!lastActive || !lastActive.len || lastActive.posId === posId) {
    return [sorted[0]];
  }
  if (lastActive.type === 'A' && lastActive.len === 1) {
    const higherSingle = sorted.find((card) => card.value > lastActive.key);
    return higherSingle ? [higherSingle] : [];
  }
  return [];
}

function removeUnoCard(hand, card) {
  const index = hand.findIndex((item) => {
    if ((card.value === 'color' || card.value === 'plus4') && item.value === card.value) {
      return true;
    }
    return item.value === card.value && item.type === card.type && item.color === card.color;
  });
  assert.notEqual(index, -1, `UNO card ${JSON.stringify(card)} should exist in hand`);
  hand.splice(index, 1);
}

function chooseUnoPlay(hand, outCards) {
  const selected = unoRobot.selectRobotCard(hand, outCards);
  if (!selected) {
    return null;
  }
  if (hand.length === 1 && selected.type === 2) {
    return null;
  }
  return selected;
}

async function fullDoudizhu() {
  const room = `full_ddz_${Date.now()}`;
  const clients = [
    new QAClient('ddz-a', 9002, '/hlddz_socket.io'),
    new QAClient('ddz-b', 9002, '/hlddz_socket.io'),
    new QAClient('ddz-c', 9002, '/hlddz_socket.io'),
  ];
  const byPos = {};
  const hands = {};
  let actions = 0;
  let landlord = null;

  return withClients(clients, async () => {
    clients.forEach((client, idx) => {
      client.emit('LOGIN', loginPayload(room, BASE_UID + 2000 + idx, {
        ready_count: 3,
        base_score: 100,
        play_mode: 0,
      }));
    });
    const logins = await Promise.all(clients.map((client) => client.waitFor('LOGIN_SUCCESS')));
    logins.forEach((item, idx) => {
      byPos[item.data.posId] = clients[idx];
    });
    await prepareAll(clients);
    const start = await clients[0].waitFor('GAME_START');
    const cardRows = clone(start.data.cards);
    cardRows.forEach((row) => {
      if (row.id !== 3) {
        hands[row.id] = row.cards.slice();
      }
    });
    const topCards = (cardRows.find((row) => row.id === 3) || {cards: []}).cards;

    const call = await clients[0].waitFor('CTX_USER_CHANGE');
    const scoreOptions = call.data.ctxScore && call.data.ctxScore.length ? call.data.ctxScore : [3];
    const score = Math.max.apply(null, scoreOptions);
    const nextEvent = makeEventReader(clients);
    byPos[call.data.ctxPos].emit('CALL_SCORE', {score});
    actions++;

    let playStart = null;
    while (!playStart) {
      const item = await nextEvent(['SHOW_TOP_CARD', 'CTX_PLAY_CHANGE'], (eventItem, client) => client === clients[0], WAIT);
      if (item.event === 'SHOW_TOP_CARD') {
        landlord = item.data.dizhuPosId;
        hands[landlord].push(...(item.data.topCards || topCards));
      }
      if (item.event === 'CTX_PLAY_CHANGE') {
        playStart = item;
      }
    }
    landlord = playStart.data.posId;
    if (hands[landlord].length === 17) {
      hands[landlord].push(...topCards);
    }
    let currentPlay = playStart;
    let over = null;
    let lastActive = currentPlay.data.ctxData || {len: 0, posId: landlord};

    while (!over && actions < 220) {
      const posId = currentPlay.data.posId;
      const cards = chooseDoudizhuPlay(hands[posId], lastActive, posId);
      byPos[posId].emit('PLAY_CARD', cards);
      actions++;
      const accepted = await nextEvent(
        ['CTX_PLAY_CHANGE', 'PLAY_CARD_ERROR', 'GAME_OVER'],
        (eventItem, client) => client === clients[0] || eventItem.event === 'PLAY_CARD_ERROR',
        WAIT
      );
      if (accepted.event === 'PLAY_CARD_ERROR') {
        throw new Error(`doudizhu play rejected at pos ${posId}: ${JSON.stringify(accepted.data)}`);
      }
      if (accepted.event === 'CTX_PLAY_CHANGE') {
        const ctxData = accepted.data.ctxData || {};
        const playedCards = ctxData.cards || [];
        if (playedCards.length) {
          removeCardsFromHand(hands[ctxData.posId], playedCards);
          lastActive = ctxData;
          if (hands[ctxData.posId].length === 0) {
            over = await nextEvent(
              ['GAME_OVER'],
              (eventItem, client) => client === clients[0],
              WAIT
            );
            break;
          }
        }
        currentPlay = accepted;
        continue;
      }
      over = accepted;
      break;
    }

    if (!over) {
      over = await nextEvent(['GAME_OVER'], null, WAIT);
    }
    return {game: '斗地主', room, result: 'GAME_OVER', landlord, actions, detail: over.data};
  });
}

async function fullUno() {
  const room = `full_uno_${Date.now()}`;
  const clients = [
    new QAClient('uno-a', 9003, '/uno_socket.io'),
    new QAClient('uno-b', 9003, '/uno_socket.io'),
  ];
  const byPos = {};
  const hands = {};
  const outCards = [];
  let actions = 0;

  return withClients(clients, async () => {
    clients.forEach((client, idx) => {
      client.emit('LOGIN', loginPayload(room, BASE_UID + 3000 + idx, {
        ready_count: 2,
        specific_score: 1000,
      }));
    });
    const logins = await Promise.all(clients.map((client) => client.waitFor('LOGIN_SUCCESS')));
    logins.forEach((item, idx) => {
      byPos[item.data.posId] = clients[idx];
    });
    await prepareAll(clients);
    const starts = await Promise.all(clients.map((client) => client.waitFor('GAME_START')));
    starts.forEach((item, idx) => {
      const posId = logins[idx].data.posId;
      hands[posId] = item.data.cards.slice();
    });
    outCards.push(starts[0].data.top);
    let currentTurn = starts[0].data.turn;
    const nextEvent = makeEventReader(clients);
    let over = null;

    while (!over && actions < 400) {
      const client = byPos[currentTurn];
      const card = chooseUnoPlay(hands[currentTurn], outCards);
      if (!card) {
        client.emit('PLAY_PASS');
        actions++;
        let pass = null;
        let plus = null;
        while (!pass || !plus) {
          const item = await nextEvent(
            ['PLAY_PASS_SUCCESS', 'PLUS_CARD', 'GAME_OVER'],
            (eventItem, eventClient) => {
              if (eventItem.event === 'GAME_OVER') {
                return eventClient === clients[0];
              }
              if (eventItem.event === 'PLAY_PASS_SUCCESS') {
                return eventClient === client;
              }
              return eventClient === clients[0] && eventItem.data.posId === currentTurn;
            },
            WAIT
          );
          if (item.event === 'GAME_OVER') {
            over = item;
            break;
          }
          if (item.event === 'PLAY_PASS_SUCCESS') {
            pass = item;
            hands[currentTurn].push(...(pass.data.plus_cards || []));
            const lastCard = outCards[outCards.length - 1];
            if (lastCard && (lastCard.value === 'plus2' || lastCard.value === 'plus4')) {
              lastCard.mark = true;
            }
            continue;
          }
          if (item.event === 'PLUS_CARD') {
            plus = item;
          }
        }
        if (over) {
          break;
        }
        currentTurn = plus.data.nextPosId;
        continue;
      }

      client.emit('PLAY_CARD', card);
      actions++;
      let accepted = null;
      while (!accepted) {
        const item = await nextEvent(
          ['PLUS_CARD_ONLY', 'PLAY_CARD_SUCCESS', 'GAME_OVER'],
          (eventItem, eventClient) => eventClient === clients[0],
          WAIT
        );
        if (item.event === 'PLUS_CARD_ONLY') {
          hands[item.data.posId].push(item.data.card);
          continue;
        }
        accepted = item;
      }
      if (accepted.event === 'GAME_OVER') {
        over = accepted;
        break;
      }
      removeUnoCard(hands[accepted.data.posId], accepted.data.card);
      outCards.push(accepted.data.card);
      currentTurn = accepted.data.nextPosId;
      if (hands[accepted.data.posId].length === 0) {
        over = await nextEvent(
          ['GAME_OVER'],
          (eventItem, eventClient) => eventClient === clients[0],
          WAIT
        );
      }
    }

    assert.ok(over, `UNO should finish within automation limit; actions=${actions}`);
    return {game: 'UNO', room, result: 'GAME_OVER', winner: over.data.winer, actions, detail: over.data};
  });
}

async function fullChinaChess() {
  const room = `full_zgxq_${Date.now()}`;
  const clients = [
    new QAClient('zgxq-a', 9005, '/zgxq_socket.io'),
    new QAClient('zgxq-b', 9005, '/zgxq_socket.io'),
  ];
  const byPos = {};
  const board = chinaChess.createInitialBoard();
  let moves = 0;

  return withClients(clients, async () => {
    clients.forEach((client, idx) => client.emit('LOGIN', loginPayload(room, BASE_UID + 5000 + idx, {play_mode: 1})));
    const logins = await Promise.all(clients.map((client) => client.waitFor('LOGIN_SUCCESS')));
    logins.forEach((item, idx) => {
      byPos[item.data.self.posId] = clients[idx];
    });
    await prepareAll(clients);
    const start = await clients[0].waitFor('GAME_START');
    const turn = start.data.posId;
    const move = chinaChess.selectRobotMove(board, turn, () => 0);
    assert.ok(move, 'china chess should have a legal move');
    byPos[turn].emit('PLAY_CHESS', {x: move.from.x, y: move.from.y, move: 0});
    await waitAny(clients, ['PLAY_CHESS_SUCCESS'], (item) => item.data.move === 0, WAIT);
    byPos[turn].emit('PLAY_CHESS', {x: move.to.x, y: move.to.y, move: 1});
    await waitAny(clients, ['PLAY_CHESS_SUCCESS'], (item) => item.data.move === 1, WAIT);
    chinaChess.applyMove(board, move.from, move.to);
    moves++;

    byPos[turn].emit('REQ_GAME_OVER', {winer: turn});
    await delay(1000);
    await prepareAll(clients);
    const restart = await waitAny(clients, ['GAME_START'], null, WAIT);
    return {game: '中国象棋', room, result: 'REQ_GAME_OVER accepted and next GAME_START reached', winner: turn, moves, restartTurn: restart.data.posId};
  });
}

function initialFlyState(posId) {
  return {
    posId,
    chess_status: {0: 0, 1: 0, 2: 0, 3: 0},
    chess_steps: {0: -1, 1: -1, 2: -1, 3: -1},
    finish_chess: {0: 0, 1: 0, 2: 0, 3: 0},
  };
}

async function fullFlychess() {
  const room = `full_fxq_${Date.now()}`;
  const clients = [
    new QAClient('fxq-a', 9006, '/fxq_socket.io'),
  ];
  const byPos = {};
  const states = {};
  let rolls = 0;
  let moves = 0;
  let finishes = 0;
  let currentDice = {};
  let currentTurn = null;

  async function roll(posId) {
    byPos[posId].emit('MAKE_DICE_NUM');
    rolls++;
  }

  async function nextTurn(posId) {
    byPos[posId].emit('NEXT_PLAYER_DICE');
  }

  return withClients(clients, async () => {
    clients.forEach((client, idx) => {
      client.emit('LOGIN', loginPayload(room, BASE_UID + 6000 + idx, {
        play_mode: 1,
        ready_count: 1,
      }));
    });
    const logins = await Promise.all(clients.map((client) => client.waitFor('LOGIN_SUCCESS')));
    logins.forEach((item, idx) => {
      byPos[item.data.posId] = clients[idx];
      states[item.data.posId] = initialFlyState(item.data.posId);
    });
    await prepareAll(clients);
    const start = await clients[0].waitFor('GAME_START');
    currentTurn = start.data.posId;
    const nextEvent = makeEventReader(clients);
    await roll(currentTurn);

    const deadline = now() + LONG_WAIT;
    let over = null;
    while (!over && now() < deadline && rolls < 1200) {
      const event = await nextEvent(['MAKE_DICE_NUM_SUCCESS', 'PLAY_MOVE_STEP_SUCCESS', 'FINISH_CHESS_SUCCESS', 'NEXT_PLAYER_DICE_SUCCESS', 'GAME_OVER'], null, 30000);
      if (event.event === 'GAME_OVER') {
        over = event;
        break;
      }
      if (event.event === 'NEXT_PLAYER_DICE_SUCCESS') {
        currentTurn = event.data.posId;
        await roll(currentTurn);
        continue;
      }
      if (event.event === 'MAKE_DICE_NUM_SUCCESS') {
        currentTurn = event.data.posId;
        currentDice[currentTurn] = event.data.num;
        const idx = flychess.selectRobotMove(states[currentTurn], 1, event.data.num, () => 0);
        if (idx == null) {
          await nextTurn(currentTurn);
          continue;
        }
        byPos[currentTurn].emit('PLAY_MOVE_STEP', {idx, num: event.data.num});
        continue;
      }
      if (event.event === 'PLAY_MOVE_STEP_SUCCESS') {
        const posId = event.data.posId;
        const idx = event.data.idx;
        const num = currentDice[posId];
        const result = flychess.advanceChessState(states[posId], idx, num, 1, posId);
        moves++;
        if (result.finished) {
          byPos[posId].emit('FINISH_CHESS', {idx});
        } else {
          await nextTurn(posId);
        }
        continue;
      }
      if (event.event === 'FINISH_CHESS_SUCCESS') {
        finishes++;
        await delay(50);
        await nextTurn(event.data.posId);
      }
    }

    assert.ok(over, `flychess should finish within automation limit; rolls=${rolls}, moves=${moves}, finishes=${finishes}`);
    return {game: '飞行棋', room, result: 'GAME_OVER', winner: over.data.winer, rolls, moves, finishes, detail: over.data};
  });
}

async function validateHttpRoots() {
  const ports = [9001, 9002, 9003, 9005, 9006];
  const statuses = {};
  for (const port of ports) {
    statuses[port] = await requestStatus(port);
    assert.ok(statuses[port] >= 200 && statuses[port] < 400, `HTTP ${port} status ${statuses[port]}`);
  }
  return statuses;
}

async function run() {
  const startedAt = now();
  const checks = [
    ['http', validateHttpRoots],
    ['gobang_full', fullGobang],
    ['doudizhu_full', fullDoudizhu],
    ['uno_full', fullUno],
    ['china_chess_full', fullChinaChess],
    ['flychess_full', fullFlychess],
  ];
  const only = process.env.FULL_FLOW_ONLY;
  const selectedChecks = only ? checks.filter(([name]) => name === only) : checks;
  const results = [];

  for (const [name, fn] of selectedChecks) {
    process.stdout.write(`[RUN] ${name}\n`);
    const t0 = now();
    try {
      const data = await fn();
      const result = {name, ok: true, durationMs: now() - t0, data};
      results.push(result);
      process.stdout.write(`[PASS] ${name}: ${JSON.stringify(result)}\n`);
    } catch (err) {
      const result = {name, ok: false, durationMs: now() - t0, error: err.stack || String(err)};
      results.push(result);
      process.stdout.write(`[FAIL] ${name}: ${err.stack || err}\n`);
    }
  }

  const failed = results.filter((item) => !item.ok);
  const summary = {
    host: HOST,
    startedAt: new Date(startedAt).toISOString(),
    durationMs: now() - startedAt,
    passed: results.length - failed.length,
    total: results.length,
    results,
  };
  process.stdout.write(`\nFULL_FLOW_SUMMARY ${JSON.stringify(summary)}\n`);
  if (failed.length) {
    process.exitCode = 1;
  }
}

run();
