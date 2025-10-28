

cc.Class({
    extends: cc.Component,

    properties: {
        label:cc.Label,
        timer_count:5,
    },

    start () {
        
    },
    prepareTimer(){
        var that = this;
        that.timer_index = that.timer_count;
        if(that._timer) clearInterval(that._timer);
        that._timer = setInterval(function(){


        },1000);
    }
});
