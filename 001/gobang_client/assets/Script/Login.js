import globalData from "./data/globalData"
import PanelLoading from '../Prefab/PanelLoading'
cc.Class({
    extends: cc.Component,

    properties: {
        panel_loading:PanelLoading,
    },

    onLoad () {
        cc.debug.setDisplayStats(false);
    },
    start(){

        console.log("启动参数："+window.location.href);

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

            that.panel_loading.showLoading(function(){
                globalData.socketMgr.initSocket();
            })
        }
    },

});
