import globalData from "./globalData"

cc.Class({
    extends: cc.Component,

    properties: {
        label:cc.Label,
    },

    update(){
        var _gameMgr = globalData.gameMgr;
        var server_time = _gameMgr.server_time;
        if((_gameMgr.roomState.state == 0 || _gameMgr.roomState.state == 2) &&
                    _gameMgr.playerData.self.state < 2 && server_time){
            var now = Math.floor(new Date().getTime() / 1000);
            var time_value = server_time + 10 - now + _gameMgr.diff_time;
            // console.log("time_value",time_value)
            if(time_value >= 0){
                this.label.string = "准备("+time_value+")";
            }else{
                globalData.socketMgr.prepare();
            }
        }
    }
});
