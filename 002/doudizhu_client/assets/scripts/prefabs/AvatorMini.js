

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
    },
    name:"AvatorMini",

    render(data){

        if(data == null){
            return;
        }

        this.lab_name.string = data.name;

        if (this._avatarUrl != data.avatarUrl && data.avatarUrl != null && data.avatarUrl != '') {
            var that = this;

            const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
            const ext = data.avatarUrl.slice(data.avatarUrl.lastIndexOf('.'));
            const is_image = exts.includes(ext.toLowerCase());
            var url = is_image ? data.avatarUrl : data.avatarUrl + '?aa=aa.jpg';

            cc.loader.load(url, function (err, img) {
                if (!err) {
                    that._avatarUrl = data.avatarUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }
        
    },
});
