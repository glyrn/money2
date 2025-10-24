import globalData from "./globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        label:cc.Label,
        timer_count:5,
    },

    update(){
        var _gameMgr = globalData.gameMgr;
        console.log("_gameMgr.posState.self.state")
        if(_gameMgr.posState.self.state < 2){

            var server_time = _gameMgr.server_time;
            var now = Math.floor(new Date().getTime() / 1000);
            var time_value = server_time + this.timer_count - now;
            if(time_value >= 0){
                this.label.string = "准备("+time_value+")";
            }else{
                globalData.socketMgr.prepare();
            }
        }
    }
});
