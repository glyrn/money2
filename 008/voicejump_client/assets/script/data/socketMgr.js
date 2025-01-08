
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
            _gameMgr.playerData[posId].game_type = 'normal';
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
            //对手逃跑 重置游戏
            if(data.target == null){
                _gameMgr.playerData[data.posId] = null;

                _gameMgr.roomState.state = 0;
            }else{
                _gameMgr.playerData[data.posId] = data.target;
            }
            _eventMgr.fire("SIT_CHANGE",data)
        })

        _socket.on("REFRESH_DATA",function(data){
            _eventMgr.fire("REFRESH_DATA",data)
        });

        _socket.on("BIRD_RISE_SUCCESS",function(data){
            _eventMgr.fire("BIRD_RISE_SUCCESS",data)
        });
        _socket.on("GAIN_SCORE_SUCCESS",function(data){
            _gameMgr.playerData[data.posId].gain_score = data.gain_score;
            _eventMgr.fire("GAIN_SCORE_SUCCESS",data)
        })
        _socket.on("FALL_OVER_SUCCESS",function(posId){
            _gameMgr.playerData[posId].game_type = 'fall';
            _eventMgr.fire("FALL_OVER_SUCCESS",posId)
        });

        _socket.on("PAUSE_OVER_SUCCESS",function(data){
            _eventMgr.fire("PAUSE_OVER_SUCCESS",data)
        });

        _socket.on('GAME_START',function(data){
            _gameMgr.roomState.state = 1;//进行中

            _gameMgr.play_index++;
            if(_gameMgr.play_index > _gameMgr.play_count){
                _gameMgr.play_index = 1;
            }
            for (const posId in _gameMgr.playerData) {
                _gameMgr.playerData[posId].game_type = 'normal';
            }
            _eventMgr.fire("GAME_START",data);
        })

        _socket.on('GAME_OVER',function(data){
            _gameMgr.roomState.state = 2;
            _gameMgr.score_list.push(data);
            for (const posId in _gameMgr.playerData) {
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
    that.birdRise = function(data){
        _socket.emit('BIRD_RISE',data);
    }
    that.fallOver = function(){
        _socket.emit('FALL_OVER');
    }
    that.pauseOver = function(data){
        _socket.emit('PAUSE_OVER',data);
    }
    that.gainScore = function(data){
        _socket.emit('GAIN_SCORE', data);
    }
    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr