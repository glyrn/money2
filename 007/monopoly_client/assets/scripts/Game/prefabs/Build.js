
cc.Class({
    extends: cc.Component,
    properties: {
        flag0:cc.SpriteFrame,
        flag1:cc.SpriteFrame,
        flag2:cc.SpriteFrame,
        flag3:cc.SpriteFrame,
        flag4:cc.SpriteFrame,
        flag5:cc.SpriteFrame,
    },
    name: "Player",
    // update:function(){
    //
    //     var now = Date.parse(new Date()) / 1000;
    //     var timer_value = this._data.target_timer_value - now;
    //     if(this._data && timer_value >= 0){
    //
    //         this.clock.getChildByName('label').getComponent(cc.Label).string = timer_value;
    //
    //         if(timer_value == 0){
    //             this._data.target_timer_value = 0;
    //         }
    //     }
    // },
    render:function(data){

        this.avator = this.node.getChildByName('avator').getComponent("Avator");
        this.clock = this.node.getChildByName('clock');
        this.flag_sp = this.node.getChildByName('flag').getChildByName("img").getComponent(cc.Sprite)
        this.tips_index = 0;

        if(data && data.uid > 0) {

            this.flag_sp.spriteFrame = this['flag'+data.posId];
            this.node.active = true;
            this._data = data;
            this.avator.render(data);

        }else{
            this.node.active = false;

        }
    },

    reset:function(){

    },

});