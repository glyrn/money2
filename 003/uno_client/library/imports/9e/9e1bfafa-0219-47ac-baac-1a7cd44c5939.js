"use strict";
cc._RF.push(module, '9e1bfr6AhlHrLqsGnzUTFk5', 'Player');
// scripts/Game/prefabs/Player.js

"use strict";

var _globalData = _interopRequireDefault(require("../../globalData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

cc.Class({
  "extends": cc.Component,
  properties: {
    card: cc.Prefab,
    _hand_cards: [],
    tips_index: 0
  },
  name: "Player",
  update: function update() {
    var now = Date.parse(new Date()) / 1000;
    var timer_value = this._data.target_timer_value - now;

    if (this._data && timer_value >= 0) {
      this.clock.getChildByName('label').getComponent(cc.Label).string = timer_value;

      if (timer_value == 0) {
        this._data.target_timer_value = 0;
      }
    }
  },
  render: function render(data, flag) {
    this.avator = this.node.getChildByName('avator').getComponent("Avator");
    this.clock = this.node.getChildByName('clock');
    this.lab_uno = this.node.getChildByName('lab_uno');
    this.tips_index = 0;

    if (data && data.uid > 0) {
      this.node.active = true;
      this._data = data;
      this._flag = flag;
      this.avator.render(data);

      if (data.cards) {
        data.cards.sort(function (a, b) {
          if (a.type && b.type) {
            if (a.type < b.type) {
              return -1;
            } else if (a.type === b.type) {
              if (a.color == b.color) {
                return parseInt(a.value) - parseInt(b.value);
              } else {
                return a.color - b.color;
              }
            } else {
              return 1;
            }
          } else {
            return 0;
          }
        });

        for (var i = 0; i < this._hand_cards.length; i++) {
          this._hand_cards[i].node.active = false;
        }

        for (var _i = 0; _i < data.cards.length; _i++) {
          var card;
          var basePos = cc.find("card_pos", this.node).position;

          if (this._hand_cards[_i]) {
            card = this._hand_cards[_i];
          } else {
            var node = cc.instantiate(this.card);
            node.parent = this.node;
            card = node.getComponent("Card");

            this._hand_cards.push(card);
          }

          card.node.active = true;

          if (this._flag == 'self') {
            var gap = 55;
            var offsetY = _i > 10 ? -40 : 0;
            var offsetX = _i > 10 ? -gap * 11 : 0;
            card.node.position = cc.v2(basePos.x + _i * gap + offsetX, basePos.y + offsetY);
          } else if (this._flag == 'left') {
            var gap = _i > 12 ? 15 : 30;
            card.node.position = cc.v2(basePos.x, basePos.y + 105 - _i * gap);
          } else if (this._flag == 'top') {
            var gap = _i > 12 ? 15 : 30;
            card.node.position = cc.v2(basePos.x + _i * gap, basePos.y);
          } else if (this._flag == 'right') {
            var gap = _i > 12 ? 15 : 30;
            card.node.position = cc.v2(basePos.x, basePos.y + 105 - _i * gap);
          }

          if (data.cards[_i] == 0) {//旁观者不能看牌
            //牌背
          } else {
            if (this._flag == 'self' && !_globalData["default"].gameMgr.is_ob) {
              //围观不能看牌
              card.setTouchEnable(true);
              card.setPlayer(this);
              card.render(data.cards[_i]);
            }
          }
        }

        var isShowUno = data.cards.length == 1;

        if (this.lab_uno.active == false && isShowUno) {
          _globalData["default"].eventlister.fire("SHOW_UNO");
        }

        this.lab_uno.active = isShowUno;
      }

      if (data.posId == _globalData["default"].gameMgr.playerData.turn && _globalData["default"].gameMgr.roomState.state == 1 && data.posId != _globalData["default"].gameMgr.playerData.self.posId) {
        this.clock.active = true;
      } else {
        this.clock.active = false;
      }
    } else {
      this.node.active = false;

      for (var _i2 = 0; _i2 < this._hand_cards.length; _i2++) {
        this._hand_cards[_i2].node.active = false;
      }
    }
  },
  selectTips: function selectTips(last_card, only_check) {
    // console.log("selectTips",only_check);
    // console.log(last_card);
    if (!last_card) return;

    _globalData["default"].eventlister.fire('HIDE_SELECT_COLOR');

    var findObj = {};

    if (last_card.value == 'plus4' || last_card.value == 'plus2') {
      if (last_card.mark) {
        findObj.type = 1;
      } else {
        findObj.type = 2;
      }
    } else {
      findObj.type = 1;
    }

    var isFind = false;
    var card;
    var tips_cards = [];

    if (findObj.type == 2) {
      if (last_card.value == 'plus4') {
        for (var i = 0; i < this._data.cards.length; i++) {
          if (this._data.cards[i].value == 'plus4') {
            isFind = true;
            card = this._hand_cards[i]; // break;

            tips_cards.push(card);
          }
        }
      } else if (last_card.value == 'plus2') {
        for (var _i3 = 0; _i3 < this._data.cards.length; _i3++) {
          if (this._data.cards[_i3].value == 'plus4' || this._data.cards[_i3].value == 'plus2') {
            isFind = true;
            card = this._hand_cards[_i3]; // break;

            tips_cards.push(card);
          }
        }
      }
    } else if (findObj.type == 1) {
      var _isExist = function _isExist(check) {
        for (var _k in tips_cards) {
          if (tips_cards[_k].value == check.value && tips_cards[_k].color == check.color && tips_cards[_k].type == check.type) {
            return true;
          }
        }

        return false;
      }; //找+4 或者万能牌


      for (var _i4 = 0; _i4 < this._data.cards.length; _i4++) {
        if (this._data.cards[_i4].value == 'color' || this._data.cards[_i4].value == 'plus4') {
          isFind = true;
          card = this._hand_cards[_i4];
          tips_cards.push(card);
        }
      } //找+2


      for (var _i5 = 0; _i5 < this._data.cards.length; _i5++) {
        if (this._data.cards[_i5].color == last_card.color && this._data.cards[_i5].value == 'plus2') {
          isFind = true;
          card = this._hand_cards[_i5];
          tips_cards.push(card);
        }
      } //找功能牌


      for (var _i6 = 0; _i6 < this._data.cards.length; _i6++) {
        if (this._data.cards[_i6].color == last_card.color && this._data.cards[_i6].value != 'plus2' && this._data.cards[_i6].type == 2) {
          isFind = true;
          card = this._hand_cards[_i6];
          tips_cards.push(card);
        }
      } //找颜色牌


      for (var _i7 = this._data.cards.length - 1; _i7 >= 0; _i7--) {
        if (!_isExist(this._data.cards[_i7]) && this._data.cards[_i7].color == last_card.color && this._data.cards[_i7].type == 1) {
          isFind = true;
          card = this._hand_cards[_i7];
          tips_cards.push(card);
        }
      } //找数字牌


      for (var _i8 = this._data.cards.length - 1; _i8 >= 0; _i8--) {
        if (!_isExist(this._data.cards[_i8]) && this._data.cards[_i8].value == last_card.value && this._data.cards[_i8].type == 1) {
          isFind = true;
          card = this._hand_cards[_i8];
          tips_cards.push(card);
        }
      }

      tips_cards.sort(function (a, b) {
        if (a.type && b.type) {
          if (a.type == 1 && b.type == 1) {
            return b.value - a.value;
          }
        }

        return 0;
      });
    }

    if (only_check) {
      return isFind;
    }

    if (isFind) {
      var tip_card = tips_cards[this.tips_index];

      if (tip_card._data.value == 'color' || tip_card._data.value == 'plus4') {
        _globalData["default"].eventlister.fire('SHOW_SELECT_COLOR');
      }

      this.resetCard(tip_card);
      tip_card._data.selected = true;
      tip_card.updatePos();

      if (tips_cards.length - 1 > this.tips_index) {
        this.tips_index++;
      } else {
        this.tips_index = 0;
      }
    } else {
      _globalData["default"].eventlister.fire('MESSAGE', '无牌可出，摸牌跳过');
    }

    console.log(isFind, tips_cards);
    return isFind;
  },
  resetCard: function resetCard(except) {
    for (var i = 0; i < this._hand_cards.length; i++) {
      if (this._hand_cards[i] != except) {
        this._hand_cards[i].resetPos();
      }
    }
  },
  reset: function reset() {
    for (var i = 0; i < this._hand_cards.length; i++) {
      this._hand_cards[i].node.destroy();
    }

    this._hand_cards = [];
  },
  playCard: function playCard() {
    var hasSelect = false;

    if (this._data && this._data.cards) {
      for (var i = 0; i < this._data.cards.length; i++) {
        var card = this._data.cards[i]; //选中的牌

        if (card.selected) {
          hasSelect = true; //选颜色

          if (card.value == 'color' || card.value == 'plus4') {
            card.color = _globalData["default"].gameMgr.playerData.curSelectColor;
          }

          _globalData["default"].socketMgr.playCard(card);
        }
      }

      if (!hasSelect) {
        _globalData["default"].eventlister.fire('MESSAGE', '请选中你要出的牌');
      }
    }
  }
});

cc._RF.pop();