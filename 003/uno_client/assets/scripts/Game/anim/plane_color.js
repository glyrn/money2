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

    playAnim () {
        var that = this;

        var animTime = 0.25;
        var scale = 1.2;
        this.node.stopAllActions();
        this.node.runAction(cc.sequence(
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
            cc.callFunc(function () {
                that.frame_select.active = true;
            }, this)
        ));
    },

});
