const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const robotServerDirs = [
  '001/gobang_server',
  '002/doudizhu_server',
  '003/uno_server',
  '005/china_chess_server',
  '006/flychess_server',
];

function copyServerOnly(sourceDir, targetDir) {
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    filter(sourcePath) {
      return !sourcePath.split(path.sep).includes('node_modules');
    },
  });
}

test('robot-enabled servers keep robot profile parsing inside each game server', () => {
  assert.equal(
    fs.existsSync(path.join(repoRoot, 'common', 'robot_profiles.js')),
    false,
    'robot profile parsing must not live in a repository-level common module',
  );

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'money2-independent-server-'));
  try {
    for (const serverDir of robotServerDirs) {
      const sourceDir = path.join(repoRoot, serverDir);
      const targetDir = path.join(tempRoot, serverDir);
      copyServerOnly(sourceDir, targetDir);

      assert.equal(
        fs.existsSync(path.join(targetDir, 'robot_profiles.js')),
        true,
        `${serverDir} should package robot_profiles.js with its own server files`,
      );

      const robot = require(path.join(targetDir, 'robot.js'));
      const robots = [
        { id: 'robot-a', name: 'robot1', avatar: 'https://example.com/a.png', score: 100 },
        { id: 'robot-b', name: 'robot2', avatar: 'https://example.com/b.png', score: 200 },
      ];
      const profiles = robot.getSupplementalRobotProfiles({
        lanuch_url: `https://example.com/game?robots=${encodeURIComponent(JSON.stringify(robots))}`,
      });

      assert.equal(profiles.length, 2);
      assert.equal(profiles[0].uid, 'robot-a');
      assert.equal(profiles[0].name, 'robot1');
      assert.equal(profiles[0].avatorUrl, 'https://example.com/a.png');
      assert.equal(robot.getSupplementalRobotCount({ robot: 3, lanuch_url: '' }), 3);
    }
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
