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
    lab_tips: cc.Label,
    lab_debug: cc.Label
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
    this.lab_debug.string += msg;
  },
  start: function start() {
    console.log("启动参数：" + window.location.href);
    this.lab_debug.string = "启动参数：" + window.location.href;
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
      cc.director.preloadScene("Game", function () {
        if (defines.isDebug || defines.serverUrl == 'www.g-xinyi1313.cn') {
          _globalData["default"].socketMgr.login(cc.args['uid'], cc.args['name'], cc.args['avatorUrl'], cc.args['score'], cc.args['room'], cc.args['ready_count'], cc.args['game_time'], cc.args['specific_score'], cc.args['ob_uid'], function () {
            cc.director.loadScene("Game");
          });
        } else {
          console.log("开始请求用户信息：");

          _globalData["default"].utils.post(defines.yc_domain + "/client/alchemy/callback/checkSign", {
            sign: cc.args['sign']
          }, function (isOk, data) {
            if (isOk) {
              console.log("用户信息：", data);

              _globalData["default"].socketMgr.login(data.data.userId, data.data.nickname, data.data.avatar, cc.args['score'], cc.args['room'], cc.args['ready_count'], cc.args['game_time'], cc.args['specific_score'], cc.args['ob_uid'], function () {
                cc.director.loadScene("Game");
              });
            } else {
              that.lab_debug.string += JSON.stringify(data);
            }
          });
        }
      });
    }
  }
});

cc._RF.pop();