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
        img_net_lost:cc.Node,
        img_avator_light:cc.Sprite,
        lab_timer:cc.Label,
        node_timer:cc.Node,
    },
    name:"Avator",
    update(){

        if(this._posId == globalData.gameMgr.playerData.turn){
            this.node_timer.active = true;
            var now = Math.floor(new Date().getTime() / 1000);
            var time_value = globalData.gameMgr.time_out - now;
            if(time_value >=0 ){
                this.img_avator_light.fillRange = - (time_value/90);
                this.lab_timer.string = time_value;
            }else{
                this.node_timer.active = false;
            }
        }else{
            this.node_timer.active = false;
        }

    },
    render(data,flag){

        if(data == null){
            return;
        }

        this._posId = data.posId;
        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
        this.lab_name.string = data.name;
        this.lab_score.string = data.score;
        this.img_net_lost.active = data.connect_state == 0;

        if(flag == 'pc') {

            this.img_avatar.spriteFrame = this.pcSpriteFrame;
            this.flag.active = false;
        }else {

            if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
                var that = this;
                // var avatorUrl;
                // if (window.defines.serverUrl == 'localhost:8004') {
                //     avatorUrl = this._avatorUrl;
                // } else {
                //     avatorUrl = 'http://42.51.37.98:8004/avator/' + data.uid + '.jpg'
                // }
                const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
                const ext = data.avatorUrl.slice(data.avatorUrl.lastIndexOf('.'));
                const is_image = exts.includes(ext.toLowerCase());
                var url = is_image ? data.avatorUrl : data.avatorUrl + '?aa=aa.jpg';

                cc.loader.load(url, function (err, img) {
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
