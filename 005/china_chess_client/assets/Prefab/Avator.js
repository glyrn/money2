import globalData from "../Script/data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        img_ready:cc.Node,
        pcSpriteFrame:{//pc图片
            default:null,
            type:cc.SpriteFrame
        },
        lab_score:cc.Label,
        flag:cc.Node,
    },
    name:"Avator",

    render(data,flag){

        if(data == null){
            return;
        }

        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        this.lab_name.string = data.name;
        this.lab_score.string = data.score + "分";

        if(flag == 'pc') {

            this.img_avatar.spriteFrame = this.pcSpriteFrame;
            this.flag.active = false;
        }else {

            if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
                var that = this;
                var avatorUrl;
                if (window.defines.serverUrl == 'localhost:8004') {
                    avatorUrl = this._avatorUrl;
                } else {
                    avatorUrl = 'http://42.51.37.98:8004/avator/' + data.uid + '.jpg'
                }
                cc.loader.load(avatorUrl, function (err, img) {
                    if (!err) {
                        that._avatorUrl = data.avatorUrl;
                        that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                    }
                });
            }

            this.flag.active = globalData.gameMgr.play_mode == 1 &&
                                globalData.gameMgr.playerData.turn == data.posId;
        }
    },
    setData(data,flag){
        this.render(data,flag);
    }
});
