const MAX_ROBOT_COUNT = 3;
const robotProfiles = require('./robot_profiles');

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

function cloneCard(card) {
  return {
    type: card.type,
    value: card.value,
    color: card.color,
  };
}

function chooseWildColor(hand) {
  const counts = {1: 0, 2: 0, 3: 0, 4: 0};
  (hand || []).forEach((card) => {
    if (card && card.color >= 1 && card.color <= 4) {
      counts[card.color]++;
    }
  });
  return [1, 2, 3, 4].sort((a, b) => counts[b] - counts[a] || a - b)[0];
}

function isPlayable(card, lastCard) {
  if (!card || !lastCard) {
    return false;
  }
  if (lastCard.type === 1) {
    return card.color === lastCard.color
      || card.value === lastCard.value
      || card.value === 'color'
      || card.value === 'plus4';
  }
  if (lastCard.value === 'plus2') {
    if (lastCard.mark) {
      return card.color === lastCard.color
        || card.value === lastCard.value
        || card.value === 'color'
        || card.value === 'plus4';
    }
    return card.value === 'plus2' || card.value === 'plus4';
  }
  if (lastCard.value === 'plus4') {
    if (lastCard.mark) {
      return card.color === lastCard.color || card.value === 'color' || card.value === 'plus4';
    }
    return card.value === 'plus4';
  }
  if (lastCard.value === 'stop' || lastCard.value === 'turn' || lastCard.value === 'color') {
    return card.color === lastCard.color
      || card.value === lastCard.value
      || card.value === 'color'
      || card.value === 'plus4';
  }
  return false;
}

function normalizeWild(card, hand) {
  const selected = cloneCard(card);
  if (selected.value === 'color' || selected.value === 'plus4') {
    selected.color = chooseWildColor(hand);
  }
  return selected;
}

function selectRobotCard(hand, outCards) {
  const cards = hand || [];
  const lastCard = outCards && outCards.length > 0 ? outCards[outCards.length - 1] : null;
  if (!lastCard) {
    return cards.length > 0 ? normalizeWild(cards[0], cards) : null;
  }

  const playable = cards.filter((card) => isPlayable(card, lastCard));
  if (playable.length === 0) {
    return null;
  }

  const nonWild = playable.find((card) => card.value !== 'color' && card.value !== 'plus4');
  return normalizeWild(nonWild || playable[0], cards);
}

function canActOnTurn(desk, posId) {
  if (!desk || desk.state !== 1) {
    return false;
  }
  return parseInt(desk.cur_posId, 10) === parseInt(posId, 10);
}

function drawCards(desk, count, randomFn) {
  const drawn = [];
  const rng = typeof randomFn === 'function' ? randomFn : Math.random;

  for (let i = 0; i < count; i++) {
    if (!desk.cards || desk.cards.length === 0) {
      if (!desk.out_cards || desk.out_cards.length <= 1) {
        break;
      }
      const topCard = desk.out_cards.pop();
      // Clean mark properties from cards being reshuffled
      const cards = desk.out_cards.splice(0, desk.out_cards.length).map(function(card) {
        const cleaned = Object.assign({}, card);
        delete cleaned.mark;
        return cleaned;
      });
      desk.out_cards.push(topCard);
      // Shuffle using same algorithm as createCards
      const shuffled = [];
      while (cards.length > 0) {
        const idx = Math.floor(rng() * cards.length);
        shuffled.push(cards[idx]);
        cards.splice(idx, 1);
      }
      desk.cards = shuffled;
    }
    const card = desk.cards.shift();
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

module.exports = {
  MAX_ROBOT_COUNT,
  buildRobotLoginData,
  canActOnTurn,
  chooseWildColor,
  drawCards,
  getRandomDelayMs,
  getSupplementalRobotCount,
  getSupplementalRobotProfiles,
  isPlayable,
  makeRobotUid,
  normalizeRobotCount,
  parseRobotCountFromLaunchUrl,
  selectRobotCard,
};
