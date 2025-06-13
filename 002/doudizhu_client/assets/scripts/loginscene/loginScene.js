import globalData from "../globalData.js"
cc.Class({
    extends: cc.Component,

    properties: {
        lab_tips:cc.Label,
        // img_loading:cc.Node,
        lab_debug:cc.Label,
        // prog_bar:cc.ProgressBar,
    },

    onLoad () {
        cc.debug.setDisplayStats(false);

        globalData.socketMgr.initSocket()

        this.lab_tips.node.active = false;

        globalData.eventlister.on("SITDOWN_SUCCESS",function(){
            // 进入游戏
            cc.director.loadScene("gameScene");
        });
        let that = this;
        globalData.eventlister.on('LOGIN_FAIL',function(msg){
            // that.img_loading.active = false;
            that.showTips(msg)
        })
        globalData.eventlister.on('SITDOWN_ERROR',function(msg){
            // that.img_loading.active = false;
            that.showTips(msg)
        })

    },
    
    start () {


        console.log("启动参数："+window.location.href);
        this.lab_debug.string = "启动参数："+window.location.href;

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
            cc.director.preloadScene("gameScene",this.onProgress.bind(this),function(){
                if(defines.isDebug || defines.serverUrl == 'www.g-xinyi1313.cn'){
                    //请求登录
                    globalData.socketMgr.login(cc.args['uid'],cc.args['name'],cc.args['avatorUrl'],cc.args['score'],field['ob_uid'],field['room'],function(){
                        globalData.socketMgr.sitdown(field['room'], parseInt(field['score']), parseInt(field['base_score']), field['play_count'], field['play_mode']);
                    })
                }else{
                    console.log("开始请求用户信息：")
                    globalData.utils.post(defines.yc_domain+"/client/alchemy/callback/checkSign",{sign:cc.args['sign']},function(isOk,data) {
                        console.log("用户信息：",data)
                        if (isOk) {
                            //请求登录
                            globalData.socketMgr.login(data.data.userId, data.data.nickname, data.data.avatar, field['score'],field['ob_uid'],field['room'], function () {
                                globalData.socketMgr.sitdown(field['room'], parseInt(field['score']), parseInt(field['base_score']), field['play_count'], field['play_mode']);
                            });
                        }else{
                            that.lab_debug.string += JSON.stringify(data);
                        }
                    });
                }
            });
        }
    },
    onProgress(completedCount, totalCount, item){
        // this.prog_bar.progress = completedCount/totalCount;
    },
    update(){
        // this.img_loading.angle = this.img_loading.angle + 20;
    },
    showTips(msg){
        console.log(msg);
        this.lab_tips.node.active = true;
        this.lab_tips.string = msg;
        this.scheduleOnce(function () {
            this.lab_tips.node.active = false;
        }, 2);

        this.lab_debug.string += msg;
    },
});
