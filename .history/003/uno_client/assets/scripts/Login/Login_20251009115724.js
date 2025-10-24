import globalData from "../globalData.js"
// import PanelLoading from "../"

cc.Class({
    extends: cc.Component,

    properties: {
        panel_loading:PanelLoading,
    },

    onLoad () {
        cc.debug.setDisplayStats(false);
        globalData.socketMgr.initSocket();
    },


    start(){

        console.log("启动参数："+window.location.href);

        var url = decodeURI(window.location.href);
        if(url.split('?').length > 1){
            var params = url.split('?')[1].split('&');
            var field = {};
            for (let i = 0; i < params.length; i++) {
                var obj = params[i].split('=');
                field[obj[0]] = obj[1];
            }

            var that = this;
            cc.args = field;
            cc.args['lanuch_url'] = window.location.href;

        }
    },

});
