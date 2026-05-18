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

module.exports = {
  canActOnTurn,
  chooseWildColor,
  isPlayable,
  selectRobotCard,
};
