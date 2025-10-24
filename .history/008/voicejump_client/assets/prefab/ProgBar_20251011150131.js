import globalData from "../script/data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        avator0: cc.Sprite,
        avator1: cc.Sprite,
        avator2: cc.Sprite,
        avator3: cc.Sprite,
        net_lost0:cc.Node,
        net_lost1:cc.Node,
        net_lost2:cc.Node,
        net_lost3:cc.Node,
    },
    name:"ProgBar",
    onLoad: function () {
        for (let i = 0; i < 4; i++) {
            this['avator' + i].node.active = false;
            this['avator' + i].node.getChildByName("label").active = false;
        }
        var that = this;
        globalData.eventlister.on("GAIN_SCORE_SUCCESS", function (data) {
            that.refresh();
        });
         globalData.eventlister.on("CONNECT_STATE1", function (data) {
            that.refresh();
        });
    },
    init: function () {
        var that = this;
        // that.node.active = true;
        for (let i = 0; i < cc.args['ready_count']; i++) {
            this['avator' + i].node.active = true;
            that['avator' + i].node.getChildByName("label").active = false;
            if(globalData.gameMgr.playerData[i].avatorUrl){

                let avatorUrl = globalData.gameMgr.playerData[i].avatorUrl;
                const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
                const ext = avatorUrl.slice(avatorUrl.lastIndexOf('.'));
                const is_image = exts.includes(ext.toLowerCase());
                var url = is_image ? avatorUrl : avatorUrl + '?aa=aa.jpg';
                console.log("头像:",url)
                cc.loader.load(url, function (err, img) {
                    if (!err) {
                        that['avator' + i].spriteFrame = new cc.SpriteFrame(img);
                        that['avator' + i].node.x = 0;
                    }
                });
            }
        }
    },
    refresh: function () {
        var that = this;
        for (let i = 0; i < cc.args['ready_count']; i++) {
            var data = globalData.gameMgr.playerData[i];
            if(data){
                if(data.game_type == 'fall'){
                    that['avator' + i].node.getChildByName("label").active = true;
                }else{
                    that['avator' + i].node.x = data.gain_score / 150 * 328;
                }
                that['net_lost' + i].active = data.connect_state == 0;
            }else{
                that['avator' + i].node.active = false;
            }

        }
    },
});