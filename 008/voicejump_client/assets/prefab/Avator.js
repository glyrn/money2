import globalData from "../script/data/globalData";
import Brid from "../prefab/Bird"

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        img_ready:cc.Node,
        img_dead:cc.Node,
        player:Brid,
        img_net_lost:cc.Node,
    },
    name:"Avator",

    render(data){

        if(data === null || (data && data.uid === 0)){
            this.node.active = false;
            return;
        }

        this.node.active = true;

        if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
            var that = this;

            const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
            const ext = data.avatorUrl.slice(data.avatorUrl.lastIndexOf('.'));
            const is_image = exts.includes(ext.toLowerCase());
            var url = is_image ? data.avatorUrl : data.avatorUrl + '?aa=aa.jpg';
            console.log("头像：",url)
            cc.loader.load(url, function (err, img) {
                if (!err) {
                    that._avatorUrl = data.avatorUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }

        
        this.lab_name.string = globalData.utils.subStringResult(data.name,7);
        this.img_net_lost.active = data.connect_state == 0;
        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        // this.img_dead.active = data.game_type == 'fall';
    },
});
