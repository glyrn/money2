

cc.Class({
    extends: cc.Component,
    properties: {
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        lab_score:cc.Label,
        sp_airplane:cc.Sprite,
        sp_airplane_fly:cc.Sprite,
        colorPlane0sf:cc.SpriteFrame,
        colorPlane1sf:cc.SpriteFrame,
        colorPlane2sf:cc.SpriteFrame,
        colorPlane3sf:cc.SpriteFrame,
        colorPlaneFly0sf:cc.SpriteFrame,
        colorPlaneFly1sf:cc.SpriteFrame,
        colorPlaneFly2sf:cc.SpriteFrame,
        colorPlaneFly3sf:cc.SpriteFrame,
    },
    name:"AvatorMini",

    render(data){

        if(data == null){
            return;
        }

        this.lab_name.string = data.name;
        this.lab_score.string = data.score;

        this.sp_airplane.spriteFrame = this['colorPlane'+data.posId+'sf'];
        this.sp_airplane_fly.spriteFrame = this['colorPlaneFly'+data.posId+'sf'];

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
});
