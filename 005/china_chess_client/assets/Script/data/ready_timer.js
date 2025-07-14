import globalData from "./globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        label:cc.Label,
        timer_count:5,
    },

    onEnable(){
        var that = this;
        if(!that.isRunning){

            that.isRunning = true;

            that.timer_index = that.timer_count - 1;
            if(that._timer) clearInterval(that._timer);
            that._timer = setInterval(function(){
                
                that.label.string = "准备("+that.timer_index+")";

                if(that.timer_index <= 0){
                    if(that._timer) clearInterval(that._timer);
                    that.isRunning = false;
                    globalData.socketMgr.prepare();
                }else{
                    that.timer_index--;
                }
            },1000);

            that.label.string = "准备("+that.timer_count+")";
        }
    },
    onDisable(){
        var that = this;
        if(that._timer) clearInterval(that._timer);
        that.isRunning = false;
    }
});
