"use strict";
cc._RF.push(module, 'b05a68gSOpBWr8ddvT03Jpj', 'Login');
// scripts/Login/Login.js

"use strict";

var _globalData = _interopRequireDefault(require("../globalData.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

cc.Class({
  "extends": cc.Component,
  properties: {
    img_loading: cc.Node,
    lab_tips: cc.Label
  },
  onLoad: function onLoad() {
    this.lab_tips.node.active = false;
    cc.debug.setDisplayStats(false);

    _globalData["default"].socketMgr.initSocket();
  },
  update: function update() {
    this.img_loading.angle = this.img_loading.angle + 10;
  },
  showTips: function showTips(msg) {
    console.log(msg);
    this.lab_tips.node.active = true;
    this.lab_tips.string = msg;
    this.scheduleOnce(function () {
      this.lab_tips.node.active = false;
    }, 2);
  },
  start: function start() {
    var url = decodeURI(window.location.href);

    if (url.split('?').length > 1) {
      var params = url.split('?')[1].split('&');
      var field = {};

      for (var i = 0; i < params.length; i++) {
        var obj = params[i].split('=');
        field[obj[0]] = obj[1];
      }

      cc.args = field;

      _globalData["default"].socketMgr.login(cc.args['uid'], cc.args['name'], decodeURIComponent(cc.args['avatorUrl']), cc.args['score'], cc.args['room'], cc.args['play_mode'], cc.args['game_time'], cc.args['specific_score'], function () {
        cc.director.loadScene("Game");
      });
    }
  }
});

cc._RF.pop();