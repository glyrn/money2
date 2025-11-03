import globalData from "../../globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        img_ready:cc.Node,
        lab_score:cc.Label,
        img_net_lost:cc.Node,
        img_avator_light:cc.Sprite,
        lab_timer:cc.Label,
        node_timer:cc.Node,
    },
    name:"Avator",

    render(data){

        if(data === null || (data && data.uid === 0)){
            this.node.active = false;
            return;
        }

        this.node.active = true;
        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        this.img_net_lost.active = data.connect_state == 0;
        this.lab_name.string = globalData.utils.subStringResult(data.name,7);
        var offset_txt = '';
        if(data.score_offset > 0){
            offset_txt = "(+"+data.score_offset+")";
        }else if(data.score_offset < 0 ){
            offset_txt = "("+data.score_offset+")";
        }

        this.lab_score.string = data.score + offset_txt;

        if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
            var that = this;
            // var avatorUrl;
            // if (window.defines.serverUrl == 'localhost:8005') {
            //     avatorUrl = this._avatorUrl;
            // } else {
            //     avatorUrl = 'http://42.51.37.98:8005/avator/' + data.uid + '.jpg'
            // }

            const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
            const ext = data.avatorUrl.slice(data.avatorUrl.lastIndexOf('.'));
            const is_image = exts.includes(ext.toLowerCase());
            var url = is_image ? data.avatorUrl : data.avatorUrl + '?aa=aa.jpg';
            
            cc.loader.load(url, function(err,img){
                if(!err){
                    that._avatorUrl = data.avatorUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }
    },
});
