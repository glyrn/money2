
cc.Class({
    extends: cc.Component,
    properties: {
        sp_build1:cc.SpriteFrame,
        sp_build2:cc.SpriteFrame,
        sp_build3:cc.SpriteFrame,
        sp_build4:cc.SpriteFrame,
        sp_luck:cc.SpriteFrame,
        sp_prison:cc.SpriteFrame,
        sp_flag0:cc.SpriteFrame,
        sp_flag1:cc.SpriteFrame,
        sp_flag2:cc.SpriteFrame,
        sp_flag3:cc.SpriteFrame,
        sp_flag4:cc.SpriteFrame,
        sp_flag5:cc.SpriteFrame,
        img:cc.Sprite,
        flag:cc.Sprite,
        idx:cc.Label,
    },
    name: "Building",

    render:function(data){

        if(data){
            this._data = data;

            this.idx.string = data.idx+1;
            if(data.type == 1){ //命运
                this.flag.spriteFrame = null;
                this.img.spriteFrame = this.sp_luck;
            }else if(data.type == 2) { //监狱
                this.flag.spriteFrame = null;
                this.img.spriteFrame = this.sp_prison;
            }else if (data.type == 3) { //已买地
                this.flag.spriteFrame = this['sp_flag'+data.belong];
                this.img.spriteFrame = this['sp_build'+data.build];
            }else{ //空
                this.flag.spriteFrame = null;
                this.img.spriteFrame = null;
            }

        }
    },

    reset:function(){

    },

});