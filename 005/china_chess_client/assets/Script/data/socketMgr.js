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
            'path':'/zgxq_socket.io',
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

        _socket.on('PREPARE_SUCCESS',function(data){
            if(_gameMgr.play_mode == 1){
                if(_gameMgr.playerData.target && _gameMgr.playerData.target.uid == data){
                    _gameMgr.playerData.target.state = 2;
                }else if(_gameMgr.playerData.self.uid == data){
                    _gameMgr.playerData.self.state = 2;
                }
            }else{
                if(_gameMgr.playerData.self.uid == data){
                    _gameMgr.playerData.self.state = 2;
                }
            }

            _eventMgr.fire('PREPARE_SUCCESS', data.msg);
        });
        _socket.on("LOGIN_SUCCESS", function (data) {
            _gameMgr.roomState.roomId = data.roomId;
            _gameMgr.playerData.target = data.target;
            _gameMgr.playerData.self = data.self;
            _gameMgr.play_mode = data.play_mode;
            _gameMgr.play_index = 0;
            _gameMgr.play_count = data.play_count;
            _gameMgr.checkBeat();

            if (_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on("SIT_CHANGE",function(data){
            _gameMgr.playerData.target = data.target;
            //对手逃跑 重置游戏
            if(data.target == null){
                _gameMgr.roomState.state = 0;
                _gameMgr.play_index = 0;
            }
            _eventMgr.fire("SIT_CHANGE",data)
        })

        _socket.on('GAME_START',function(data){
            _gameMgr.roomState.state = 1;//进行中
            if(_gameMgr.play_mode == 0){ //人机
                _gameMgr.playerData.turn = _gameMgr.playerData.self.posId;
            }else{
                //重置 悔棋次数
                _gameMgr.playerData.self.retrack_num = 5;
                _gameMgr.playerData.target.retrack_num = 5;
                _gameMgr.playerData.turn = data;
            }

            _gameMgr.play_index++;
            if(_gameMgr.play_index > _gameMgr.play_count){
                _gameMgr.play_index = 1;
            }

            _eventMgr.fire("GAME_START");
            _eventMgr.fire('CHANGE_TURN');
        })

        // _socket.on('GAME_OVER',function(data){
        //     _eventMgr.fire("GAME_OVER",data);
        // });

        _socket.on("RETRACK_CHESS_REQ",function(){
            _eventMgr.fire('RETRACK_CHESS_REQ');
        });
        _socket.on("RETRACK_CHESS_RSP_SUCCESS",function(data){
            _eventMgr.fire('RETRACK_CHESS_RSP_SUCCESS',data);
        });
        _socket.on('PLAY_CHESS_SUCCESS',function(data){
            _eventMgr.fire('PLAY_CHESS_SUCCESS',data);
        })
    }

    that.login = function(uid,name,avatorUrl,score,room,play_mode,play_count,cbFunc){
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,play_mode:play_mode,play_count:play_count});
        _cbLogin = cbFunc;
    }

    that.prepare = function(){
        _socket.emit('PREPARE');
    }
    that.playChess = function(x,y){
        _socket.emit('PLAY_CHESS',{x:x,y:y});
    }
    that.retrackChess = function(){
        _socket.emit('RETRACK_CHESS');
    }
    that.retrackRsp = function(option){
        _socket.emit('RETRACK_CHESS_RSP',option);
    }
    that.reqGameOver = function(){
        _socket.emit("REQ_GAME_OVER");
    }
    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr