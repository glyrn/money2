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
  selectCallScore,
  buildCandidatePlays,
  selectPlayCards,
};
