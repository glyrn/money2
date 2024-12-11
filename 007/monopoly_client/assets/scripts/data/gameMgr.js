
const gameMgr = function(){

    var that = {};
    var _socketMgr = null;
    var _eventMgr = null;
    var _validateMgr = null

    that.setSocketMgr = function(socketMgr){
        _socketMgr = socketMgr
    }
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    }
    that.setValidateMgr = function(validateMgr){
        _validateMgr = validateMgr
    }

    that.posId =  '';//座位号
    that.turn = -1; //轮到谁
    that.play_count = 0; //局数
    that.score_list = [];
    that.game_map = [];
    that.lossBeatNums = 0; //丢失心跳次数

        //房间状态
    that.roomState = {
        round:0,//第几轮
        state: 0,//0准备状态  1打牌状态 2结束状态
    };

    //座位状态
    /**
     * {
     *      uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            money:0,
     * }
     */
    that.playerData = [];

    that.beatCount = function(){
        that.lossBeatNums++;
        if(that.lossBeatNums >= 3){
            _eventMgr.fire('MESSAGE','游戏已断线！');
        }
        setTimeout(that.beatCount,5000);
    }

    that.checkBeat = function(){
        setTimeout(that.beatCount,5000);
    }

    that.getPlayerData = function (posId) {
        return this.playerData[posId];
    }

    that.getSelfData = function(){
        return this.playerData[this.selfPosId];
    }

    that.setPlayerData = function(posId,data){
        this.playerData[posId] = data;
    }

    that.resetRoomStatus = function () {
        that.posId = '';
        that.deskId = '';
        that.posState.self.state = 0;
        that.roomState.state = 0;
    }

    return that;
}

export default gameMgr