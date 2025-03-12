cc.Class({
    extends: cc.Component,
    name:"Effect",
    properties: {
        isRepeatMoveX:false,
        isRepeatMoveY:false,
        moveOffset:200,
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
        var that = this;
        if(this.isRepeatMoveX){
            this.node.runAction(
                cc.repeatForever(
                    cc.sequence(
                    cc.moveBy(1,that.moveOffset,0),
                    cc.moveBy(1,-that.moveOffset,0)
                ))
            )
        }else if(this.isRepeatMoveY){
            this.node.runAction(
                cc.repeatForever(
                    cc.sequence(
                        cc.moveBy(1,0,that.moveOffset),
                        cc.moveBy(1,0,-that.moveOffset)
                    ))
            )
        }
    }
});