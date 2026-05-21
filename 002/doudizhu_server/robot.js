const MAX_ROBOT_COUNT = 3;

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

function sortCards(cards) {
  return (cards || []).slice().sort((a, b) => a.value - b.value || a.type - b.type);
}

function groupByValue(cards) {
  const groups = {};
  (cards || []).forEach((card) => {
    if (!groups[card.value]) {
      groups[card.value] = [];
    }
    groups[card.value].push(card);
  });
  return groups;
}

function hasBomb(cards) {
  const groups = groupByValue(cards);
  return Object.keys(groups).some((value) => groups[value].length >= 4);
}

function selectCallScore(options, cards) {
  const scores = (options || []).map((score) => parseInt(score, 10)).filter((score) => Number.isFinite(score));
  if (scores.length === 0) {
    return 0;
  }
  const hand = cards || [];
  const values = hand.map((card) => card.value);
  if ((values.includes(16) && values.includes(17)) || hasBomb(hand)) {
    return Math.max.apply(Math, scores);
  }
  if (values.filter((value) => value >= 14).length >= 2 && scores.includes(2)) {
    return 2;
  }
  return Math.min.apply(Math, scores);
}

function cardsFromValues(cards, values) {
  const remaining = sortCards(cards);
  return values.map((value) => {
    const index = remaining.findIndex((card) => card.value === value);
    if (index < 0) {
      return null;
    }
    return remaining.splice(index, 1)[0];
  }).filter(Boolean);
}

function valuesByCount(groups, count, maxValue) {
  return Object.keys(groups)
    .map(Number)
    .filter((value) => groups[value].length >= count && (maxValue === undefined || value <= maxValue))
    .sort((a, b) => a - b);
}

function takeCardsByValue(groups, value, count) {
  const source = groups[value] || [];
  return sortCards(source).slice(0, count);
}

function removeSelected(cards, selected) {
  return (cards || []).filter((card) => selected.indexOf(card) === -1);
}

function cardKey(card) {
  return card.value + ':' + card.type;
}

function candidateKey(cards) {
  return (cards || []).map(cardKey).sort().join('|');
}

function pushCandidate(candidates, seen, cards) {
  if (!cards || cards.length === 0 || cards.some((card) => !card)) {
    return;
  }
  const key = candidateKey(cards);
  if (seen[key]) {
    return;
  }
  seen[key] = true;
  candidates.push(cards);
}

function getRuns(values) {
  const runs = [];
  let run = [];
  values.forEach((value) => {
    if (run.length === 0 || value === run[run.length - 1] + 1) {
      run.push(value);
    } else {
      runs.push(run);
      run = [value];
    }
  });
  if (run.length > 0) {
    runs.push(run);
  }
  return runs;
}

function addSequenceCandidates(candidates, seen, groups, countPerValue, minUnits, exactUnits, minStart) {
  const values = valuesByCount(groups, countPerValue, 14).filter((value) => value > (minStart || 0));
  getRuns(values).forEach((run) => {
    const maxUnits = exactUnits || run.length;
    for (let units = maxUnits; units >= minUnits; units--) {
      if (run.length < units) {
        continue;
      }
      for (let start = 0; start <= run.length - units; start++) {
        const selected = [];
        run.slice(start, start + units).forEach((value) => {
          selected.push.apply(selected, takeCardsByValue(groups, value, countPerValue));
        });
        pushCandidate(candidates, seen, selected);
      }
      if (exactUnits) {
        break;
      }
    }
  });
}

function pickLowestSingles(cards, count) {
  return sortCards(cards).slice(0, count);
}

function pickLowestPairs(cards, count) {
  const groups = groupByValue(cards);
  const pairs = [];
  valuesByCount(groups, 2).forEach((value) => {
    if (pairs.length < count) {
      pairs.push(takeCardsByValue(groups, value, 2));
    }
  });
  if (pairs.length < count) {
    return [];
  }
  return pairs.reduce((ret, pair) => ret.concat(pair), []);
}

