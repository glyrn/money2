"use strict";
cc._RF.push(module, 'af84cf1KqpGrJLQDz5EO6mu', 'socketMgr');
// scripts/data/socketMgr.js

"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _globalData = _interopRequireDefault(require("../globalData"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var socketMgr = function socketMgr() {
  var that = {};
  var _socket = null;
  var _gameMgr = null;
  var _eventMgr = null;
  var _utils = null;

  var _cbLogin;

  that.setGameMgr = function (gameMgr) {
    _gameMgr = gameMgr;
  };

  that.setEventlister = function (eventMgr) {
    _eventMgr = eventMgr;
  };

  that.setUtils = function (utils) {
    _utils = utils;
  };

  that.loadGameScene = function () {
    _eventMgr.removeAllLister();

    cc.director.preloadScene("Game", function () {}, function () {
      if (defines.isDebug || defines.serverUrl == 'www.g-xinyi1313.cn' || defines.isForce) {
        cc.director.loadScene("Game", function () {
          that.login(cc.args['uid'], cc.args['name'], cc.args['avatorUrl'], cc.args['score'], cc.args['room'], cc.args['ready_count'], cc.args['game_time'], cc.args['specific_score'], cc.args['ob_uid'], function () {});
        });
      } else {
        console.log("开始请求用户信息：");

        _utils.post(defines.yc_domain + "/client/alchemy/callback/checkSign", {
          sign: cc.args['sign']
        }, function (isOk, data) {
          if (isOk) {
            console.log("用户信息：", data);
            cc.director.loadScene("Game", function () {
              that.login(data.data.userId, data.data.nickname, data.data.avatar, cc.args['score'], cc.args['room'], cc.args['ready_count'], cc.args['game_time'], cc.args['specific_score'], cc.args['ob_uid'], function () {});
            });
          }
        });
      }
    });
  };

  that.initSocket = function () {
    var opts = {
      'reconnection': true,
      'reconnectionDelay': 1000,
      'maxReconnectionAttempts': 100,
      'force new connection': true,
      'transports': ['websocket', 'polling']
    };
    var protocol = '';

    if (defines.isDebug) {
      protocol = 'ws://';
    } else {
      opts['path'] = '/uno_socket.io';
      protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    }

    console.log("defines.serverUrl:" + defines.serverUrl);
    console.log(protocol + defines.serverUrl);
    _socket = window.io.connect(protocol + defines.serverUrl, opts);

    _socket.on('connect', function () {
      console.log('Connected to the server!');
      that.loadGameScene();
    });

    _socket.on('connect_error', function (error) {
      console.error('Connection error:', error);
    });

    _socket.on('connect_timeout', function (timeout) {
      console.error('Connection timeout:', timeout);
    });

    _socket.on('ping', function (data) {
      //心跳
      _socket.emit('pong', {
        beat: 1
      });

      _gameMgr.lossBeatNums--;
    });

    _socket.on("MESSAGE", function (msg) {
      _eventMgr.fire('MESSAGE', msg);

      console.log("MESSAGE:" + msg);
    });

    _socket.on("SET_RECOVER_STATUS", function (data) {
      _gameMgr.isRecover = data.isRecover;
      console.log("收到SET_RECOVER_STATUS", _gameMgr.isRecover);

      _eventMgr.fire("SET_RECOVER_STATUS");
    });

    _socket.on('PREPARE_SUCCESS', function (data) {
      var posId = data.posId;
      _gameMgr.getPlayerData(posId).state = 2;
      _gameMgr.getPlayerData(posId).target_timer_value = parseInt(data.server_time) + _gameMgr.roomState.timeout;

      _eventMgr.fire('PREPARE_SUCCESS', posId);
    });

    _socket.on("LOGIN_SUCCESS", function (data) {
      _gameMgr.roomId = data.roomId;
      _gameMgr.server_time = data.server_time;
      var playerData = data.playerData;

      _gameMgr.reset();

      for (var i = 0; i < playerData.length; i++) {
        if (playerData[i]) {
          var key = _gameMgr.getPlayerDataKey(playerData[i].posId, data.posId);

          console.log("key:", key, data.posId);
          _gameMgr.playerData[key] = playerData[i];
        }
      }

      _gameMgr.play_index = 0;
      var now = Math.floor(new Date().getTime() / 1000);
      _gameMgr.diff_time = now - data.server_time; // _gameMgr.checkBeat();

      _eventMgr.fire("LOGIN_SUCCESS");

      if (_cbLogin) {
        _cbLogin();
      }
    });

    _socket.on("SIT_CHANGE", function (data) {
      _gameMgr.setPlayerData(data.posId, data.target); //对手逃跑 重置游戏


      if (data.target == null) {
        _gameMgr.roomState.gametime_remain = 0;
        _gameMgr.roomState.state = 0;
        _gameMgr.play_index = 0;
        _gameMgr.playerData.self.state = 1;
        if (_gameMgr.playerData.left) _gameMgr.playerData.left.state = 1;
        if (_gameMgr.playerData.right) _gameMgr.playerData.right.state = 1;
        if (_gameMgr.playerData.top) _gameMgr.playerData.top.state = 1;
      }

      _eventMgr.fire("SIT_CHANGE", data);
    });

    _socket.on('GAME_START', function (data) {
      var _cc$args$game_time;

      _gameMgr.roomState.state = 1; //进行中

      _gameMgr.getPlayerData(data.turn).target_timer_value = parseInt(data.server_time) + _gameMgr.roomState.timeout;
      _gameMgr.server_time = parseInt(data.server_time);
      _gameMgr.playerData.turn = data.turn;
      _gameMgr.card_remain = 108;
      _gameMgr.roomState.gametime_remain = parseInt(data.server_time) + parseInt((_cc$args$game_time = cc.args['game_time']) !== null && _cc$args$game_time !== void 0 ? _cc$args$game_time : 4) * 60; //更新分数

      for (var posId in [0, 1, 2, 3]) {
        if (_gameMgr.getPlayerData(posId)) {
          _gameMgr.getPlayerData(posId).score_offset = 0;
        }
      }

      _gameMgr.play_index++;
      _gameMgr.playerData.self.cards = data.cards;
      if (_gameMgr.playerData.left) _gameMgr.playerData.left.cards = [0, 0, 0, 0, 0, 0, 0];
      if (_gameMgr.playerData.top) _gameMgr.playerData.top.cards = [0, 0, 0, 0, 0, 0, 0];
      if (_gameMgr.playerData.right) _gameMgr.playerData.right.cards = [0, 0, 0, 0, 0, 0, 0];

      _eventMgr.fire("GAME_START", data);

      _eventMgr.fire('CHANGE_TURN');
    });

    _socket.on("SYNC_SERVER_TIME", function (data) {
      _gameMgr.server_time = data.server_time;
    });

    _socket.on('GAME_OVER', function (data) {
      _gameMgr.roomState.state = 2;
      _gameMgr.roomState.gametime_remain = 0;
      _gameMgr.diff_time = 0;
      _gameMgr.ready_target_time = parseInt(_gameMgr.server_time) + 5;
      _gameMgr.is_quit = data.is_quit;

      for (var i in data.score_list) {
        var playerData = _gameMgr.getPlayerData(i);

        if (playerData) {
          playerData.state = 1;
          playerData.score = data.score_list[i];
          playerData.score_offset = data.score_offset[i];
          playerData.cards = data.cards_list[i];
        }
      }

      _gameMgr.score_list = data.score_list;

      _eventMgr.fire("GAME_OVER", data);
    });

    _socket.on('PLAY_CARD_SUCCESS', function (data) {
      _globalData["default"].gameMgr.playerData.self.target_timer_value = 0; //剔除

      if (data.posId == _gameMgr.playerData.self.posId) {
        var new_cards = [];
        var is_del = false;

        for (var i = 0; i < _gameMgr.playerData.self.cards.length; i++) {
          var _card = _gameMgr.playerData.self.cards[i];

          if (!is_del && (_card.value == data.card.value && _card.color == data.card.color || _card.value == data.card.value && _card.value == 'color' || _card.value == data.card.value && _card.value == 'plus4')) {
            is_del = true;
            continue;
          } else {
            new_cards.push(_card);
          }
        }

        _gameMgr.playerData.self.cards = new_cards;
      } else {
        //扣一张
        _gameMgr.getPlayerData(data.posId).cards.shift();
      }

      _gameMgr.getPlayerData(data.nextPosId).target_timer_value = parseInt(data.server_time) + _gameMgr.roomState.timeout;

      _eventMgr.fire('PLAY_CARD_SUCCESS', data);

      _gameMgr.playerData.turn = data.nextPosId;

      _eventMgr.fire('CHANGE_TURN');
    });

    _socket.on('PLAY_PASS_SUCCESS', function (data) {
      console.log("手牌增加：", data.plus_cards);

      for (var i = 0; i < data.plus_cards.length; i++) {
        var card = data.plus_cards[i];

        if (!_gameMgr.isRecover) {
          card.isNew = true;
        }

        _gameMgr.playerData.self.cards.push(card);
      }
    });

    _socket.on('PLUS_CARD', function (data) {
      _globalData["default"].gameMgr.card_remain = _globalData["default"].gameMgr.card_remain - data.plus_num; //无动画

      if (_gameMgr.isRecover) {
        if (that._plus_card_timer) clearTimeout(that._plus_card_timer);

        for (var i = 0; i < data.plus_num; i++) {
          if (data.posId != _gameMgr.playerData.self.posId) {
            _gameMgr.getPlayerData(data.posId).cards.push(0);
          }
        }

        _eventMgr.fire('PLUS_CARD', data);

        _gameMgr.getPlayerData(data.nextPosId).target_timer_value = parseInt(data.server_time) + _gameMgr.roomState.timeout;
        _gameMgr.playerData.turn = data.nextPosId;

        _eventMgr.fire('CHANGE_TURN');
      } else {
        //有动画
        if (that._plus_card_timer) clearTimeout(that._plus_card_timer);
        that._plus_card_timer = setTimeout(function () {
          for (var _i = 0; _i < data.plus_num; _i++) {
            if (data.posId != _gameMgr.playerData.self.posId) {
              _gameMgr.getPlayerData(data.posId).cards.push(0);
            }
          }

          _eventMgr.fire('PLUS_CARD', data);

          _gameMgr.getPlayerData(data.nextPosId).target_timer_value = parseInt(data.server_time) + _gameMgr.roomState.timeout;
          _gameMgr.playerData.turn = data.nextPosId;

          _eventMgr.fire('CHANGE_TURN');
        }, 1000);
      }
    });

    _socket.on("PLUS_CARD_ONLY", function (data) {
      _gameMgr.getPlayerData(data.posId).cards.push(data.card);

      _eventMgr.fire('PLUS_CARD', data);
    });

    _socket.on("CONNECT_STATE", function (data) {
      if (_gameMgr.getPlayerData(data.posId)) {
        _gameMgr.getPlayerData(data.posId).connect_state = data.state;

        _eventMgr.fire('CONNECT_STATE');
      }
    });

    cc.game.targetOff(that);
    cc.game.on(cc.game.EVENT_HIDE, function () {
      console.log("进入后台");

      _eventMgr.removeAllLister();

      _socket.close();

      _gameMgr.reset();
    }, that);
    cc.game.on(cc.game.EVENT_SHOW, function () {
      console.log("回来前台");
      that.initSocket();
    }, that);
  };

  that.login = function (uid, name, avatorUrl, score, room, ready_count, game_time, specific_score, ob_uid, cbFunc) {
    _socket.emit('LOGIN', {
      uid: uid,
      room: room,
      name: name,
      avatorUrl: avatorUrl,
      score: score,
      ready_count: ready_count,
      game_time: game_time,
      specific_score: specific_score,
      ob_uid: ob_uid,
      lanuch_url: cc.args['lanuch_url']
    });

    _cbLogin = cbFunc; //是否旁观

    _gameMgr.is_ob = cc.args['ob_uid'] !== undefined;
  };

  that.checkIsObserve = function () {
    if (_gameMgr.is_ob) {// _eventMgr.fire('MESSAGE', "旁观中，不能操作游戏");
    }

    return _gameMgr.is_ob;
  };

  that.prepare = function () {
    if (that.checkIsObserve()) return;

    _socket.emit('PREPARE');
  };

  that.playCard = function (card) {
    if (that.checkIsObserve()) return;
    if (_gameMgr.isRecover) return; //防止极限操作

    var now = _gameMgr.server_time;
    var timer_value = _gameMgr.playerData.self.target_timer_value - now;

    if (timer_value <= 1) {
      return;
    }

    _socket.emit('PLAY_CARD', card);
  };

  that.passCard = function () {
    if (that.checkIsObserve()) return; // console.log("_gameMgr.isRecover",_gameMgr.isRecover)

    if (_gameMgr.isRecover) return;

    _socket.emit('PLAY_PASS');
  };

  that.getSocket = function () {
    return _socket;
  };

  return that;
};

var _default = socketMgr;
exports["default"] = _default;
module.exports = exports["default"];

cc._RF.pop();