cc.Class({
    extends: cc.Component,

    properties: {
        label:cc.Label,
    },

    update(){

        var now = Math.floor(new Date().getTime() / 1000);
        if(!this._target_time || this._target_time + 5 < now){
            this._target_time = now + 5;
        }

        var time_value = this._target_time - now;
        if(time_value >= 0){
            this.label.string = "继续游戏("+time_value+")";
        }else{
            this.node.parent.active = false;
        }
    }
});
