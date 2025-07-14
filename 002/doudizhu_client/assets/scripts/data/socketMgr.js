if(window.io == undefined){
    console.error("找不到socket.io.js库文件");
}
const socketMgr = function(){
    var that = {}

    var _socket = null
    var _gameMgr = null;
    var _eventMgr = null;
    var _util = null;
    var _cbLogin;

    that.setGameMgr = function(gameMgr){ 
        _gameMgr = gameMgr
    },
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    },
    that.setUtil = function(util){
        _util = util;
    }
    that.initSocket = function(){
        var opts = {
            'reconnection': true,
            'reconnectionDelay': 1000,
            'maxReconnectionAttempts': 100,
            'force new connection': true,
            'transports': ['websocket', 'polling'],
        }
        var protocol = ''
        if(defines.isDebug){
            protocol = 'ws://';
        }else{
            opts['path'] = '/hlddz_socket.io';
            protocol = 'wss://';
        }
        console.log(protocol+defines.serverUrl)
        _socket = window.io.connect(protocol+defines.serverUrl, opts);
        _socket.on('ping',function(data){
            //心跳
            _socket.emit('pong', {beat: 1});

            _gameMgr.lossBeatNums--;
        });
        _socket.on('connect', () => {
            console.log('Connected to the server!');
            
            _eventMgr.removeAllLister()
            cc.director.preloadScene("gameScene",function(){},function(){
                if(defines.isDebug || defines.serverUrl == 'www.g-xinyi1313.cn' || defines.isForce){

                    cc.director.loadScene("gameScene",function(){
                        //请求登录
                        console.log("发送登录请求")
                        that.login(cc.args['uid'],cc.args['name'],cc.args['avatorUrl'],cc.args['score'],cc.args['ob_uid'],cc.args['room'],
                             parseInt(cc.args['base_score']), cc.args['play_count'], cc.args['play_mode'],function(){
                        });
                    });
                }else{
                    console.log("开始请求用户信息：")
                    _util.post(defines.yc_domain+"/client/alchemy/callback/checkSign",{sign:cc.args['sign']},function(isOk,data) {
                        console.log("用户信息：",data)
                        if (isOk) {

                            cc.director.loadScene("gameScene",function(){
                                //请求登录
                                that.login(data.data.userId, data.data.nickname, data.data.avatar, cc.args['score'],cc.args['ob_uid'],cc.args['room'],
                                    parseInt(cc.args['base_score']), cc.args['play_count'], cc.args['play_mode'], function () {
                                });
                            });
                        
                        }
                    });
                }
            });
        });
        _socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
        _socket.on('connect_timeout', (timeout) => {
            console.error('Connection timeout:', timeout);
        });
        _socket.on("MESSAGE",function(data){
            _eventMgr.fire('MESSAGE',data.msg);
            console.log("MESSAGE:"+data.msg);
        });

        _socket.on("LOGIN_SUCCESS",function(data) {

            _gameMgr.posId = data.posId;
            _gameMgr.deskId = data.roomId;
            _gameMgr.isLaizi = data.islaizi;
            _gameMgr.base_score = data.base_score;
            _gameMgr.play_count = data.play_count;
            _gameMgr.play_index = data.play_index;

            for (const posId in data.posInfos) {
                var pos = data.posInfos[posId];
                _gameMgr.updatePosStatus(pos.posId, pos.state, pos.name,pos.avatorUrl,pos.score,pos.uid);
            }
            _gameMgr.posState.self.isDizhu = false;
            _eventMgr.fire("POS_STATUS_CHANGE");

            _gameMgr.checkBeat();

            if(_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on('SIT_CHANGE', function (data) {
            var target = data.target;
            if(target){
                _gameMgr.updatePosStatus(target.posId, target.state, target.name,target.avatorUrl,target.score,target.uid);
                _eventMgr.fire("POS_STATUS_CHANGE");
            }
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

            _gameMgr.roomState.timeout = 0;
            _gameMgr.startTimer(false);//停止计时器
            _gameMgr.roomState.state = 3;

            if(_gameMgr.posState.left.state == 2){
                _gameMgr.posState.left.state = 1;
            }
            _gameMgr.posState.left.callScore = -1;
            _gameMgr.posState.left.isPass = false;

            if(_gameMgr.posState.right.state == 2){
                _gameMgr.posState.right.state = 1;
            }
            _gameMgr.posState.right.callScore = -1;
            _gameMgr.posState.right.isPass = false;

            if(_gameMgr.posState.self.state == 2){
                _gameMgr.posState.self.state = 1;
            }
            _gameMgr.posState.self.callScore = -1;
            _gameMgr.posState.self.isPass = false;

            var direct = _gameMgr.getDirectionByPosId(data.posId);
            if(direct) {
                _gameMgr.posState[direct].ctxCards = [];
                _gameMgr.posState[direct].cards = [];
            }

            _eventMgr.fire('FORCE_EXIT_EV',data.msg);
            _eventMgr.fire('FORCE_EXIT_EV1',data.msg);
            _eventMgr.fire('FORCE_EXIT_EV2',data.msg);
        });

        _socket.on('PREPARE_SUCCESS', function (posId) {

            var direct = _gameMgr.getDirectionByPosId(posId);
            if(direct && _gameMgr.posState[direct]) {
                _gameMgr.posState[direct].state = 2;
                _eventMgr.fire('PREPARE_SUCCESS');
            }
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

            _eventMgr.fire('SHOW_TOP_CARD',data);
        });

        _socket.on('CTX_PLAY_CHANGE', function (data) {
            var direct = _gameMgr.getDirectionByPosId(data.ctxData.posId);
            _gameMgr.posState[direct].ctxCards = data.ctxData.cards;
            _gameMgr.posState[direct].isPass = data.isPass;
            //清空动画
            _eventMgr.fire("show_global_effect",{isHide:true});

            if (!data.isPass) {
                _gameMgr.roomState.ctxCard.len = data.ctxData.len;
                _gameMgr.roomState.ctxCard.key = data.ctxData.key;
                _gameMgr.roomState.ctxCard.type = data.ctxData.type;
                _gameMgr.roomState.ctxCard.ctxPos = direct;

                var card_type = _gameMgr.roomState.ctxCard.type;
                var card_len = _gameMgr.roomState.ctxCard.len;
                console.log("card_type:"+card_type+"  "+card_len+"  "+data.ctxData.key);
 
                //炸弹
                if(card_type == 'AAAA' && card_len == 4){
                    cc.playEffect('sound/bomb',false,1);

                    if (_gameMgr.roomState.ctxPos === 'self') {
                        _gameMgr.posState.self.ratio += 2;
                    }
                    _eventMgr.fire("show_global_effect",{anim:"animBoom"+_gameMgr.roomState.ctxPos,isAutoHide:true});
                }else if(card_type == 'KING'){
                    cc.playEffect('sound/king_bomb',false,1);

                    if (_gameMgr.roomState.ctxPos === 'self') {
                        _gameMgr.posState.self.ratio += 4;
                    }
                    _eventMgr.fire("show_global_effect",{anim:"animKing"+_gameMgr.roomState.ctxPos,isAutoHide:true});
                }else if(card_type == 'AAABBB' && card_len == 6 ||
                    card_type == 'AAABBB' && card_len == 9 ||
                    card_type == 'AAAB' && card_len == 8 ||
                    card_type == 'AAABB' && card_len == 10 ||
                    card_type == 'AAABB' && card_len == 12 ||
                    card_type == 'AAABB' && card_len == 15 ||
                    card_type == 'AAABB' && card_len == 18 ||
                    card_type == 'AAABB' && card_len == 20
                ){
                    cc.playEffect('sound/airplane',false,1);

                    if (_gameMgr.roomState.ctxPos === 'self') {
                        _gameMgr.posState.self.ratio += 2;
                    }
                    _eventMgr.fire("show_global_effect",{anim:"animAirplane"+_gameMgr.roomState.ctxPos,isAutoHide:true});
                }else if(data.ctxData.key == 17){ //大王
                    cc.playEffect("sound/king_big",false,1);
                }else if(data.ctxData.key == 16){ //小王
                    cc.playEffect("sound/king_small",false,1);
                }else{
                    cc.playEffect("sound/singer_send_card",false,1);
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
        _socket.on("CHECK_PLAY_CARD_SUCCESS",function(ret){
            if(ret.type == 'AAABBB' && ret.len == 6 ||
                    ret.type == 'AAABBB' && ret.len == 9 ||
                    ret.type == 'AAAB' && ret.len == 8 ||
                    ret.type == 'AAABB' && ret.len == 10 ||
                    ret.type == 'AAABB' && ret.len == 12 ||
                    ret.type == 'AAABB' && ret.len == 15 ||
                    ret.type == 'AAABB' && ret.len == 18 ||
                    ret.type == 'AAABB' && ret.len == 20
            ){
                _eventMgr.fire("show_global_effect",{anim:'animAirpanel'});
            }else if (ret.type == 'KING') {
                _eventMgr.fire("show_global_effect",{anim:'animKing'});
            }else if (ret.type == 'AAAA' && ret.len == 4) {
                _eventMgr.fire("show_global_effect",{anim:'animBoom'});
            }else{
                _eventMgr.fire("show_global_effect",{isHide:true});
            }
        });

        _socket.on('GAME_OVER', function (data) {

            _gameMgr.startTimer(false);//停止计时器
            _gameMgr.roomState.state = 3;

            if(_gameMgr.posState.left.state != 0) {
                _gameMgr.posState.left.state = 1;
            }
            _gameMgr.posState.left.callScore = -1;
            _gameMgr.posState.left.isPass = false;

            if(_gameMgr.posState.right.state != 0) {
                _gameMgr.posState.right.state = 1;
            }
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
        });

        _socket.on("CONNECT_STATE",function(data){
            var direct = _gameMgr.getDirectionByPosId(data.posId);
            if(direct){
                _gameMgr.posState[direct].connect_state = data.state;
                _eventMgr.fire('CONNECT_STATE',data);
            }
        });
    }

    that.login = function(uid,name,avatorUrl,score,ob_uid,room,base_score,play_count,play_mode,cbFunc){
        _socket.emit('LOGIN', {uid:uid,name:name,avatorUrl:avatorUrl,score:score,ob_uid:ob_uid,room:room,
            score:score,base_score:base_score,play_count:play_count,play_mode:play_mode,lanuch_url:cc.args['lanuch_url']});
        _cbLogin = cbFunc;

        //是否旁观
        _gameMgr.is_ob = cc.args['ob_uid'] !== undefined;
    }


    that.call_score = function(score){
        if(that.checkIsObserve()) return;
        _socket.emit('CALL_SCORE', { score: score });
    }
    that.pass_card = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('PLAY_CARD', []);
    }
    that.prepare = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('PREPARE');
    }

    that.getSocket = function(){
        return _socket;
    }
    that.checkIsObserve = function(){
        if(_gameMgr.is_ob){
            _eventMgr.fire('MESSAGE', "旁观中，不能操作游戏");
        }
        return _gameMgr.is_ob;
    }
    that.checkPlayCard = function(data){
        if(that.checkIsObserve()) return;
        _socket.emit('CHECK_PLAY_CARD',data);
    }
    return that
}

export default socketMgr