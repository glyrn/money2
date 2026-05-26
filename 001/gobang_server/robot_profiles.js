const DEFAULT_MAX_ROBOT_COUNT = 3;

function normalizeRobotCount(value, maxCount) {
  const limit = Number.isFinite(parseInt(maxCount, 10)) ? parseInt(maxCount, 10) : DEFAULT_MAX_ROBOT_COUNT;
  const count = parseInt(value, 10);
  if (!Number.isFinite(count) || count <= 0) {
    return 0;
  }
  return Math.min(count, limit);
}

function parseQueryValue(rawUrl, name) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return undefined;
  }
  const queryStart = rawUrl.indexOf('?');
  if (queryStart < 0) {
    return undefined;
  }
  const hashStart = rawUrl.indexOf('#', queryStart);
  const query = rawUrl
    .slice(queryStart + 1, hashStart >= 0 ? hashStart : undefined)
    .replace(/&amp;/g, '&');
  const params = new URLSearchParams(query);
  return params.get(name);
}

function decodeMaybe(value) {
  if (typeof value !== 'string') {
    return value;
  }
  const normalizedPlus = value.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(normalizedPlus);
  } catch (err) {
    return normalizedPlus;
  }
}

function stripWrappingQuotes(value) {
  const text = String(value || '').trim();
  if (text.length >= 2) {
    const first = text[0];
    const last = text[text.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return text.slice(1, -1).replace(/\\'/g, "'").replace(/\\"/g, '"');
    }
  }
  return text;
}

function tryParseJsonishProfiles(raw) {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
  }

  try {
    const normalized = raw
      .replace(/([{,]\s*)(id|uid|name|nickname|avatar|avatorUrl|score)\s*:/g, '$1"$2":')
      .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, function(match, inner) {
        return JSON.stringify(inner.replace(/\\'/g, "'"));
      });
    return JSON.parse(normalized);
  } catch (err) {
  }

  return null;
}

function parseObjectBody(body) {
  const profile = {};
  const keyPattern = /(?:^|,)\s*(id|uid|name|nickname|avatar|avatorUrl|score)\s*:/g;
  const matches = [];
  let match;
  while ((match = keyPattern.exec(body)) !== null) {
    matches.push({key: match[1], index: match.index, valueStart: keyPattern.lastIndex});
  }

  matches.forEach((item, index) => {
    const next = matches[index + 1];
    const rawValue = body.slice(item.valueStart, next ? next.index : body.length).trim().replace(/,$/, '').trim();
    profile[item.key] = stripWrappingQuotes(rawValue);
  });

  return Object.keys(profile).length > 0 ? profile : null;
}

function parseLooseProfileList(raw) {
  if (!raw || typeof raw !== 'string') {
    return [];
  }

  const profiles = [];
  const objectPattern = /\{([^{}]*)\}/g;
  let match;
  while ((match = objectPattern.exec(raw)) !== null) {
    const profile = parseObjectBody(match[1]);
    if (profile) {
      profiles.push(profile);
    }
  }
  return profiles;
}

function parseRobotProfiles(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    return [value];
  }
  if (!value || typeof value !== 'string') {
    return [];
  }

  const variants = [];
  const trimmed = value.trim();
  if (trimmed) {
    variants.push(trimmed);
  }
  const decoded = decodeMaybe(value).trim();
  if (decoded && decoded !== trimmed) {
    variants.push(decoded);
  }

  for (const raw of variants) {
    const parsed = tryParseJsonishProfiles(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }

    const loose = parseLooseProfileList(raw);
    if (loose.length > 0) {
      return loose;
    }
  }

  return [];
}

function firstFilledValue(values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
}

function normalizeRobotProfile(profile, index) {
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const score = parseInt(profile.score, 10);
  return {
    uid: String(firstFilledValue([profile.id, profile.uid])),
    name: String(firstFilledValue([profile.name, profile.nickname]) || ('机器人' + (index + 1))),
    avatorUrl: String(firstFilledValue([profile.avatar, profile.avatorUrl])),
    score: Number.isFinite(score) ? score : 0,
  };
}

function getSupplementalRobotProfiles(loginObj, maxCount) {
  if (!loginObj) {
    return [];
  }

  let rawProfiles = parseRobotProfiles(loginObj.robots);
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    rawProfiles = parseRobotProfiles(parseQueryValue(loginObj.lanuch_url, 'robots'));
  }
  if (!Array.isArray(rawProfiles) || rawProfiles.length === 0) {
    return [];
  }

  const currentUid = loginObj.uid === undefined || loginObj.uid === null ? '' : String(loginObj.uid);
  const limit = Number.isFinite(parseInt(maxCount, 10)) ? parseInt(maxCount, 10) : DEFAULT_MAX_ROBOT_COUNT;
  return rawProfiles
    .map(normalizeRobotProfile)
    .filter(Boolean)
    .filter((profile) => !currentUid || String(profile.uid) !== currentUid)
    .slice(0, limit);
}

function getSupplementalRobotCount(loginObj, maxCount) {
  if (!loginObj) {
    return 0;
  }
  const robotProfiles = getSupplementalRobotProfiles(loginObj, maxCount);
  if (robotProfiles.length > 0) {
    return robotProfiles.length;
  }
  const count = normalizeRobotCount(loginObj.robot, maxCount);
  if (count > 0) {
    return count;
  }
  return normalizeRobotCount(parseQueryValue(loginObj.lanuch_url, 'robot'), maxCount);
}

module.exports = {
  DEFAULT_MAX_ROBOT_COUNT,
  getSupplementalRobotCount,
  getSupplementalRobotProfiles,
  normalizeRobotCount,
  normalizeRobotProfile,
  parseQueryValue,
  parseRobotProfiles,
};
