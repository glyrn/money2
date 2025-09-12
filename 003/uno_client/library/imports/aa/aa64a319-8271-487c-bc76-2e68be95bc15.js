"use strict";
cc._RF.push(module, 'aa64aMZgnFIfLx2Lmi+lbwV', 'Avator');
// scripts/Game/prefabs/Avator.js

"use strict";

var _globalData = _interopRequireDefault(require("../../globalData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

cc.Class({
  "extends": cc.Component,
  properties: {
    img_avatar: cc.Sprite,
    lab_name: cc.Label,
    img_ready: cc.Node,
    lab_score: cc.Label,
    img_net_lost: cc.Node
  },
  name: "Avator",
  render: function render(data) {
    if (data === null || data && data.uid === 0) {
      this.node.active = false;
      return;
    }

    this.node.active = true;
    this.img_ready.active = data.state == 2 && _globalData["default"].gameMgr.roomState.state != 1;
    this.img_net_lost.active = data.connect_state == 0;
    this.lab_name.string = _globalData["default"].utils.subStringResult(data.name, 7);
    var offset_txt = '';

    if (data.score_offset > 0) {
      offset_txt = "(+" + data.score_offset + ")";
    } else if (data.score_offset < 0) {
      offset_txt = "(" + data.score_offset + ")";
    }

    this.lab_score.string = data.score + offset_txt + "分";

    if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
      var that = this; // var avatorUrl;
      // if (window.defines.serverUrl == 'localhost:8005') {
      //     avatorUrl = this._avatorUrl;
      // } else {
      //     avatorUrl = 'http://42.51.37.98:8005/avator/' + data.uid + '.jpg'
      // }

      var exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
      var ext = data.avatorUrl.slice(data.avatorUrl.lastIndexOf('.'));
      var is_image = exts.includes(ext.toLowerCase());
      var url = is_image ? data.avatorUrl : data.avatorUrl + '?aa=aa.jpg';
      cc.loader.load(url, function (err, img) {
        if (!err) {
          that._avatorUrl = data.avatorUrl;
          that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
        }
      });
    }
  }
});

cc._RF.pop();