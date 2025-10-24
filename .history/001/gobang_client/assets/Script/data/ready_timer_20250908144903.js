import globalData from "./globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        label:cc.Label,
        timer_count:5,
    },

    update(){
        var _gameMgr = lobalData.gameMgr;
        if(_gameMgr.playerData.self.state == 2 && _gameMgr.roomState.state != 1){

            var server_time = _gameMgr.server_time;
            var now = Math.floor(new Date().getTime() / 1000);
            var time_value = server_time + this.timer_count - now;
            if(time_value >= 0){
                this.label.string = "准备("+time_value+")";
            }else{
                globalData.socketMgr.prepare();
            }
        }
        // if()
    }
    // onEnable(){
    //     var that = this;
    //     if(!that.isRunning){

    //         that.isRunning = true;

    //         that.timer_index = that.timer_count - 1;
    //         if(that._timer) clearInterval(that._timer);
    //         that._timer = setInterval(function(){
                
    //             if(globalData.gameMgr.is_quit){
    //                 if(that._timer) clearInterval(that._timer);
    //                 return;
    //             }

    //             that.label.string = "准备("+that.timer_index+")";

    //             if(that.timer_index <= 0){
    //                 if(that._timer) clearInterval(that._timer);
    //                 that.isRunning = false;
    //                 globalData.socketMgr.prepare();
    //             }else{
    //                 that.timer_index--;
    //             }
    //         },1000);

    //         that.label.string = "准备("+that.timer_count+")";
    //     }
    // },
    // onDisable(){
    //     var that = this;
    //     if(that._timer) clearInterval(that._timer);
    //     that.isRunning = false;
    // }
});
