import globalData from "../globalData";

const socketMgr = function(){
    var that = {}

    var _socket = null
    var _gameMgr = null;
    var _eventMgr = null;
    var _cbLogin;

    that.setGameMgr = function(gameMgr){
        _gameMgr = gameMgr
    }
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    }
    that.initSocket = function() {
        var opts = {
            'reconnection': false,
            'force new connection': true,
            'transports': ['websocket', 'polling'],
        }
        var protocol = ''
        if(defines.isDebug){
            protocol = 'ws://';
        }else{
            opts['path'] = '/uno_socket.io';
            protocol = 'wss://';
        }
        console.log(protocol+defines.serverUrl)
        _socket = window.io.connect(protocol+defines.serverUrl, opts);
        _socket.on('ping', function (data) {
            //心跳
            _socket.emit('pong', {beat: 1});

            _gameMgr.lossBeatNums--;
        });
        _socket.on("MESSAGE", function (msg) {
            _eventMgr.fire('MESSAGE', msg);
            console.log("MESSAGE:" + msg);
        });

        _socket.on('PREPARE_SUCCESS',function(posId){

            _gameMgr.getPlayerData(posId).state = 2;
            _gameMgr.getPlayerData(posId).target_timer_value = Date.parse(new Date()) / 1000 + _gameMgr.roomState.timeout;
            _gameMgr.playerData.turn = posId;

            _eventMgr.fire('PREPARE_SUCCESS', posId);
        });
        _socket.on("LOGIN_SUCCESS", function (data) {
            _gameMgr.roomId = data.roomId;
            var playerData = data.playerData;
            for (let i = 0; i < playerData.length; i++) {
                if(playerData[i]){
                    var key = _gameMgr.getPlayerDataKey(playerData[i].posId,data.posId);
                    _gameMgr.playerData[key] = playerData[i];
                }
            }
            _gameMgr.play_index = 0;
            _gameMgr.checkBeat();

            if (_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on("SIT_CHANGE",function(data){

            _gameMgr.setPlayerData(data.posId,data.target);
            //对手逃跑 重置游戏
            if(data.target == null){
                _gameMgr.roomState.gametime_remain = 0;
                _gameMgr.roomState.state = 0;
                _gameMgr.play_index = 0;
                _gameMgr.playerData.self.state = 1;
                if(_gameMgr.playerData.left) _gameMgr.playerData.left.state = 1;
                if(_gameMgr.playerData.right) _gameMgr.playerData.right.state = 1;
                if(_gameMgr.playerData.top) _gameMgr.playerData.top.state = 1;
            }

            _eventMgr.fire("SIT_CHANGE",data)
        })

        _socket.on('GAME_START',function(data){
            _gameMgr.roomState.state = 1;//进行中

            _gameMgr.getPlayerData(data.turn).target_timer_value = Date.parse(new Date()) / 1000 + _gameMgr.roomState.timeout;
            _gameMgr.playerData.turn = data.turn;
            _gameMgr.card_remain = 108;
            _gameMgr.roomState.gametime_remain = Date.parse(new Date()) / 1000 + parseInt(cc.args['game_time'] ?? 4) * 60;

            if(_gameMgr.is_quit){
                //初始化分数
                for (const posId in data.score_list) {
                    _gameMgr.getPlayerData(posId).score = parseInt(data.score_list[posId]);
                    _gameMgr.getPlayerData(posId).score_offset = 0;
                }
                _gameMgr.is_quit = false;
                _gameMgr.play_index = 1;
            }else{
                //更新分数
                for (var posId in [0,1,2,3]) {
                    if(_gameMgr.getPlayerData(posId)) {
                        _gameMgr.getPlayerData(posId).score = parseInt(_gameMgr.getPlayerData(posId).score) + (_gameMgr.getPlayerData(posId).score_offset ?? 0);
                        _gameMgr.getPlayerData(posId).score_offset = 0;
                    }
                }
                _gameMgr.play_index++;
            }

            _gameMgr.playerData.self.cards = data.cards;
            if(_gameMgr.playerData.left)    _gameMgr.playerData.left.cards = [0,0,0,0,0,0,0];
            if(_gameMgr.playerData.top)     _gameMgr.playerData.top.cards = [0,0,0,0,0,0,0];
            if(_gameMgr.playerData.right)   _gameMgr.playerData.right.cards = [0,0,0,0,0,0,0];

            _eventMgr.fire("GAME_START",data);
            _eventMgr.fire('CHANGE_TURN');
        })

        _socket.on('GAME_OVER',function(data){
            _gameMgr.roomState.state = 2;
            _gameMgr.roomState.gametime_remain = 0;
            for (let i = 0; i < data.score_list.length; i++) {
                var playerData = _gameMgr.getPlayerData(i);
                if(playerData) {
                    _gameMgr.getPlayerData(i).state = 1;
                    var option = i == data.winer ? 1 : -1;
                    _gameMgr.getPlayerData(i).score_offset = option * parseInt(data.score_list[i]);
                    _gameMgr.getPlayerData(i).cards = data.cards_list[i];
                    if (_gameMgr.getPlayerData(i).score + _gameMgr.getPlayerData(i).score_offset >= parseInt(cc.args['specific_score'] ?? 300)) {

                        _gameMgr.is_quit = true;
                    }
                }
            }
            _gameMgr.score_list.push(data);
            _eventMgr.fire("GAME_OVER",data);
        });

        _socket.on('PLAY_CARD_SUCCESS',function(data){

            globalData.gameMgr.playerData.self.target_timer_value = 0;
            //剔除
            if(data.posId ==  _gameMgr.playerData.self.posId){
                var new_cards = [];
                var is_del = false;
                for (let i = 0; i < _gameMgr.playerData.self.cards.length; i++) {
                    var _card = _gameMgr.playerData.self.cards[i];
                    if( !is_del && ((_card.value == data.card.value && _card.color == data.card.color) ||
                        (_card.value == data.card.value && _card.value == 'color') ||
                        (_card.value == data.card.value && _card.value == 'plus4')))
                    {
                        is_del = true;
                        continue;
                    }else{
                        new_cards.push(_card);
                    }
                }
                _gameMgr.playerData.self.cards = new_cards;
            }else{
                //扣一张
                _gameMgr.getPlayerData(data.posId).cards.shift();
            }

            _eventMgr.fire('PLAY_CARD_SUCCESS',data);
            _gameMgr.getPlayerData(data.nextPosId).target_timer_value = Date.parse(new Date()) / 1000 + _gameMgr.roomState.timeout;
            _gameMgr.playerData.turn = data.nextPosId;
            _eventMgr.fire('CHANGE_TURN');
        });
        _socket.on('PLAY_PASS_SUCCESS',function(data){
            for (let i = 0; i < data.plus_cards.length; i++) {
                var card = data.plus_cards[i];
                card.isNew = true;
                _gameMgr.playerData.self.cards.push(card);
            }
        });
        _socket.on('PLUS_CARD',function(data){

            setTimeout(function(){
                for (let i = 0; i < data.plus_num; i++) {
                    if(data.posId != _gameMgr.playerData.self.posId){
                        _gameMgr.getPlayerData(data.posId).cards.push(0);
                    }
                }
                _eventMgr.fire('PLUS_CARD',data);
                _gameMgr.getPlayerData(data.nextPosId).target_timer_value = Date.parse(new Date()) / 1000 + _gameMgr.roomState.timeout;
                _gameMgr.playerData.turn = data.nextPosId;

                _eventMgr.fire('CHANGE_TURN');
            },1000);
        });
    }

    that.login = function(uid,name,avatorUrl,score,room,play_mode,game_time,specific_score,ob_uid,cbFunc){
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,play_mode:play_mode,game_time:game_time,specific_score:specific_score,ob_uid:ob_uid});
        _cbLogin = cbFunc;
        //是否旁观
        _gameMgr.is_ob = cc.args['ob_uid'] !== undefined;
    }
    that.checkIsObserve = function(){
        if(_gameMgr.is_ob){
            _eventMgr.fire('MESSAGE', "旁观中，不能操作游戏");
        }
        return _gameMgr.is_ob;
    }
    that.prepare = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('PREPARE');
    }
    that.playCard = function(card){
        if(that.checkIsObserve()) return;
        _socket.emit('PLAY_CARD',card);
    }
    that.passCard = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('PLAY_PASS');
    }
    that.getSocket = function(){
        return _socket;
    }
    return that
}

export default socketMgr