function addTripleAttachCandidates(candidates, seen, groups, cards, minValue, pairAttach) {
  valuesByCount(groups, 3, 14).filter((value) => value > (minValue || 0)).forEach((value) => {
    const triple = takeCardsByValue(groups, value, 3);
    const rest = removeSelected(cards, triple);
    const attach = pairAttach ? pickLowestPairs(rest, 1) : pickLowestSingles(rest, 1);
    if (attach.length === (pairAttach ? 2 : 1)) {
      pushCandidate(candidates, seen, triple.concat(attach));
    }
  });
}

function addFourWithTwoCandidates(candidates, seen, groups, cards, minValue) {
  valuesByCount(groups, 4, 15).filter((value) => value > (minValue || 0)).forEach((value) => {
    const four = takeCardsByValue(groups, value, 4);
    const attach = pickLowestSingles(removeSelected(cards, four), 2);
    if (attach.length === 2) {
      pushCandidate(candidates, seen, four.concat(attach));
    }
  });
}

function addAirplaneCandidates(candidates, seen, groups, cards, units, attachMode, minStart) {
  const tripleValues = valuesByCount(groups, 3, 14).filter((value) => value > (minStart || 0));
  getRuns(tripleValues).forEach((run) => {
    if (run.length < units) {
      return;
    }
    for (let start = 0; start <= run.length - units; start++) {
      const triplePart = [];
      run.slice(start, start + units).forEach((value) => {
        triplePart.push.apply(triplePart, takeCardsByValue(groups, value, 3));
      });
      const rest = removeSelected(cards, triplePart);
      let attach = [];
      if (attachMode === 'single') {
        attach = pickLowestSingles(rest, units);
      } else if (attachMode === 'pair') {
        attach = pickLowestPairs(rest, units);
      }
      if (attachMode === 'none' || attach.length === units * (attachMode === 'pair' ? 2 : 1)) {
        pushCandidate(candidates, seen, triplePart.concat(attach));
      }
    }
  });
}

function addBombCandidates(candidates, seen, groups, minValue) {
  valuesByCount(groups, 4, 15).filter((value) => value > (minValue || 0)).forEach((value) => {
    pushCandidate(candidates, seen, takeCardsByValue(groups, value, 4));
  });
}

function addKingBombCandidate(candidates, seen, groups) {
  if (groups[16] && groups[17]) {
    pushCandidate(candidates, seen, [takeCardsByValue(groups, 16, 1)[0], takeCardsByValue(groups, 17, 1)[0]]);
  }
}

function addSimpleCandidates(candidates, seen, groups, count, minValue) {
  valuesByCount(groups, count).filter((value) => value > (minValue || 0)).forEach((value) => {
    pushCandidate(candidates, seen, takeCardsByValue(groups, value, count));
  });
}

function buildOpeningRecommendationCandidates(cards) {
  const groups = groupByValue(cards);
  const candidates = [];
  const seen = {};

  addSequenceCandidates(candidates, seen, groups, 1, 5);
  addSequenceCandidates(candidates, seen, groups, 2, 3);
  addAirplaneCandidates(candidates, seen, groups, cards, 2, 'none');
  addAirplaneCandidates(candidates, seen, groups, cards, 2, 'single');
  addAirplaneCandidates(candidates, seen, groups, cards, 2, 'pair');
  addTripleAttachCandidates(candidates, seen, groups, cards, 0, true);
  addTripleAttachCandidates(candidates, seen, groups, cards, 0, false);
  addSimpleCandidates(candidates, seen, groups, 2, 0);
  addSimpleCandidates(candidates, seen, groups, 3, 0);
  addSimpleCandidates(candidates, seen, groups, 1, 0);
  addBombCandidates(candidates, seen, groups, 0);
  addKingBombCandidate(candidates, seen, groups);
  return candidates;
}

