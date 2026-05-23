const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..');
const entryPathCandidates = [
  '001/gobang_client/build-templates/web-mobile/main.js',
  '001/gobang_client/build/web-mobile/main.83d38.js',
  '002/doudizhu_client/build-templates/web-mobile/main.js',
  '002/doudizhu_client/build/web-mobile/main.cdb7a.js',
  '003/uno_client/build-templates/web-mobile/main.js',
  '003/uno_client/build/web-mobile/main.d474f.js',
  '005/china_chess_client/build-templates/web-mobile/main.js',
  '005/china_chess_client/build/web-mobile/main.80b6e.js',
  '006/flychess_client/build-templates/web-mobile/main.js',
  '006/flychess_client/build/web-mobile/main.e5262.js',
];
const entryPaths = entryPathCandidates.filter((entryPath) => fs.existsSync(path.join(repoRoot, entryPath)));

function createDocument() {
  const elements = {};
  function createElement() {
    return {
      style: {},
      querySelector() {
        return { style: {} };
      },
    };
  }
  return {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement();
      }
      return elements[id];
    },
  };
}

function createSettings() {
  return {
    assetTypes: ['cc.Texture2D'],
    bundleVers: {},
    collisionMatrix: [],
    debug: false,
    groupList: [],
    hasResourcesBundle: true,
    jsList: ['plugin.js'],
    launchScene: 'db://assets/start.fire',
    md5AssetsMap: {},
    orientation: 'landscape',
    packedAssets: { pack: [0] },
    rawAssets: { assets: { 0: [0, 0] } },
    remoteBundles: [],
    scenes: [{ uuid: 0 }],
    server: '',
    subpackages: {},
    uuids: ['scene-uuid'],
  };
}

function createLegacyCc(record) {
  return {
    AssetLibrary: {
      init(options) {
        record.assetLibraryInit = options;
      },
    },
    debug: {
      DebugMode: {
        ERROR: 0,
        INFO: 1,
      },
    },
    director: {
      loadScene(scene, callback) {
        record.loadedScene = scene;
        callback(null);
      },
      once() {},
    },
    Director: {
      EVENT_AFTER_SCENE_LAUNCH: 'after-scene-launch',
    },
    game: {
      run(option, onStart) {
        record.gameRunOption = option;
        onStart();
      },
    },
    loader: {
      downloader: {},
      onProgress: null,
    },
    macro: {
      DOWNLOAD_MAX_CONCURRENT: 0,
      ORIENTATION_LANDSCAPE: 1,
      ORIENTATION_PORTRAIT: 2,
    },
    sys: {
      BROWSER_TYPE_BAIDU: 'baidu',
      BROWSER_TYPE_BAIDU_APP: 'baidu-app',
      BROWSER_TYPE_HUAWEI: 'huawei',
      BROWSER_TYPE_MIUI: 'miui',
      BROWSER_TYPE_MOBILE_QQ: 'mobile-qq',
      BROWSER_TYPE_UC: 'uc',
      BROWSER_TYPE_WECHAT: 'wechat',
      OS_ANDROID: 'Android',
      browserType: 'chrome',
      isBrowser: true,
      isMobile: false,
      os: 'Other',
    },
    view: {
      enableRetina() {},
      resizeWithBrowserSize() {},
      setOrientation() {},
      enableAutoFullScreen() {},
    },
  };
}

function createAssetManagerCc(record) {
  const cc = createLegacyCc(record);
  cc.AssetManager = {
    BuiltinBundleName: {
      INTERNAL: 'internal',
      MAIN: 'main',
      RESOURCES: 'resources',
    },
  };
  cc.assetManager = {
    bundles: {
      find() {
        return {
          getSceneInfo() {
            return true;
          },
          loadScene(scene, options, onProgress, callback) {
            record.assetManagerLoadedScene = scene;
            callback(null, { name: scene });
          },
        };
      },
    },
    downloader: {},
    init(options) {
      record.assetManagerInit = options;
    },
    loadBundle(name, callback) {
      record.loadedBundles.push(name);
      callback(null);
    },
    loadScript(scripts, callback) {
      record.loadedScripts = scripts;
      callback(null);
    },
  };
  cc.director.runSceneImmediate = function runSceneImmediate(scene) {
    record.runSceneImmediate = scene;
  };
  return cc;
}

function runTemplate(relativePath, cc) {
  const record = {
    loadedBundles: [],
  };
  const context = {
    CC_BUILD: true,
    CC_PHYSICS_BUILTIN: false,
    CC_PHYSICS_CANNON: false,
    console,
    document: createDocument(),
    window: {
      _CCSettings: createSettings(),
    },
    cc: cc(record),
  };
  context.window.window = context.window;
  context.window.document = context.document;
  context.window.cc = context.cc;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'), context, {
    filename: relativePath,
  });
  assert.equal(typeof context.window.boot, 'function');
  context.window.boot();
  return record;
}

for (const entryPath of entryPaths) {
  test(`${entryPath} boots with Cocos Creator 2.3 legacy loader`, () => {
    const record = runTemplate(entryPath, createLegacyCc);
    assert.equal(record.loadedScene, 'db://assets/start.fire');
    assert.equal(record.gameRunOption.jsList.includes('src/project.js'), true);
    assert.ok(record.assetLibraryInit);
  });

  test(`${entryPath} still boots with asset manager loader`, () => {
    const record = runTemplate(entryPath, createAssetManagerCc);
    assert.equal(record.assetManagerLoadedScene, 'db://assets/start.fire');
    assert.deepEqual(record.loadedBundles, ['internal', 'resources', 'main']);
    assert.ok(record.assetManagerInit);
  });
}
