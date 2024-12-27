cc.Class({
    extends: cc.Component,
    name:"Ice",
    properties: {

    },
    fadeOut:function(){
        this.node.runAction(cc.sequence(cc.fadeOut(1),
            // cc.delayTime(5),
            cc.callFunc(function () {
            this.node.color = cc.color(255, 255, 255, 255);
        }, this)))
    }
});