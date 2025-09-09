"use strict";
cc._RF.push(module, 'cf22aez0/xDaaC1kRqxn/pw', 'Game');
// scripts/Game/Game.js

"use strict";

var _globalData = _interopRequireDefault(require("../globalData"));

var _PanelAvators = _interopRequireDefault(require("../../Prefab/PanelAvators"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

cc.Class({
  "extends": cc.Component,
  properties: {
    lab_roomid: cc.Label,
    btn_ready: cc.Node,
    panel_score: cc.Node,
    //绑定玩家座位,下面有3个子节点
    players_seat: cc.Node,
    _player_list: [],
    _out_cards: [],
    img_deck: cc.Node,
    panel_ctrl: cc.Node,
    card: cc.Prefab,
    panel_tip: cc.Node,
    panel_color: cc.Node,
    card_color: cc.Sprite,
    lab_tips: cc.Label,
    btn_quit: cc.Node,
    clock: cc.Node,
    btn_score: cc.Node,
    _cur_score_idx: 0,
    // img_uno:cc.Node,
    sp_color1: cc.SpriteFrame,
    sp_color2: cc.SpriteFrame,
    sp_color3: cc.SpriteFrame,
    sp_color4: cc.SpriteFrame,
    sp_clock_color1: cc.SpriteFrame,
    sp_clock_color2: cc.SpriteFrame,
    sp_clock_color3: cc.SpriteFrame,
    sp_clock_color4: cc.SpriteFrame,
    panel_continue: cc.Node,
    globalAnim: cc.Animation,
    lab_warninig: cc.Node,
    lab_items: cc.Node,
    audioTpl: cc.Prefab,
    panel_loading: cc.Node,
    panel_avators: _PanelAvators["default"] // btn_score_close:cc.Node,

  },
  onLoad: function onLoad() {
    var that = this;
    this._player_list['self'] = cc.find('seat_node_1', this.players_seat);
    this._player_list['left'] = cc.find('seat_node_2', this.players_seat);
    this._player_list['top'] = cc.find('seat_node_3', this.players_seat);
    this._player_list['right'] = cc.find('seat_node_4', this.players_seat);
    this._player_list['self'].active = false;
    this._player_list['left'].active = false;
    this._player_list['top'].active = false;
    this._player_list['right'].active = false;
    this._initCardColorPos = this.card_color.node.position;
    this.img_deck.active = false;
    this.renderRoom();

    _globalData["default"].eventlister.on('PREPARE_SUCCESS', function (posId) {
      //准备成功
      that.panel_avators.render();
      that.renderRoom();
      that.renderPlayer();
    });

    _globalData["default"].eventlister.on('SIT_CHANGE', function () {
      that.panel_ctrl.active = false;
      that.panel_avators.render();
      that.renderPlayer();
    });

    _globalData["default"].eventlister.on("GAME_START", function (data) {
      that.reset();
      that.pushCardToDesk(data.top, -1);
      that.img_deck.active = true;
      that.btn_quit.active = false;
      that.panel_continue.active = false;
      that.card_color.node.active = false;
      that.panel_avators.node.active = false;
      that.renderPlayer();
      that.hideSelectColor();
      that.renderRoom();
    });

    _globalData["default"].eventlister.on("PLAY_CARD_SUCCESS", function (data) {
      that.pushCardToDesk(data.card, data.posId);
      that.renderPlayer();
    });

    _globalData["default"].eventlister.on('GAME_OVER', function (data) {
      that.renderUI();
      that.renderRoom();
      that.renderPlayer();

      if (_globalData["default"].gameMgr.is_quit || data.invalid == 1) {
        //有人逃跑
        that.panel_continue.active = false;
        that.onBtnCurScore();

        if (!_globalData["default"].gameMgr.isRecover) {
          cc.playEffect("sound/win", false, 1);
        }
      } else {
        that.panel_continue.active = true;
      }
    });

    _globalData["default"].eventlister.on("MESSAGE", function (msg) {
      that.showTips(msg);
    });

    _globalData["default"].eventlister.on('CHANGE_TURN', function () {
      that.renderUI();
      that.renderPlayer();
    });

    _globalData["default"].eventlister.on('PLUS_CARD', function (data) {
      that.makeMarkOutCard();
      that.pushCardToPlayer(data);
    });

    _globalData["default"].eventlister.on('SHOW_SELECT_COLOR', function (data) {
      that.showSelectColor(data);
    });

    _globalData["default"].eventlister.on('HIDE_SELECT_COLOR', function () {
      that.hideSelectColor();
    });

    _globalData["default"].eventlister.on("SHOW_CARD_COLOR", function (color) {
      that.showCardColor(color);
    });

    _globalData["default"].eventlister.on("HIDE_CARD_COLOR", function () {
      that.hideCardColor();
    });

    _globalData["default"].eventlister.on("CONNECT_STATE", function (data) {
      that.renderPlayer();
    });

    _globalData["default"].eventlister.on("LOGIN_SUCCESS", function () {
      that.panel_loading.active = false;
      that.panel_avators.render();
      that.renderPlayer();
    });

    _globalData["default"].eventlister.on("SET_RECOVER_STATUS", function () {
      if (_globalData["default"].gameMgr.isRecover == false) {
        that.panel_loading.active = false;
      }
    });

    var audioObj = cc.instantiate(this.audioTpl);
    audioObj.parent = that.node;
    cc.audioObj = audioObj; // 监听游戏回到前台事件

    cc.game.targetOff(that);
    cc.game.on(cc.game.EVENT_SHOW, function () {
      if (!cc.audioObj) {
        var audioObj = cc.instantiate(that.audioTpl);
        audioObj.parent = that.node;
        cc.audioObj = audioObj;
      }

      if (cc.isPlayingGlobalBg === 0) {
        cc.audioObj.getComponent(cc.AudioSource).stop();
      }
    }, that);
    cc.game.on(cc.game.EVENT_HIDE, function () {
      if (cc.audioObj) {
        cc.audioObj.destroy();
        cc.audioObj = null;
      }
    }, that);
  },
  update: function update() {
    var now = Math.floor(Date.parse(new Date()) / 1000);
    var timer_value = _globalData["default"].gameMgr.playerData.self.target_timer_value - now;

    if (timer_value >= 0) {
      if (_globalData["default"].gameMgr.roomState.state == 1) {
        this.clock.getComponent(cc.ProgressBar).progress = (30 - timer_value) / 30;
        this.clock.getChildByName('label').getComponent(cc.Label).string = timer_value;
        this.clock.getComponent(cc.Sprite).spriteFrame = this['sp_clock_color' + _globalData["default"].gameMgr.cur_out_color];
        this.isExecuteAutoPlay = false;

        if (timer_value == 0) {
          _globalData["default"].gameMgr.playerData.self.target_timer_value = 0; //     if(globalData.gameMgr.playerData.self.posId == globalData.gameMgr.playerData.turn){
          //         //检查是否最后一张
          //         var cards = globalData.gameMgr.playerData.self.cards;
          //         if(cards.length == 1 && cards[0].type == 2){
          //             //直接pass
          //             this.onBtnPass();
          //         }else{
          //             if (this.onBtnTips()) {
          //                 this.onBtnPlayCard();
          //             } else {
          //                 this.onBtnPass();
          //             }
          //         }
          //     }
        }
      }
    }

    this.renderRoomTitle();
  },
  onBtnCurScore: function onBtnCurScore() {
    this._cur_score_idx = _globalData["default"].gameMgr.score_list.length - 1;
    this.renderScorePanel();
  },
  onBtnLastScore: function onBtnLastScore() {
    this._cur_score_idx = Math.max(0, this._cur_score_idx - 1);
    this.renderScorePanel();
  },
  onBtnTips: function onBtnTips() {
    return this._onBtnTips();
  },
  _onBtnTips: function _onBtnTips() {
    var only_check = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    if (this._out_cards.length <= 0) {
      return false;
    }

    var card = this._out_cards[this._out_cards.length - 1].getComponent('Card')._data;

    return this._player_list['self'].getComponent('Player').selectTips(card, only_check);
  },
  onBtnReady: function onBtnReady() {
    _globalData["default"].socketMgr.prepare();
  },
  onBtnPass: function onBtnPass() {
    var cards = _globalData["default"].gameMgr.playerData.self.cards;

    if (!this._onBtnTips(true) || cards.length == 1 && cards[0].type == 2) {
      _globalData["default"].gameMgr.playerData.self.target_timer_value = 0;

      _globalData["default"].socketMgr.passCard();

      this.hideSelectColor();
      this.showTips("无牌可出，摸牌跳过");
    } else {
      this.showTips("需要打出合法牌");
    }
  },
  onBtnPlayCard: function onBtnPlayCard() {
    this._player_list['self'].getComponent('Player').playCard();

    this.hideSelectColor();
  },
  onBtnShowScore: function onBtnShowScore() {
    this.panel_score.active = true;
    this.onBtnLastScore();
  },
  onBtnHideScore: function onBtnHideScore() {
    this.panel_score.active = false;
  },
  onBtnSelectColor: function onBtnSelectColor(event, customEventData) {
    var btn = event.target;
    cc.find('frame_select', btn.parent).position = btn.position;
    _globalData["default"].gameMgr.playerData.curSelectColor = parseInt(customEventData);
    this.panel_color.getComponent("PlaneColor").selectCardAnim(parseInt(customEventData));
  },
  renderUI: function renderUI() {
    this.panel_ctrl.active = _globalData["default"].gameMgr.roomState.state == 1 && !_globalData["default"].gameMgr.is_ob && _globalData["default"].gameMgr.playerData.self.posId == _globalData["default"].gameMgr.playerData.turn; //更新倒计时闹钟颜色
  },
  renderRoomTitle: function renderRoomTitle() {
    var distance = _globalData["default"].gameMgr.roomState.gametime_remain - Date.parse(new Date()) / 1000;
    this.lab_roomid.string = "局数:" + _globalData["default"].gameMgr.play_index + "  特定分数:" + cc.args['specific_score'];

    if (distance > 0) {
      var minutes = Math.floor(distance % (60 * 60) / 60);
      var seconds = Math.floor(distance % 60);
      this.lab_roomid.string += " 倒计时:" + minutes + "分 " + seconds + "秒 ";
    }
  },
  renderRoom: function renderRoom() {
    this.renderRoomTitle();
    this.btn_ready.active = (_globalData["default"].gameMgr.roomState.state == 0 || _globalData["default"].gameMgr.roomState.state == 2) && _globalData["default"].gameMgr.playerData.self.state < 2 && !_globalData["default"].gameMgr.is_ob;
    var isQuit = _globalData["default"].gameMgr.is_quit && _globalData["default"].gameMgr.roomState.state == 2 && !_globalData["default"].gameMgr.is_ob;
    this.btn_quit.active = false; // this.btn_score.active = globalData.gameMgr.score_list.length > 0;

    this.btn_score.active = false; //发送退出游戏事件

    if (isQuit) {
      window.parent.postMessage({
        'quitGame': 1
      }, "*");
      console.log("发送退出事件");
    }
  },
  renderPlayer: function renderPlayer() {
    // 刷新玩家头像
    this._player_list['self'].getComponent("Player").render(_globalData["default"].gameMgr.playerData.self, 'self');

    this._player_list['left'].getComponent("Player").render(_globalData["default"].gameMgr.playerData.left, 'left');

    this._player_list['top'].getComponent("Player").render(_globalData["default"].gameMgr.playerData.top, 'top');

    this._player_list['right'].getComponent("Player").render(_globalData["default"].gameMgr.playerData.right, 'right');
  },
  renderRemainCard: function renderRemainCard() {
    this.img_deck.getChildByName("label").getComponent(cc.Label).string = _globalData["default"].gameMgr.card_remain;
  },
  pushCardToDesk: function pushCardToDesk(card, posId) {
    //记录当前出牌颜色、类型、位置
    _globalData["default"].gameMgr.cur_out_color = card.color;
    _globalData["default"].gameMgr.cur_out_value = card.value;
    _globalData["default"].gameMgr.cur_out_posId = posId;
    var out_pos = cc.find("out_pos", this.node).position;
    var deck_pos = this.img_deck.position;
    var node = cc.instantiate(this.card);
    node.parent = this.node.getChildByName('players_seat').getChildByName("card_container");

    function getRandomArbitrary(min, max) {
      return Math.random() * (max - min) + min;
    }

    node.angle = getRandomArbitrary(-10, 10);
    var that = this;

    this._out_cards.push(node);

    var offsetX = getRandomArbitrary(-30, 30);
    var offsetY = getRandomArbitrary(-30, 30);
    var actions = [cc.delayTime(0.15), cc.moveTo(0.2, cc.v2(out_pos.x + offsetX, out_pos.y + offsetY))]; //初始牌

    if (posId == -1) {
      //无动画
      if (_globalData["default"].gameMgr.isRecover) {
        node.getComponent("Card").render(card);
        node.position = cc.v2(out_pos.x + offsetX, out_pos.y + offsetY); // 轮到自己

        if (_globalData["default"].gameMgr.playerData.turn == _globalData["default"].gameMgr.playerData.self.posId) {
          if (!that._onBtnTips(true)) {
            that.onBtnPass();
          }
        } //有动画

      } else {
        node.position = deck_pos;
        actions.push(cc.callFunc(function () {
          node.getComponent("Card").render(card); // 轮到自己

          if (_globalData["default"].gameMgr.playerData.turn == _globalData["default"].gameMgr.playerData.self.posId) {
            if (!that._onBtnTips(true)) {
              that.onBtnPass();
            }
          }
        }, that));
        node.runAction(cc.sequence(actions));
      }

      _globalData["default"].gameMgr.card_remain--;
      this.renderRemainCard();
    } else {
      //无动画
      if (_globalData["default"].gameMgr.isRecover) {
        node.getComponent("Card").render(card);
        node.getComponent("Card").checkShowColor();
        that.checkRedundanceCard();
        node.position = cc.v2(out_pos.x + offsetX, out_pos.y + offsetY); // 轮到自己

        if (_globalData["default"].gameMgr.playerData.turn == _globalData["default"].gameMgr.playerData.self.posId) {
          if (!that._onBtnTips(true)) {
            that.onBtnPass();
          }
        }
      } else {
        //有动画
        node.getComponent("Card").render(card);
        actions.push(cc.callFunc(function () {
          node.getComponent("Card").checkShowColor();
          that.checkRedundanceCard(); // 轮到自己

          if (_globalData["default"].gameMgr.playerData.turn == _globalData["default"].gameMgr.playerData.self.posId) {
            if (!that._onBtnTips(true)) {
              that.onBtnPass();
            }
          }
        }, that));
        if (_globalData["default"].gameMgr.getPlayerDataKey(posId)) node.position = this._player_list[_globalData["default"].gameMgr.getPlayerDataKey(posId)].position;
        node.runAction(cc.sequence(actions));
      }
    }

    console.log("card.value：", card.value); //播放全局动画

    if (card.value == 'plus4') {
      this.showGlobalEffect("anim+4");
    } else if (card.value == 'plus2') {
      this.showGlobalEffect("anim+2");
    } else if (card.value == 'turn') {
      this.showGlobalEffect("anim_turn");
    } else if (card.value == 'stop') {
      this.showGlobalEffect("anim_stop");
    }

    if (!_globalData["default"].gameMgr.isRecover) {
      cc.playEffect("sound/play_card", false, 1);
    }
  },
  pushCardToPlayer: function pushCardToPlayer(data) {
    var _this = this;

    var deck_pos = this.img_deck.position;

    var moveTo = this._player_list[_globalData["default"].gameMgr.getPlayerDataKey(data.posId)].position;

    var that = this;
    var plus_nodes = [];

    var _loop = function _loop(i) {
      //无动画
      if (_globalData["default"].gameMgr.isRecover) {
        if (i == data.plus_num - 1) {
          that.renderPlayer(); // 轮到自己

          if (_globalData["default"].gameMgr.playerData.turn == _globalData["default"].gameMgr.playerData.self.posId) {
            if (!that._onBtnTips(true)) {
              that.onBtnPass();
            }
          }
        } //有动画

      } else {
        node = cc.instantiate(_this.card);
        node.parent = _this.node.getChildByName("players_seat").getChildByName("card_container");
        node.position = deck_pos;
        plus_nodes.push(node);
        node.runAction(cc.sequence([cc.delayTime(0.15 * (i - 1)), cc.moveTo(0.2, moveTo), cc.callFunc(function (selector, selectorTarget, _data) {
          if (i == data.plus_num - 1) {
            that.renderPlayer(); // 轮到自己

            if (_globalData["default"].gameMgr.playerData.turn == _globalData["default"].gameMgr.playerData.self.posId) {
              if (!that._onBtnTips(true)) {
                that.onBtnPass();
              }
            }
          }

          selector.destroy();
        }, that)]));
      }
    };

    for (var i = 0; i < data.plus_num; i++) {
      var node;

      _loop(i);
    }

    this.renderRemainCard();
  },
  makeMarkOutCard: function makeMarkOutCard() {
    for (var i = 0; i < this._out_cards.length; i++) {
      var data = this._out_cards[i].getComponent('Card')._data;

      if (data) {
        var value = data.value;

        if (value == 'plus4' || value == 'plus2') {
          data.mark = true;
        }
      }
    }
  },
  //回收多余的卡
  checkRedundanceCard: function checkRedundanceCard() {
    if (this._out_cards.length > 10) {
      var that = this;

      var card = this._out_cards.shift();

      card.active = false; //无动画

      if (_globalData["default"].gameMgr.isRecover) {
        card.destroy();
      } else {
        card.runAction(cc.sequence([cc.delayTime(0.15), cc.callFunc(function (selector, selectorTarget, _data) {
          selector.destroy();
        }, that)]));
      }
    }
  },
  showSelectColor: function showSelectColor() {
    this.panel_color.active = true;
    this.panel_color.getComponent("PlaneColor").playAnim(true);
    this.panel_color.getChildByName('frame_select').position = this.panel_color.getChildByName('btn_color1').position;
    _globalData["default"].gameMgr.playerData.curSelectColor = 1;
  },
  hideSelectColor: function hideSelectColor() {
    this.panel_color.active = false;
  },
  showCardColor: function showCardColor(color) {
    //当前颜色
    this._cur_out_color = color;
    this.card_color.spriteFrame = this['sp_color' + color];
    this.card_color.node.active = true; //无动画

    if (_globalData["default"].gameMgr.isRecover) {
      this.card_color.node.position = this._initCardColorPos;
    } else {
      //有动画
      this.card_color.node.position = cc.v2(-50, 136);
      this.card_color.node.stopAllActions();
      this.card_color.node.runAction(cc.moveTo(0.4, this._initCardColorPos));
    }
  },
  hideCardColor: function hideCardColor() {
    this.card_color.node.active = false;
  },
  showTips: function showTips(msg) {
    this.panel_tip.active = true;
    this.lab_tips.string = msg;
    this.scheduleOnce(function () {
      this.panel_tip.active = false;
    }, 1);
  },
  showGlobalEffect: function showGlobalEffect(data) {
    //无动画
    if (!_globalData["default"].gameMgr.isRecover) {
      this.globalAnim.node.active = true;
      this.globalAnim.play(data);
      var that = this;
      this.scheduleOnce(function () {
        that.globalAnim.node.active = false;
      }, 1);
    }
  },
  renderScorePanel: function renderScorePanel() {
    this.panel_score.active = !_globalData["default"].gameMgr.isRecover;
    var data = _globalData["default"].gameMgr.score_list[this._cur_score_idx]; //有玩家逃跑 无效回合

    if (data.invalid == 1) {
      this.lab_warninig.active = true;
      this.lab_items.active = false;
      this.panel_loading.active = false;
      console.log("this.panel_loading.active false");
    } else {
      this.lab_warninig.active = false;
      this.lab_items.active = true;

      for (var i = 0; i < 4; i++) {
        var label = this.panel_score.getChildByName('items').getChildByName('label' + i);

        if (data.score_list[i] && _globalData["default"].gameMgr.getPlayerData(i)) {
          label.active = true;
          var option = i == data.winer ? "+" : "-";
          label.getComponent(cc.Label).string = _globalData["default"].gameMgr.getPlayerData(i).name + " " + option + data.score_list[i] + "分";
        } else {
          label.active = false;
        }
      }
    }
  },
  reset: function reset() {
    for (var i = 0; i < this._out_cards.length; i++) {
      this._out_cards[i].destroy();
    }

    this._out_cards = [];

    this._player_list['self'].getComponent("Player").reset();

    this._player_list['left'].getComponent("Player").reset();

    this._player_list['top'].getComponent("Player").reset();

    this._player_list['right'].getComponent("Player").reset();
  }
});

cc._RF.pop();