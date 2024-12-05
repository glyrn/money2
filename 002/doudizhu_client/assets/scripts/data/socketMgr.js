const socketMgr = function(){
    var that = {}

    var _socket = null
    var _gameMgr = null;
    var _eventMgr = null;
    var _cbLogin;

    that.setGameMgr = function(gameMgr){
        _gameMgr = gameMgr
    },
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    },
    that.initSocket = function(){
        var opts = {
            'reconnection':false,
            'force new connection': true,
            'transports':['websocket', 'polling'],
            'path':'/hlddz_socket.io',
        }
        console.log(defines.serverUrl)
        _socket = window.io.connect('ws://'+defines.serverUrl,opts);
        _socket.on('ping',function(data){
            //心跳
            _socket.emit('pong', {beat: 1});

            _gameMgr.lossBeatNums--;
        });
        _socket.on("MESSAGE",function(data){
            _eventMgr.fire('MESSAGE',data.msg);
            console.log("MESSAGE:"+data.msg);
        });

        _socket.on("LOGIN_SUCCESS",function(data) {
            _gameMgr.desks = data;
            _gameMgr.where = 1;

            _gameMgr.checkBeat();

            if(_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on("LOGIN_FAIL",function(data){
            console.log("LOGIN_FAIL:"+data.msg);
            _eventMgr.fire('LOGIN_FAIL',data.msg)
        });

        _socket.on("SITDOWN_SUCCESS",function(data) {
            _gameMgr.where = 2;
            _gameMgr.posId = data.posId;
            _gameMgr.deskId = data.deskId;
            _gameMgr.deskName = data.deskName;
            _gameMgr.isLaizi = data.islaizi;
            _gameMgr.base_score = data.base_score;
            _gameMgr.play_count = data.play_count;
            _gameMgr.play_index = data.play_index;

            data.posInfos.forEach(function (pos) {
                _gameMgr.updatePosStatus(pos.posId, pos.state, pos.userName,pos.avatarUrl,pos.score,pos.uid);
            });
            _gameMgr.posState.self.isDizhu = false;
            _eventMgr.fire('SITDOWN_SUCCESS');
        });

        _socket.on('SITDOWN_ERROR', function (data) {
            console.log(data.msg);
            _eventMgr.fire('SITDOWN_ERROR',data.msg);
        });

        _socket.on('UNSITDOWN_SUCCESS', function (data) {
            _gameMgr.resetRoomStatus();
            _gameMgr.desks = data;

            _eventMgr.fire('UNSITDOWN_SUCCESS');
        });

        _socket.on('REFRESH_LIST', function (data) {
            _gameMgr.desks = data;
        });

        _socket.on('STATUS_CHANGE', function (data) {
            _gameMgr.updateHouseStatus(data.deskId, data.posId, data.state);
        });

        _socket.on('POS_STATUS_CHANGE', function (data) {
            // var direct = _gameMgr.getDirectionByPosId(data.posId);
            console.log(data)
            _gameMgr.updatePosStatus(data.posId, data.state, data.userName,data.avatarUrl,data.score,data.uid);
            _eventMgr.fire("POS_STATUS_CHANGE");
        });

        _socket.on('POS_STATUS_RESET', function (data) {
            data.pos.forEach(function (pos) {
                _gameMgr.updatePosStatus(pos.posId, data.state);
            });
        });

        _socket.on('ROOM_STATUS_CHANGE', function (data) {
            _gameMgr.roomState.state = data.state;
        });

        _socket.on('FORCE_EXIT_EV', function (data) {
            console.log(data.msg);

            _gameMgr.roomState.timeout = 0;
            _gameMgr.startTimer(false);//停止计时器
            _gameMgr.roomState.state = 3;

            _gameMgr.posState.left.state = 1;
            _gameMgr.posState.left.callScore = -1;
            _gameMgr.posState.left.isPass = false;

            _gameMgr.posState.right.state = 1;
            _gameMgr.posState.right.callScore = -1;
            _gameMgr.posState.right.isPass = false;

            _gameMgr.posState.self.state = 1;
            _gameMgr.posState.self.callScore = -1;
            _gameMgr.posState.self.isPass = false;

            var direct = _gameMgr.getDirectionByPosId(data.posId);
            _gameMgr.posState[direct].ctxCards = [];
            _gameMgr.posState[direct].cards = [];

            _eventMgr.fire('FORCE_EXIT_EV',data.msg);
            _eventMgr.fire('FORCE_EXIT_EV1',data.msg);
            _eventMgr.fire('FORCE_EXIT_EV2',data.msg);
        });

        _socket.on('PREPARE_SUCCESS', function (data) {
            _gameMgr.posState.self.state = 2;
            _eventMgr.fire('PREPARE_SUCCESS');
        });

        _socket.on('GAME_START', function (data) {
            _gameMgr.roomState.state = 1;
            _gameMgr.initCards(data.cards);
            _gameMgr.posState.left.callScore = -1;
            _gameMgr.posState.right.callScore = -1;
            _gameMgr.posState.self.callScore = -1;

            _gameMgr.posState.left.isPass = false;
            _gameMgr.posState.right.isPass = false;
            _gameMgr.posState.self.isPass = false;

            _gameMgr.posState.left.isDizhu = false;
            _gameMgr.posState.right.isDizhu = false;
            _gameMgr.posState.self.isDizhu = false;

            _gameMgr.posState.left.ctxCards = [];
            _gameMgr.posState.right.ctxCards = [];
            _gameMgr.posState.self.ctxCards = [];

            _eventMgr.fire("GAME_START");
        });


        _socket.on('CTX_USER_CHANGE', function (data) {
            _gameMgr.updateCtxInfo(_socket,data);
            _eventMgr.fire('CTX_USER_CHANGE');
        });

        _socket.on('SHOW_TOP_CARD', function (data) {
            _gameMgr.roomState.state = 2;
            var direct = _gameMgr.getDirectionByPosId(data.dizhuPosId);
            if (direct == 'self') {
                data.topCards.forEach(function (card) {
                    card.selected = true;
                })
            }
            _gameMgr.posState[direct].cards = _gameMgr.posState[direct].cards.concat(data.topCards).sort(function (a, b) {
                return b.value - a.value;
            });
            _gameMgr.posState.top.cards = data.topCards;
            _gameMgr.roomState.ctxPos = direct;
            _gameMgr.posState[direct].isDizhu = true;
            _gameMgr.roomState.timeout = data.timeout;

            _gameMgr.posState.laizi.cards = data.laiziCards;

            // _gameMgr.startTimer(_gameMgr.autoPlayCards.bind(_socket));
            _eventMgr.fire('SHOW_TOP_CARD');
        });

        _socket.on('CTX_PLAY_CHANGE', function (data) {
            var direct = _gameMgr.getDirectionByPosId(data.ctxData.posId);
            _gameMgr.posState[direct].ctxCards = data.ctxData.cards;
            _gameMgr.posState[direct].isPass = data.isPass;

            if (!data.isPass) {
                _gameMgr.roomState.ctxCard.len = data.ctxData.len;
                _gameMgr.roomState.ctxCard.key = data.ctxData.key;
                _gameMgr.roomState.ctxCard.type = data.ctxData.type;
                _gameMgr.roomState.ctxCard.ctxPos = direct;

                var card_type = _gameMgr.roomState.ctxCard.type;
                var card_len = _gameMgr.roomState.ctxCard.len;

                //炸弹
                if(card_type == 'AAAA' && card_len == 4){
                    cc.playEffect('sound/bomb.mp3',false,1);

                    if (_gameMgr.roomState.ctxPos === 'self') {
                        _gameMgr.posState.self.ratio += 2;
                    }
                }else if(card_type == 'KING'){
                    cc.playEffect('sound/king_bomb.mp3',false,1);

                    if (_gameMgr.roomState.ctxPos === 'self') {
                        _gameMgr.posState.self.ratio += 4;
                    }
                }else if(card_type == 'AAABBB' && card_len == 6 ||
                    card_type == 'AAABBB' && card_len == 9 ||
                    card_type == 'AAAB' && card_len == 8 ||
                    card_type == 'AAABB' && card_len == 10 ||
                    card_type == 'AAABB' && card_len == 12 ||
                    card_type == 'AAABB' && card_len == 15 ||
                    card_type == 'AAABB' && card_len == 18 ||
                    card_type == 'AAABB' && card_len == 20
                ){
                    cc.playEffect('sound/ariplane.mp3',false,1);

                    if (_gameMgr.roomState.ctxPos === 'self') {
                        _gameMgr.posState.self.ratio += 2;
                    }
                }
            }
            _gameMgr.removeCards(direct, data.ctxData.cards);
            _gameMgr.roomState.ctxPos = _gameMgr.getDirectionByPosId(data.posId);
            //如果是自己出牌就清空上一轮自己出的牌
            if (_gameMgr.roomState.ctxPos === 'self') {
                _gameMgr.posState.self.ctxCards = [];
            }
            _gameMgr.posState[_gameMgr.roomState.ctxPos].isPass = false;
            _gameMgr.roomState.timeout = data.timeout;
            _gameMgr.startTimer();

            _eventMgr.fire('CTX_PLAY_CHANGE');
            _eventMgr.fire('CTX_PLAY_CHANGE1');
        });

        _socket.on('PLAY_CARD_ERROR', function (msg) {
            // var msg = '你的牌不符合规则';
            // console.log(msg);
            _eventMgr.fire('PLAY_CARD_ERROR',msg);
        });

        _socket.on('PLAY_CARD_SUCCESS', function (cards) {
            _gameMgr.removeCards('self', cards);
            _gameMgr.posState.self.ctxCards = cards;
            _eventMgr.fire('PLAY_CARD_SUCCESS');
            _eventMgr.fire('PLAY_CARD_SUCCESS1');
        });

        _socket.on('GAME_OVER', function (data) {

            _gameMgr.startTimer(false);//停止计时器
            _gameMgr.roomState.state = 3;

            _gameMgr.posState.left.state = 1;
            _gameMgr.posState.left.callScore = -1;
            _gameMgr.posState.left.isPass = false;

            _gameMgr.posState.right.state = 1;
            _gameMgr.posState.right.callScore = -1;
            _gameMgr.posState.right.isPass = false;

            _gameMgr.posState.self.state = 1;
            _gameMgr.posState.self.callScore = -1;
            _gameMgr.posState.self.isPass = false;
            _gameMgr.posState.self.ratio = 0;

            _eventMgr.fire('GAME_OVER',data);
            _eventMgr.fire('GAME_OVER1',data);
            _eventMgr.fire('GAME_OVER2',data);

            _gameMgr.play_index++;
            if(_gameMgr.play_count < _gameMgr.play_index){ //剩余局数为0
                _gameMgr.play_index = 1;
                _gameMgr.score_list = [];
            }
        });

        _socket.on('CALL_SCORE_SUCCESS',function(ratio){
            _gameMgr.posState.self.ratio = ratio;
            _eventMgr.fire('CALL_SCORE_SUCCESS')
        })

        _socket.on("connection",function(){
            console.log("connect server success!!")
        });
    }

    that.login = function(uid,name,avatarUrl,score,cbFunc){
        _socket.emit('LOGIN', {uid:uid,name:name,avatarUrl:avatarUrl,score:score});
        _cbLogin = cbFunc;
    }

    that.sitdown = function(deskName,score,base_score,play_count,play_mode){
        _socket.emit('SITDOWN', { deskName: deskName, base_score:base_score,play_count:play_count,play_mode:play_mode });
    }
    that.call_score = function(score){
        _socket.emit('CALL_SCORE', { score: score });
    }
    that.pass_card = function(){
        _socket.emit('PLAY_CARD', []);
    }
    that.prepare = function(){
        _socket.emit('PREPARE');
    }

    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr