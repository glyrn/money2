
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
    that.initSocket = function() {
        var opts = {
            'reconnection': true,
            'reconnectionDelay': 1000,
            'maxReconnectionAttempts': 10,
            'force new connection': true,
            'transports': ['websocket', 'polling'],
        }
        console.log(defines.serverUrl)
        var protocol = ''
        if(defines.isDebug){
            protocol = 'ws://';
        }else{
            opts['path'] = '/fxq_socket.io';
            protocol = 'wss://';
        }
        console.log(protocol+defines.serverUrl)
        _socket = window.io.connect(protocol+defines.serverUrl, opts);
        _socket.on('connect', () => {
            console.log('Connected to the server!');
        });
        _socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
        _socket.on('connect_timeout', (timeout) => {
            console.error('Connection timeout:', timeout);
        });
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
            if(_gameMgr.playerData[posId]){
                _gameMgr.playerData[posId].state = 2;
            }
            _eventMgr.fire('PREPARE_SUCCESS',posId);
        });
        _socket.on("LOGIN_SUCCESS", function (data) {

            _gameMgr.playerData = JSON.parse(JSON.stringify(data.playerData));
            _gameMgr.roomState.roomId = data.roomId;
            _gameMgr.play_mode = data.play_mode;
            _gameMgr.posId = data.posId;
            _gameMgr.play_index = 0;
            _gameMgr.play_count = data.play_count;
            console.log(_gameMgr.playerData)
            _gameMgr.checkBeat();
            _eventMgr.fire("LOGIN_SUCCESS");
            if (_cbLogin) {
                _cbLogin();
            }
        });
        _socket.on("SET_RECOVER_STATUS",function(data){
            _gameMgr.isRecover = data.isRecover;
        });

        _socket.on("MAKE_DICE_NUM_SUCCESS",function(data){

            console.log(data)
            _gameMgr.playerData[data.posId].dice = data.num;
            _eventMgr.fire('MAKE_DICE_NUM_SUCCESS', data);
        })
        _socket.on('PLAY_MOVE_STEP_SUCCESS',function(data){
            _eventMgr.fire('PLAY_MOVE_STEP_SUCCESS', data);
        })

        _socket.on("SIT_CHANGE",function(data){

            _gameMgr.playerData = JSON.parse(JSON.stringify(_gameMgr.playerData));
            //对手逃跑 重置游戏
            if(data.target == null){
                // _gameMgr.playerData[data.posId] = null;

                _gameMgr.roomState.state = 0;
            }else{
                _gameMgr.playerData[data.posId] = data.target;
            }
            console.log(data,_gameMgr.playerData)
            _eventMgr.fire("SIT_CHANGE",data)
        })

        _socket.on('NEXT_PLAYER_DICE_SUCCESS',function(data){
            _eventMgr.fire("NEXT_PLAYER_DICE_SUCCESS",data);
        });
        _socket.on('GAME_START',function(data){
            _gameMgr.roomState.state = 1;//进行中

            _gameMgr.play_index++;
            if(_gameMgr.play_index > _gameMgr.play_count){
                _gameMgr.play_index = 1;
            }

            _eventMgr.fire("GAME_START",data);
        })

        _socket.on('GAME_OVER',function(data){
            _gameMgr.roomState.state = 2;
            for (const posId in _gameMgr.playerData) {
                if(_gameMgr.playerData[posId]){
                    _gameMgr.playerData[posId].score = data.invalid == 1 ? 0 : data.score_list[posId];
                    _gameMgr.playerData[posId].state = 1;
                }
            }
            _eventMgr.fire("GAME_OVER",data);
        });

        _socket.on("CONNECT_STATE",function(data){
            _gameMgr.playerData[data.posId].connect_state = data.state;
            _eventMgr.fire('CONNECT_STATE',data);
        });
    }

    that.login = function(uid,name,avatorUrl,score,room,play_mode,ready_count,play_count,ob_uid,cbFunc){
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,play_mode:play_mode,ready_count:ready_count,play_count:play_count,ob_uid:ob_uid});
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
    that.makeDiceNum = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('MAKE_DICE_NUM');
    }
    that.playMoveStep = function(chess_idx,num){
        if(that.checkIsObserve()) return;
        _socket.emit('PLAY_MOVE_STEP', {idx:chess_idx,num:num});
    }
    that.nextPlayerDice = function(){
        if(that.checkIsObserve()) return;
        if(_gameMgr.isRecover) return;
        _socket.emit('NEXT_PLAYER_DICE');
    }
    that.finish_chess = function(posId,chess_idx){
        if(that.checkIsObserve()) return;
        _socket.emit('FINISH_CHESS', {posId:posId,idx:chess_idx});
    }
    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr