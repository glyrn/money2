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
    update(){

        var d = new Date();
        var seconds = d.getSeconds();
        if(seconds % 2 === 0){

            if(this.last_seconds == seconds){
                return;
            }
            this.last_seconds = seconds;

            this.node.position = this.basePosition;
            this.resetAction();
        }
    },
    resetAction(){
        var that = this;
        if(this.isRepeatMoveX){
            if(that.moveXAction){
                that.node.stopAction(that.moveXAction);
            }
            that.moveXAction = that.node.runAction(cc.repeatForever(
                cc.sequence(
                    cc.moveBy(1,that.moveOffset,0),
                    cc.moveBy(1,-that.moveOffset,0)
                )));
        }else if(this.isRepeatMoveY){
            if(that.moveYAction){
                that.node.stopAction(that.moveYAction);
            }
            that.moveYAction = that.node.runAction(cc.repeatForever(
                cc.sequence(
                    cc.moveBy(1,0,that.moveOffset),
                    cc.moveBy(1,0,-that.moveOffset)
                )));
        }
    },
    start:function(){
        var that = this;
        that.basePosition = this.node.position;
    }
});