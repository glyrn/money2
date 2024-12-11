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
            'path':'/dfw_socket.io',
        }
        console.log(defines.serverUrl);

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

            _gameMgr.getPlayerData(posId).state = 2;
            _gameMgr.getPlayerData(posId).target_timer_value = Date.parse(new Date()) / 1000 + _gameMgr.roomState.timeout;
            _gameMgr.playerData.turn = posId;

            _eventMgr.fire('PREPARE_SUCCESS', posId);
        });
        _socket.on("LOGIN_SUCCESS", function (data) {
            _gameMgr.roomId = data.roomId;
            _gameMgr.playerData = data.playerData;
            _gameMgr.selfPosId = data.posId;
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
                _gameMgr.roomState.state = 0;
                _gameMgr.play_index = 0;
                for (const posId in _gameMgr.playerData) {
                    if(_gameMgr.playerData[posId]){
                        _gameMgr.playerData[posId].state = 1;
                    }
                }
            }

            _eventMgr.fire("SIT_CHANGE",data)
        })

        _socket.on('GAME_START',function(data){
            _gameMgr.roomState.state = 1;//进行中

            // _gameMgr.getPlayerData(data.turn).target_timer_value = Date.parse(new Date()) / 1000 + _gameMgr.roomState.timeout;
            _gameMgr.turn = data.turn;
            _gameMgr.game_map = data.game_map;
            for (let i = 0; i < _gameMgr.playerData.length; i++) {
                _gameMgr.getPlayerData(i).place_index = 0;
            }

            if(_gameMgr.is_quit){
                _gameMgr.is_quit = false;
                _gameMgr.play_index = 1;
            }else{
                _gameMgr.play_index++;
            }

            _eventMgr.fire("GAME_START",data);
            _eventMgr.fire('CHANGE_TURN',data);
        });

        _socket.on("MAKE_DICE_NUM_SUCCESS",function(data){
            _gameMgr.roomState.round = data.round;
            _gameMgr.playerData[data.posId].place_index = data.to_place_index;
            for (const i in data.interest_list) {
                var info = data.interest_list[i];
                _gameMgr.playerData[info.posId].interest_money = info.interest_money;
            }
            _eventMgr.fire('MAKE_DICE_NUM_SUCCESS', data);
        });

        _socket.on("NEXT_PLAYER_DICE_SUCCESS",function(data){
            _gameMgr.turn = data.turn;
            _eventMgr.fire('CHANGE_TURN',data);
        });

        _socket.on("BUY_BUILD_SUCCESS",function(data){
            _gameMgr.playerData[data.posId].money = data.money;
            var place_index = _gameMgr.playerData[data.posId].place_index;
            _gameMgr.game_map[place_index] = data.map_info;
            _eventMgr.fire('BUY_BUILD_SUCCESS', data);
        });

        _socket.on("PAY_RENT_SUCCESS",function(data){
            _gameMgr.playerData[data.posId1].money = data.money1;
            _gameMgr.playerData[data.posId2].money = data.money2;
            _gameMgr.game_map = data.game_map;
            _eventMgr.fire('PAY_RENT_SUCCESS', data);
        });

        _socket.on("IN_JAIL_SUCCESS",function(data){
            _eventMgr.fire('IN_JAIL_SUCCESS', data);
        });
        _socket.on('LUCKY_EVENT_SUCCESS',function(data){
            _gameMgr.playerData[data.posId].money = data.money;
            _eventMgr.fire('LUCKY_EVENT_SUCCESS', data);
        });
        _socket.on('PAY_BAIL_SUCCESS',function(data){
            _gameMgr.playerData[data.posId].money = data.money;
            _eventMgr.fire('PAY_BAIL_SUCCESS', data);
        });

        _socket.on('GAME_OVER',function(data){
            _gameMgr.roomState.state = 2;
            for (let i = 0; i < _gameMgr.playerData.length; i++) {
                _gameMgr.getPlayerData(i).state = 1;
            }
            _gameMgr.score_list.push(data);
            _eventMgr.fire("GAME_OVER",data);
        });

        _socket.on("SAVE_MONEY_SUCCESS",function(data){
            _gameMgr.playerData[data.posId].save_money = data.save_money;
            _gameMgr.playerData[data.posId].interest_money = data.interest_money;
            _gameMgr.playerData[data.posId].money = data.money;
            _eventMgr.fire("SAVE_MONEY_SUCCESS",data);
        });
        _socket.on("WITHDRAW_MONEY_SUCCESS",function(data){
            _gameMgr.playerData[data.posId].save_money = data.save_money;
            _gameMgr.playerData[data.posId].interest_money = data.interest_money;
            _gameMgr.playerData[data.posId].money = data.money;
            _eventMgr.fire("WITHDRAW_MONEY_SUCCESS",data);
        });
        _socket.on("BANK_SELL_BUILD_SUCCESS",function(data){
            for (let i = 0; i < data.sell_list.length; i++) {
                _gameMgr.game_map[data.sell_list[i]].is_sell = 1;
            }
            _eventMgr.fire("BANK_SELL_BUILD_SUCCESS");
        });
        _socket.on("BUY_BANK_ASSET_SUCCESS",function(data){
            for (let i = 0; i < data.buy_list.length; i++) {
                _gameMgr.game_map[data.buy_list[i]].is_sell = 0;
                _gameMgr.game_map[data.buy_list[i]].belong = data.posId;
            }
            _gameMgr.getPlayerData(data.posId).money = data.money;
            _eventMgr.fire("BUY_BANK_ASSET_SUCCESS");
        });
        _socket.on('PLAYER_BROKEN',function(data){
            _gameMgr.setPlayerData(data.posId).broken = 1;
            _eventMgr.fire("PLAYER_BROKEN");
        })
    }

    that.login = function(uid,name,avatorUrl,score,room,play_mode,start_money,max_turns,cbFunc){
        _socket.emit('LOGIN', {uid:uid,room:room,name:name,avatorUrl:avatorUrl,score:score,play_mode:play_mode,start_money:start_money,max_turns:max_turns});
        _cbLogin = cbFunc;
    }

    that.prepare = function(){
        _socket.emit('PREPARE');
    }
    that.makeDiceNum = function(){
        _socket.emit('MAKE_DICE_NUM');
    }
    that.showBank = function(){
        _socket.emit("SHOW_BANK");
    }
    that.buyBuild = function(){
        _socket.emit('BUY_BUILD');
    }
    that.buyBankAsset = function(data){
        _socket.emit("BUY_BANK_ASSET",data);
    }
    that.payRent = function(){
        _socket.emit('PAY_RENT');
    }
    that.nextPlayerDice = function(){
        _socket.emit('NEXT_PLAYER_DICE');
    }
    that.payBail = function(){
        _socket.emit('PAY_BAIL');
    }
    that.inJail = function(){
        _socket.emit('IN_JAIL');
    }
    that.luckyEvent = function(){
        _socket.emit('LUCKY_EVENT');
    }
    that.saveMoney = function(data){
        _socket.emit("SAVE_MONEY",data);
    }
    that.withdrawMoney = function(){
        _socket.emit("WITHDRAW_MONEY");
    }
    that.bankSellBuild = function(data){
        _socket.emit("BANK_SELL_BUILD",data)
    }
    that.getSocket = function(){
        return _socket;
    }
    return that
}

export default socketMgr