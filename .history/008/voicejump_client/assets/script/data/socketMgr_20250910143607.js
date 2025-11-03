import globalData from "./globalData";

if(window.io == undefined){
    console.error("找不到socket.io.js库文件");
}
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
    that.setUtils = function(utils){
        _utils = utils;
    },
    that.initSocket = function() {

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
            opts['path'] = '/voice_socket.io';
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
                                console.log("进入场景")
                                that.login(cc.args['uid'], cc.args['name'], cc.args['avatorUrl'], cc.args['score'], cc.args['room'],
                                cc.args['ready_count'], cc.args['play_count'], cc.args['ob_uid'], function () {
                                    // clearTimeout(that._handler);
                                    
                                });
                            });
                            
                        } else {
                            console.log("用户信息：")
                            _utils.post(defines.yc_domain+"/client/alchemy/callback/checkSign", {sign: cc.args['sign']}, function (isOk, data) {
                                if (isOk) {
                                    console.log("用户信息：",data)

                                    cc.director.loadScene("Game",function(){
                                        that.login(data.data.userId, data.data.nickname, data.data.avatar, cc.args['score'], cc.args['room'],
                                            cc.args['ready_count'], cc.args['play_count'], cc.args['ob_uid'], function () {

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
            console.log("MESSAGE:" + msg);
            if(_gameMgr.isRecover) return;
            _eventMgr.fire('MESSAGE', msg);
        });

        _socket.on('PREPARE_SUCCESS',function(posId){
            if(_gameMgr.playerData[posId]){
                _gameMgr.playerData[posId].state = 2;
                _gameMgr.playerData[posId].game_type = 'normal';
                _eventMgr.fire('PREPARE_SUCCESS',posId);
            }
        });

        _socket.on("LOGIN_SUCCESS", function (data) {
  
            _gameMgr.playerData = JSON.parse(JSON.stringify(data.playerData));
            _gameMgr.roomState.roomId = data.roomId;
            _gameMgr.playerData = data.playerData;
            _gameMgr.play_mode = data.play_mode;
            _gameMgr.posId = data.posId;
            _gameMgr.play_index = 0;
            _gameMgr.play_count = data.play_count;
            _gameMgr.server_time = data.server_time;
            var now = Math.floor(new Date().getTime() / 1000);
            _gameMgr.diff_time = now - data.server_time;
            // _gameMgr.checkBeat();
            
            _eventMgr.fire("LOGIN_SUCCESS");
            if (_cbLogin) {
                _cbLogin();
            }
        });

        _socket.on("SIT_CHANGE",function(data){

            _gameMgr.playerData = JSON.parse(JSON.stringify(_gameMgr.playerData));
            //对手逃跑 重置游戏
            if(data.target == null){
                //debug
                // _gameMgr.playerData[data.posId] = null;
                // _gameMgr.roomState.state = 0;
            }else{
                _gameMgr.playerData[data.posId] = data.target;
            }
            _eventMgr.fire("SIT_CHANGE",data);
        })

        _socket.on("REFRESH_DATA",function(data){
            _eventMgr.fire("REFRESH_DATA",data)
        });

        _socket.on("BIRD_MOVE_SUCCESS",function(data){
            _eventMgr.fire("BIRD_MOVE_SUCCESS",data)
        });
        _socket.on("GAIN_SCORE_SUCCESS",function(data){
            console.log("GAIN_SCORE_SUCCESS",data,_gameMgr.playerData)
            _gameMgr.playerData[data.posId].gain_score = data.gain_score;
            _eventMgr.fire("GAIN_SCORE_SUCCESS",data)
        })
        _socket.on("FALL_OVER_SUCCESS",function(data){
            _gameMgr.playerData[data.posId].game_type = 'fall';
            _eventMgr.fire("FALL_OVER_SUCCESS",data)
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
            _gameMgr.roomState.gametime_remain = parseInt(data.start_time) + 5 * 60;
            _gameMgr.server_time = data.server_time;
            var now = Math.floor(new Date().getTime() / 1000);
            _gameMgr.diff_time = now - data.server_time;
            _eventMgr.fire("GAME_START",data);
        })
        _socket.on("SET_RECOVER_STATUS",function(data){
            _gameMgr.isRecover = data.isRecover;
            _eventMgr.fire("SET_RECOVER_STATUS");
        });
        _socket.on('GAME_OVER',function(data){
            _gameMgr.roomState.state = 2;
            _gameMgr.server_time = Math.floor(new Date().getTime() / 1000);
            _gameMgr.score_list.push(data);
            for (const posId in _gameMgr.playerData) {
                if(_gameMgr.playerData[posId]){
                    _gameMgr.playerData[posId].state = 1;
                }
            }

            _gameMgr.is_quit = _gameMgr.play_index >= _gameMgr.play_count;
            _eventMgr.fire("GAME_OVER",data);
        });

        _socket.on("CONNECT_STATE",function(data){
            if(_gameMgr.playerData[data.posId]){
                _gameMgr.playerData[data.posId].connect_state = data.state;
            }
            _eventMgr.fire('CONNECT_STATE',data);
            _eventMgr.fire('CONNECT_STATE1',data);
        });
    }

    that.login = function(uid,name,avatorUrl,score,room,ready_count,play_count,ob_uid,cbFunc){
        console.log("发送登录请求",cc.args['lanuch_url'])
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,ready_count:ready_count,play_count:play_count,ob_uid:ob_uid,lanuch_url:cc.args['lanuch_url']});
        _cbLogin = cbFunc;
        //是否旁观
        _gameMgr.is_ob = cc.args['ob_uid'] !== undefined;
    }
    that.checkIsObserve = function(){
        if(_gameMgr.is_ob){
            // _eventMgr.fire('MESSAGE', "旁观中，不能操作游戏");
        }
        return _gameMgr.is_ob;
    }
    that.prepare = function(){
        if(that.checkIsObserve()) return;
        _socket.emit('PREPARE');
    }
    that.birdMove = function(data){
        if(that.checkIsObserve()) return;
        if(!that._cur_x){
            that._cur_x = data.cur_x;
        }else{
            if(data.cur_x <= that._cur_x){
                //去除冗余数据
                return;
            }
        }

        _socket.emit('BIRD_MOVE',data);
    }
    that.fallOver = function(data){
        if(that.checkIsObserve()) return;
        _socket.emit('FALL_OVER',data);
    }
    that.gainScore = function(data){
        if(that.checkIsObserve()) return;
        _socket.emit('GAIN_SCORE', data);
    }
    that.getSocket = function(){
        return _socket;
    }

    return that
}

export default socketMgr