function buildResponseRecommendationCandidates(cards, lastInfo) {
  const groups = groupByValue(cards);
  const candidates = [];
  const seen = {};
  const key = parseInt(lastInfo.key, 10) || 0;
  const len = parseInt(lastInfo.len, 10) || 0;

  if (lastInfo.type === 'A') {
    addSimpleCandidates(candidates, seen, groups, 1, key);
  } else if (lastInfo.type === 'AA') {
    addSimpleCandidates(candidates, seen, groups, 2, key);
  } else if (lastInfo.type === 'AAA') {
    addSimpleCandidates(candidates, seen, groups, 3, key);
  } else if (lastInfo.type === 'AAAB' && len === 4) {
    addTripleAttachCandidates(candidates, seen, groups, cards, key, false);
  } else if (lastInfo.type === 'AAABB' && len === 5) {
    addTripleAttachCandidates(candidates, seen, groups, cards, key, true);
  } else if (lastInfo.type === 'AAAABC' && len === 6) {
    addFourWithTwoCandidates(candidates, seen, groups, cards, key);
  } else if (lastInfo.type === 'ABCDE' && len >= 5) {
    addSequenceCandidates(candidates, seen, groups, 1, len, len, key);
  } else if (lastInfo.type === 'AABBCC' && len >= 6 && len % 2 === 0) {
    addSequenceCandidates(candidates, seen, groups, 2, len / 2, len / 2, key);
  } else if (lastInfo.type === 'AAABBB' && len >= 6 && len % 3 === 0) {
    addAirplaneCandidates(candidates, seen, groups, cards, len / 3, 'none', key);
  } else if (lastInfo.type === 'AAAB' && len > 4 && len % 4 === 0) {
    addAirplaneCandidates(candidates, seen, groups, cards, len / 4, 'single', key);
  } else if (lastInfo.type === 'AAABB' && len > 5 && len % 5 === 0) {
    addAirplaneCandidates(candidates, seen, groups, cards, len / 5, 'pair', key);
  } else if (lastInfo.type === 'AAAA') {
    addBombCandidates(candidates, seen, groups, key);
    addKingBombCandidate(candidates, seen, groups);
    return candidates;
  } else if (lastInfo.type === 'KING') {
    return candidates;
  }

  addBombCandidates(candidates, seen, groups, 0);
  addKingBombCandidate(candidates, seen, groups);
  return candidates;
}

function pickFirstValidCandidate(game, posId, islaizi, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const result = game.validate(posId, candidate, islaizi);
    if (result && result.status) {
      return candidate;
    }
  }
  return null;
}

function selectRecommendedPlayCards(game, posId, islaizi) {
  const cards = game.getCardsByPosId(posId) || [];
  const lastInfo = game.lastCardInfo || {};
  const candidates = (lastInfo.posId === posId || !lastInfo.len)
    ? buildOpeningRecommendationCandidates(cards)
    : buildResponseRecommendationCandidates(cards, lastInfo);
  return pickFirstValidCandidate(game, posId, islaizi, candidates);
}

function buildCandidatePlays(cards) {
  const sorted = sortCards(cards);
  const groups = groupByValue(sorted);
  const candidates = [];

  sorted.forEach((card) => candidates.push([card]));
  Object.keys(groups).map(Number).sort((a, b) => a - b).forEach((value) => {
    if (groups[value].length >= 2) {
      candidates.push(groups[value].slice(0, 2));
    }
    if (groups[value].length >= 3) {
      candidates.push(groups[value].slice(0, 3));
    }
    if (groups[value].length >= 4) {
      candidates.push(groups[value].slice(0, 4));
    }
  });

  if (groups[16] && groups[17]) {
    candidates.push(cardsFromValues(sorted, [16, 17]));
  }
  return candidates;
}

function selectPlayCards(game, posId, islaizi) {
  const cards = game.getCardsByPosId(posId) || [];
  if (cards.length === 0) {
    return [];
  }
  const recommended = selectRecommendedPlayCards(game, posId, islaizi);
  if (recommended && recommended.length > 0) {
    return recommended;
  }
  const lastInfo = game.lastCardInfo || {};
  if (lastInfo.posId === posId || !lastInfo.len) {
    return [sortCards(cards)[0]];
  }

  const candidates = buildCandidatePlays(cards);
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    if (!candidate || candidate.length === 0) {
      continue;
    }
    const result = game.validate(posId, candidate, islaizi);
    if (result && result.status) {
      return candidate;
    }
  }
  return [];
}

module.exports = {
  MAX_ROBOT_COUNT,
  buildRobotLoginData,
  getRandomDelayMs,
  makeRobotUid,
  normalizeRobotCount,
  parseRobotCountFromLaunchUrl,
  selectCallScore,
  buildCandidatePlays,
  selectRecommendedPlayCards,
  selectPlayCards,
};
