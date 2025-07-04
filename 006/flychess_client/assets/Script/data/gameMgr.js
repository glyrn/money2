const gameMgr = function(){

    var that = {};
    var _socketMgr = null;
    var _eventMgr = null;

    that.setSocketMgr = function(socketMgr){
        _socketMgr = socketMgr
    }
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    }

    that.lossBeatNums = 0; //丢失心跳次数
    that.play_mode = -1; //0人机对战  1人人对战
    that.score_list = [];
    that.roomState = {
        state:0, //0未开始 1进行中 2结算
        roomId:''
    }
    that.playerData = {
        0:{
            posId:-1,
            uid:0,
            name:'',
            score:0,
            avatorUrl:'',
            state:1,
        },
        1:{
            posId:-1,
            uid:0,
            name:'',
            score:0,
            avatorUrl:'',
            state:1,
        },
        2:{
            posId:-1,
            uid:0,
            name:'',
            score:0,
            avatorUrl:'',
            state:1,
        },
        3:{
            posId:-1,
            uid:0,
            name:'',
            score:0,
            avatorUrl:'',
            state:1,
        }
    }; //玩家信息

    that.checkBeat = function(){
        if(that._checkBeatId) clearInterval(that._checkBeatId);
        that._checkBeatId = setInterval(() => {
            that.lossBeatNums++;
            if(that.lossBeatNums >= 3){
                _eventMgr.fire('MESSAGE','游戏已断线！');
            }
        }, 5000);
    }
    
    return that;
}

export default gameMgr