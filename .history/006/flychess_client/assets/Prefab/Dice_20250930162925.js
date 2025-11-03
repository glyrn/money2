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
        p0:cc.Node,
        p1:cc.Node,
        p2:cc.Node,
        p3:cc.Node,
        // tips:cc.Node,
        button:cc.Button,
        animation:cc.Animation,
        sprite:cc.Sprite,
    },
    start(){
        this.animation.on('finished',  this.onFinished, this);
    },
    onFinished(){
        this.sprite.spriteFrame = this['spriteNum'+this.show_num];

        var that = this;
        this.scheduleOnce(function(){
            if(!that.isShow) {
                // that.tips.active = true;
                that.animation.node.active = false;
            }
            if(that.cbFunc){
                that.cbFunc()
            }
        },0.4)
    },
    playNum(num,posId,cbFunc){
        this.button.node.active = false;
        this.animation.node.active = true;
        // this.tips.active = false;
        this.show_num = num
        this.cbFunc = cbFunc;
        this.sprite.node.position = this['p'+posId].position;
        this.animation.play()
    },
    showNum(num,posId,cbFunc){
        this.button.node.active = false;
        this.animation.node.active = true;
        // this.tips.active = false;
        this.show_num = num
        this.cbFunc = cbFunc;
        this.sprite.node.position = this['p'+posId].position;

        this.sprite.spriteFrame = this['spriteNum'+this.show_num];
        if(!this.isShow) {
            // this.tips.active = true;
            this.animation.node.active = false;
        }
        if(this.cbFunc){
            this.cbFunc()
        }
    },
    resetPosition(posId){
        this.button.node.active = false;
        this.sprite.node.position = this['p'+posId].position;
    }
})