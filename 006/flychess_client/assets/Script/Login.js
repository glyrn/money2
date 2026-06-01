import globalData from "./data/globalData"
import PanelLoading from "./data/PanelLoading"
import launchArgs from "./data/launchArgs"

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

        var field = launchArgs.parse(window.location.href);
        if(!launchArgs.hasRequiredLoginArgs(field)){
            if(defines.isDebug || defines.isForce){
                field = launchArgs.createDebugFallbackArgs();
                console.warn("启动参数缺失，使用本地游客参数", field);
            }else{
                console.error("启动参数缺失，无法进入游戏", window.location.href);
                window.parent.postMessage({'event_loading':{type:"error",message:"missing_launch_args"}}, "*");
                if(this.panel_loading && this.panel_loading.node){
                    this.panel_loading.node.active = false;
                }
                return;
            }
        }
        var that = this;
        cc.args = field;
        cc.args['lanuch_url'] = window.location.href;

        that.panel_loading.showLoading(function(){
            globalData.socketMgr.initSocket();
        })
    },

});
