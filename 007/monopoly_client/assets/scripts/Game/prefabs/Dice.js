cc.Class({
    name: "Dice",
    extends: cc.Component,
    properties: {
        spriteNum1:cc.SpriteFrame,
        spriteNum2:cc.SpriteFrame,
        spriteNum3:cc.SpriteFrame,
        spriteNum4:cc.SpriteFrame,
        spriteNum5:cc.SpriteFrame,
        spriteNum6:cc.SpriteFrame,
        tips:cc.Node,
    },
    start(){
        this.getComponent(cc.Animation).on('finished',  this.onFinished, this);
    },
    onFinished(){

        this.getComponent(cc.Sprite).spriteFrame = this['spriteNum'+this.show_num];

        var that = this;
        this.scheduleOnce(function(){
            if(!that.isShow) {
                that.tips.active = true;
                that.node.active = false;
            }
            if(that.cbFunc){
                that.cbFunc()
            }
        },0.4)
    },
    playNum(num,cbFunc){
        this.getComponent(cc.Button).interactable = false;
        this.node.active = true;
        this.tips.active = false;
        this.show_num = num
        this.cbFunc = cbFunc;
        this.getComponent(cc.Animation).play()
    }
})