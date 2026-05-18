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

module.exports = {
  MAX_ROBOT_COUNT,
  normalizeRobotCount,
  parseRobotCountFromLaunchUrl,
  getRandomDelayMs,
  makeRobotUid,
  buildRobotLoginData,
};
