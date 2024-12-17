import globalData from "../../globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        img_ready:cc.Node,
        lab_score:cc.Label,
    },
    name:"Avator",

    render(data){

        if(data === null || (data && data.uid === 0)){
            this.node.active = false;
            return;
        }

        var broken_txt = '';
        if(data.broken == 1){
            broken_txt = '(已破产)';
        }

        this.node.active = true;
        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        this.lab_name.string = data.name + broken_txt;

        this.lab_score.string = data.money +data.save_money + data.interest_money + "元";

        if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
            var that = this;
            cc.loader.load(data.avatorUrl, function (err, img) {
                if (!err) {
                    that._avatorUrl = data.avatorUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }
    },
});
