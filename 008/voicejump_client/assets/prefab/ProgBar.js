import globalData from "../script/data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        avator0: cc.Sprite,
        avator1: cc.Sprite,
        avator2: cc.Sprite,
        avator3: cc.Sprite,
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
        })
    },
    init: function () {
        var that = this;
        that.node.active = true;
        for (let i = 0; i < globalData.gameMgr.playerData.length; i++) {
            this['avator' + i].node.active = true;
            that['avator' + i].node.getChildByName("label").active = false;
            if(globalData.gameMgr.playerData[i].avatorUrl){
                cc.loader.load(globalData.gameMgr.playerData[i].avatorUrl, function (err, img) {
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
        for (let i = 0; i < globalData.gameMgr.playerData.length; i++) {
            var data = globalData.gameMgr.playerData[i];
            if(data){
                if(data.game_type == 'fall'){
                    that['avator' + i].node.getChildByName("label").active = true;
                }else{
                    that['avator' + i].node.x = data.gain_score / 100 * 450;
                }

            }else{
                that['avator' + i].node.active = false;
            }

        }
    },
});