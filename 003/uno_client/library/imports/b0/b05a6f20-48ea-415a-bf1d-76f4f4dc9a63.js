"use strict";
cc._RF.push(module, 'b05a68gSOpBWr8ddvT03Jpj', 'Login');
// scripts/Login/Login.js

"use strict";

var _globalData = _interopRequireDefault(require("../globalData.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

cc.Class({
  "extends": cc.Component,
  properties: {},
  onLoad: function onLoad() {
    cc.debug.setDisplayStats(false);

    _globalData["default"].socketMgr.initSocket();
  },
  start: function start() {
    console.log("启动参数：" + window.location.href);
    var url = decodeURI(window.location.href);

    if (url.split('?').length > 1) {
      var params = url.split('?')[1].split('&');
      var field = {};

      for (var i = 0; i < params.length; i++) {
        var obj = params[i].split('=');
        field[obj[0]] = obj[1];
      }

      var that = this;
      cc.args = field;
      cc.args['lanuch_url'] = window.location.href;
    }
  }
});

cc._RF.pop();