
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
            'reconnection': false,
            'force new connection': true,
            'transports': ['websocket', 'polling'],
            // 'path':'/voice_socket.io',
        }
        console.log(defines.serverUrl)

        _socket = window.io.connect('ws://' + defines.serverUrl, opts);
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

            _gameMgr.playerData[posId].state = 2;

            _eventMgr.fire('PREPARE_SUCCESS',posId);
        });
        _socket.on("LOGIN_SUCCESS", function (data) {
            _gameMgr.roomState.roomId = data.roomId;
            _gameMgr.playerData = data.playerData;
            _gameMgr.play_mode = data.play_mode;
            _gameMgr.posId = data.posId;
            _gameMgr.play_index = 0;
            _gameMgr.play_count = data.play_count;
            _gameMgr.checkBeat();

            if (_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on("SIT_CHANGE",function(data){
            console.log(data)
            //对手逃跑 重置游戏
            if(data.target == null){
                _gameMgr.playerData[data.posId] = null;

                _gameMgr.roomState.state = 0;
            }else{
                _gameMgr.playerData[data.posId] = data.target;
            }
            _eventMgr.fire("SIT_CHANGE",data)
        })

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
                _gameMgr.playerData[posId].score = data.score_list[posId];
                _gameMgr.playerData[posId].state = 1;
            }
            _eventMgr.fire("GAME_OVER",data);
        });
    }

    that.login = function(uid,name,avatorUrl,score,room,play_mode,play_count,cbFunc){
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,play_mode:play_mode,play_count:play_count});
        _cbLogin = cbFunc;
    }

    that.prepare = function(){
        _socket.emit('PREPARE');
    }
    that.makeDiceNum = function(){
        _socket.emit('MAKE_DICE_NUM');
    }
    that.playMoveStep = function(chess_idx,num){
        _socket.emit('PLAY_MOVE_STEP', {idx:chess_idx,num:num});
    }
    that.nextPlayerDice = function(){
        _socket.emit('NEXT_PLAYER_DICE');
    }
    that.finish_chess = function(posId,chess_idx){
        _socket.emit('FINISH_CHESS', {posId:posId,idx:chess_idx});
    }
    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr