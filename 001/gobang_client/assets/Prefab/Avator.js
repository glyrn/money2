import globalData from "../Script/data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        img_ready:cc.Node,
        img_box :cc.Sprite,
        whiteSpriteFrame:{//白棋的图片
            default:null,
            type:cc.SpriteFrame
        },

        blackSpriteFrame:{//黑棋的图片
            default:null,
            type:cc.SpriteFrame
        },

        pcSpriteFrame:{//pc图片
            default:null,
            type:cc.SpriteFrame
        },
        lab_score:cc.Label,
    },
    name:"Avator",

    render(data,flag){

        if(data == null){
            return;
        }

        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        this.lab_name.string = data.name;
        this.lab_score.string = data.score + "分";

        if(globalData.gameMgr.play_mode == 0){
            if(flag == 'self'){
                this.img_box.spriteFrame = this.whiteSpriteFrame;
            }else{
                this.img_box.spriteFrame = this.blackSpriteFrame;
            }
        }else{
            if(data.posId == 0){
                this.img_box.spriteFrame = this.whiteSpriteFrame
            }else{
                this.img_box.spriteFrame = this.blackSpriteFrame
            }
        }

        if(flag == 'pc') {

            this.img_avatar.spriteFrame = this.pcSpriteFrame
        }else {
            if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
                var that = this;
                // var avatorUrl;
                // if (window.defines.serverUrl == 'localhost:8002') {
                //     avatorUrl = this._avatorUrl;
                // } else {
                //     avatorUrl = 'http://42.51.37.98:8002/avator/' + data.uid + '.jpg'
                // }
                cc.loader.load(avatorUrl, function (err, img) {
                    if (!err) {
                        that._avatorUrl = data.avatorUrl;
                        that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                    }
                });
            }
        }
    },
    setData(data,flag){
        this.render(data,flag);
    }
});
