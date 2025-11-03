import globalData from "../globalData.js"
cc.Class({
    extends: cc.Component,

    properties: {
        // lab_tips:cc.Label,
        // img_loading:cc.Node,
        // lab_debug:cc.Label,
        // prog_bar:cc.ProgressBar,
    },

    onLoad () {
        cc.debug.setDisplayStats(false);

    },
    
    start () {

         // this.lab_tips.node.active = false;
        let that = this;


        console.log("启动参数："+window.location.href);

        var url = decodeURI(window.location.href);
        if(url.split('?').length > 1){
            var params = url.split('?')[1].split('&');
            var field = {};
            for (const paramsKey in params) {
                var obj = params[paramsKey].split('=');
                field[obj[0]] = obj[1];
            }

            cc.args = field;
            cc.args['lanuch_url'] = window.location.href;

            that.panel_loading.showLoading(function(){
                globalData.socketMgr.initSocket();
            })
        }
    },

});
