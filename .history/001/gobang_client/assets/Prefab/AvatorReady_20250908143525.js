

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        pcSpriteFrame:{//pc图片
            default:null,
            type:cc.SpriteFrame
        },
        lab_name:cc.Label,
        img_net:cc.Node,
        img_ready:cc.Node,
    },
    name:"AvatorMini",

    render(data,flag){

        if(data == null){
            return;
        }


        this.lab_name.string = data.name;
        this.img_net.active = data.connect_state === 0;
        this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;

        if(flag == 'pc') {

            this.img_avatar.spriteFrame = this.pcSpriteFrame
        }else {
            if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {
                var that = this;

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
