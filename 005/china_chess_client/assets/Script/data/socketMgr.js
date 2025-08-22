import globalData from "./globalData";

const socketMgr = function(){
    var that = {}

    var _socket = null
    var _gameMgr = null;
    var _eventMgr = null;
    var _utils = null;
    var _cbLogin;

    that.setGameMgr = function(gameMgr){
        _gameMgr = gameMgr
    },
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    },
    that.setUtils = function(util){
        _utils = util;
    }
    that.initSocket = function() {
        var opts = {
            'reconnection': true,
            'reconnectionDelay': 1000,
            'maxReconnectionAttempts': 100,
            'force new connection': true,
            'transports': ['websocket', 'polling'],
        }
        console.log(defines.serverUrl)

        var protocol = ''
        if(defines.isDebug){
            protocol = 'ws://';
        }else{
            opts['path'] = '/zgxq_socket.io';
            protocol = 'wss://';
        }
        console.log(protocol+defines.serverUrl)
        _socket = window.io.connect(protocol+defines.serverUrl, opts);
        _socket.on('connect', () => {
            console.log('Connected to the server!');

             _eventMgr.removeAllLister();
             cc.director.preloadScene("Game",function(){},function() {
                if (defines.isDebug || defines.serverUrl == 'www.g-xinyi1313.cn' || defines.isForce) {
                    cc.director.loadScene("Game",function(){
                        that.login(cc.args['uid'], cc.args['name'], cc.args['avatorUrl'], cc.args['score'], cc.args['room'],
                            cc.args['play_mode'], cc.args['play_count'], cc.args['ob_uid'], function () {
                    
                            });
                        });

                } else {
                    console.log("用户信息")
                    _utils.post(defines.yc_domain+"/client/alchemy/callback/checkSign",{sign:cc.args['sign']},function(isOk,data) {
                        console.log("用户信息",data)
                        if (isOk) {
                            cc.director.loadScene("Game",function(){
                                that.login(data.data.userId, data.data.nickname,data.data.avatar, cc.args['score'], cc.args['room'],
                                    cc.args['play_mode'], cc.args['play_count'], cc.args['ob_uid'],function () {
                                       
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
            console.log("LOGIN_SUCCESS:"+JSON.stringify(data));
            _gameMgr.roomState.roomId = data.roomId;
            _gameMgr.playerData.target = data.target;
            _gameMgr.playerData.self = data.self;
            _gameMgr.play_mode = data.play_mode;
            _gameMgr.play_index = 0;
            _gameMgr.play_count = data.play_count;
            // _gameMgr.checkBeat();
            _eventMgr.fire("LOGIN_SUCCESS");
            if (_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on("SIT_CHANGE",function(data){

            if(data.target){
                _gameMgr.playerData.target = data.target;
            }
            //对手逃跑 重置游戏
            if(data.target == null){
                _gameMgr.roomState.state = 0;
                _gameMgr.play_index = 0;
            }
            _eventMgr.fire("SIT_CHANGE",data);
            //对手逃跑 游戏结束
            if(data.target == null){
                _eventMgr.fire('GAME_OVER',{invalid:1,score:0,winer:globalData.gameMgr.playerData.self.posId});
            }
        })

        _socket.on('GAME_START',function(data){
            _gameMgr.roomState.state = 1;//进行中
            if(_gameMgr.play_mode == 0){ //人机
                _gameMgr.playerData.turn = _gameMgr.playerData.self.posId;
            }else{
                //重置 悔棋次数
                _gameMgr.playerData.self.retrack_num = 5;
                if(_gameMgr.playerData.target){
                    _gameMgr.playerData.target.retrack_num = 5;
                }   
                _gameMgr.playerData.turn = data;
            }

            _gameMgr.play_index++;
            if(_gameMgr.play_index > _gameMgr.play_count){
                _gameMgr.play_index = 1;
            }

            _eventMgr.fire("GAME_START");
            _eventMgr.fire('CHANGE_TURN');
        })

        _socket.on("RETRACK_CHESS_REQ",function(){
            _eventMgr.fire('RETRACK_CHESS_REQ');
        });
        _socket.on("RETRACK_CHESS_RSP_SUCCESS",function(data){
            _eventMgr.fire('RETRACK_CHESS_RSP_SUCCESS',data);
        });
        _socket.on('PLAY_CHESS_SUCCESS',function(data){
            _eventMgr.fire('PLAY_CHESS_SUCCESS',data);
        });
         _socket.on("CONNECT_STATE",function(data){
            if(data.posId == _gameMgr.playerData.self.posId){
                _gameMgr.playerData.self.connect_state = data.state;
            }else if (_gameMgr.playerData.target && (data.posId == _gameMgr.playerData.target.posId)){
                _gameMgr.playerData.target.connect_state = data.state;
            }
            _eventMgr.fire('CONNECT_STATE',data);
        });

    }

    that.login = function(uid,name,avatorUrl,score,room,play_mode,play_count,ob_uid,cbFunc){
        console.log("发送登录请求")
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,play_mode:play_mode,play_count:play_count,ob_uid:ob_uid,lanuch_url:cc.args['lanuch_url']});
        _cbLogin = cbFunc;
        //是否旁观
        _gameMgr.is_ob = cc.args['ob_uid'] !== undefined;
    }

    that.prepare = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('PREPARE');
    }
    that.playChess = function(x,y){
        if(that.checkIsObserve()) return;
        _socket.emit('PLAY_CHESS',{x:x,y:y});
    }
    that.retrackChess = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('RETRACK_CHESS');
    }
    that.retrackRsp = function(option){
        if(that.checkIsObserve()) return;
        _socket.emit('RETRACK_CHESS_RSP',option);
    }
    that.reqGameOver = function(data){
        if(that.checkIsObserve()) return;
        _socket.emit("REQ_GAME_OVER", data);

        _gameMgr.is_quit = _gameMgr.play_index >= _gameMgr.play_count;
    }
    that.checkIsObserve = function(){
        if(_gameMgr.is_ob){
            _eventMgr.fire('MESSAGE', "旁观中，不能操作游戏");
        }
        return _gameMgr.is_ob;
    }
    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr