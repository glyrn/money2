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
        img_net_lost:cc.Node,
        img_avator_light:cc.Sprite,
        lab_timer:cc.Label,
        node_timer:cc.Node,
    },
    name:"Avator",
    update(){

        if(this._posId == globalData.gameMgr.playerData.turn){
            this.node_timer.active = true;
            var now_ts = (new Date().getTime() / 1000);
            var time_value = globalData.gameMgr.time_out - Math.floor(now_ts);
            var time_value_ts = globalData.gameMgr.time_out - now_ts;
            if(time_value >=0 ){
                this.img_avator_light.fillRange = - (time_value_ts/90);
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
        this.lab_name.string = globalData.utils.subStringResult(data.name,7);
        this.lab_score.string = data.score;
        this.img_net_lost.active = data.connect_state == 0;

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
        }
    },
    setData(data,flag){
        this.render(data,flag);
    }
});
