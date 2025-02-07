cc.Class({
    extends: cc.Component,
    name:"Effect",
    properties: {
        isRepeatMove:false,
    },
    fadeOut:function(){
        var that = this;
        this.node.getComponent(cc.BoxCollider).enabled = false;
        this.node.runAction(cc.sequence(
            cc.fadeOut(1),
            cc.delayTime(2),
            cc.callFunc(function () {
                that.node.opacity = 255;
                that.node.getComponent(cc.BoxCollider).enabled = true;
            }, that)
        ))
    },
    start:function(){
        if(this.isRepeatMove){
            this.node.runAction(
                cc.repeatForever(
                    cc.sequence(
                    cc.moveBy(1,200,0),
                    cc.moveBy(1,-200,0)
                ))
            )
        }
    }
});