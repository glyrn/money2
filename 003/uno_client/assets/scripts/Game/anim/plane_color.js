cc.Class({
    extends: cc.Component,
    name:"PlaneColor",
    properties: {
        frame_select:cc.Node,
        btn_color1:cc.Node,
        btn_color2:cc.Node,
        btn_color3:cc.Node,
        btn_color4:cc.Node,
    },

    playAnim (isRepeat=false) {
        var that = this;

        var animTime = 0.25;
        var scale = 1.05;
        this.node.stopAllActions();

        var seq = cc.sequence(
            cc.callFunc(function () {
                that.frame_select.active = false;
            }, this),
            cc.callFunc(function(){
                that.btn_color2.runAction(cc.sequence(cc.scaleTo(animTime / 2,scale,scale),cc.scaleTo(animTime / 2,1,1)))
            },this),
            cc.delayTime(animTime),
            cc.callFunc(function(){
                that.btn_color3.runAction(cc.sequence(cc.scaleTo(animTime / 2,scale,scale),cc.scaleTo(animTime / 2,1,1)))
            },this),
            cc.delayTime(animTime),
            cc.callFunc(function(){
                that.btn_color4.runAction(cc.sequence(cc.scaleTo(animTime / 2,scale,scale),cc.scaleTo(animTime / 2,1,1)))
            },this),
            cc.delayTime(animTime),
            cc.callFunc(function(){
                that.btn_color1.runAction(cc.sequence(cc.scaleTo(animTime / 2,scale,scale),cc.scaleTo(animTime / 2,1,1)))
            },this),
            cc.delayTime(animTime),
            
        );
        if(isRepeat){
            this.node.runAction(cc.repeatForever(seq));
        }else{
            this.node.runAction(seq);
        }
    },

    selectCardAnim(color){
        this.node.stopAllActions();
        for (let index = 1; index <= 4; index++) {
            this['btn_color'+index].stopAllActions();
            this['btn_color'+index].scale = 1;
        }

        // var animTime = 0.5;
        var that = this;
        // this['btn_color'+color].runAction(
        //     cc.sequence(
        //         cc.scaleTo(animTime,1.4),
        //         cc.callFunc(function () {
                    that.frame_select.active = true;
        //         }, this)
        //     )
        // );

    }

});
