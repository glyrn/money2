

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
        
    },
    setData(data,flag){
        this.render(data,flag);
    }
});
