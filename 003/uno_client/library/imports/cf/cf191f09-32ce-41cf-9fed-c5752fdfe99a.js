"use strict";
cc._RF.push(module, 'cf1918JMs5Bz5/txXUv3+ma', 'globalData');
// scripts/globalData.js

"use strict";

exports.__esModule = true;
exports["default"] = void 0;
var _gameMgr = _interopRequireDefault(require("./data/gameMgr.js"));
var _socketMgr = _interopRequireDefault(require("./data/socketMgr.js"));
var _event_lister = _interopRequireDefault(require("./util/event_lister.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
require('./data/audioMgr');
var globalData = {} || globalData;
globalData.gameMgr = (0, _gameMgr["default"])();
globalData.eventlister = (0, _event_lister["default"])({});
globalData.socketMgr = (0, _socketMgr["default"])();
globalData.socketMgr.setGameMgr(globalData.gameMgr);
globalData.socketMgr.setEventlister(globalData.eventlister);
globalData.gameMgr.setSocketMgr(globalData.socketMgr);
globalData.gameMgr.setEventlister(globalData.eventlister);
var _default = globalData;
exports["default"] = _default;
module.exports = exports["default"];

cc._RF.pop();