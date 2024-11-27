import globalData from "./data/globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        img_loading:cc.Node,
        lab_tips:cc.Label
    },

    onLoad () {
        this.lab_tips.node.active = false;
        cc.debug.setDisplayStats(false);
        globalData.socketMgr.initSocket();
    },
    update(){
        this.img_loading.angle = this.img_loading.angle + 10;
    },

    showTips(msg){
        console.log(msg);
        this.lab_tips.node.active = true;
        this.lab_tips.string = msg;
        this.scheduleOnce(function () {
            this.lab_tips.node.active = false;
        }, 2);
    },

    start(){

        var url = decodeURI(window.location.href);
        if(url.split('?').length > 1){
            var params = url.split('?')[1].split('&');
            var field = {};
            for (const paramsKey in params) {
                var obj = params[paramsKey].split('=');
                field[obj[0]] = obj[1];
            }
            cc.args = field;

            globalData.socketMgr.login(cc.args['uid'],cc.args['name'],cc.args['avatorUrl'],cc.args['score'] ,cc.args['room'],
                cc.args['play_mode'],cc.args['play_count'],function(){
                cc.director.loadScene("Game");
            });
        }
    },

});
