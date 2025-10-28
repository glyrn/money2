import globalData from "./data/globalData"

cc.Class({
    extends: cc.Component,

    properties: {

    },

    onLoad () {
        // this.lab_tips.node.active = false;
        cc.debug.setDisplayStats(false);
        globalData.socketMgr.initSocket();
    },

    start(){
        console.log("启动参数："+window.location.href);
        // this.lab_debug.string = "启动参数："+window.location.href;
        var url = decodeURI(window.location.href);
        if(url.split('?').length > 1){
            var params = url.split('?')[1].split('&');
            var field = {};
            for (const paramsKey in params) {
                var obj = params[paramsKey].split('=');
                field[obj[0]] = obj[1];
            }
            var that = this;
            cc.args = field;
            cc.args['lanuch_url'] = window.location.href;
        }
    },

});
