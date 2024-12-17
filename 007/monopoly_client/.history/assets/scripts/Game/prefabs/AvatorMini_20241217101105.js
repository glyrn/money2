
cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
    },
    name:"Avator",

    render(data){

        if(data === null || (data && data.uid === 0)){
            this.node.active = false;
            return;
        }

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
