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

        this.node.active = true;
        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        this.lab_name.string = data.name;
        var offset_txt = '';
        if(data.score_offset > 0){
            offset_txt = "(+"+data.score_offset+")";
        }else if(data.score_offset < 0 ){
            offset_txt = "("+data.score_offset+")";
        }

        this.lab_score.string = data.score + offset_txt + "分";

        if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
            var that = this;
            var avatorUrl;
            if (window.defines.serverUrl == 'localhost:8005') {
                avatorUrl = this._avatorUrl;
            } else {
                avatorUrl = 'http://42.51.40.147:8005/avator/' + data.uid + '.jpg'
            }
            cc.loader.load(avatorUrl, function (err, img) {
                if (!err) {
                    that._avatorUrl = data.avatorUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }
    },
});
