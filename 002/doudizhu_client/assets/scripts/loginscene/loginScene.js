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

        globalData.socketMgr.initSocket()

    },
    
    start () {

         // this.lab_tips.node.active = false;
        let that = this;
        // globalData.eventlister.on("SITDOWN_SUCCESS",function(){
        //     clearTimeout(that._handler);
        //     // 进入游戏
        // });
        
        // globalData.eventlister.on('LOGIN_FAIL',function(msg){
        //     console.log(msg)
        // })
        // globalData.eventlister.on('SITDOWN_ERROR',function(msg){
        //     console.log(msg)
        // })

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

            cc.args = field;
            
        }
    },
    onProgress(completedCount, totalCount, item){
        // this.prog_bar.progress = completedCount/totalCount;
    },
    update(){
        // this.img_loading.angle = this.img_loading.angle + 20;
    },
    // showTips(msg){
    //     console.log(msg);
    //     this.lab_tips.node.active = true;
    //     this.lab_tips.string = msg;
    //     this.scheduleOnce(function () {
    //         this.lab_tips.node.active = false;
    //     }, 2);

    //     this.lab_debug.string += msg;
    // },
});
