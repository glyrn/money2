import globalData from "../globalData.js"
cc.Class({
    extends: cc.Component,

    properties: {
        lab_tips:cc.Label,
        img_loading:cc.Node,
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
            that.img_loading.active = false;
            that.showTips(msg)
        })
        globalData.eventlister.on('SITDOWN_ERROR',function(msg){
            that.img_loading.active = false;
            that.showTips(msg)
        })

    },
    
    start () {

        var url = decodeURI(window.location.href); 
        if(url.split('?').length > 1){
            var params = url.split('?')[1].split('&');
            var field = {};
            for (const paramsKey in params) {
                var obj = params[paramsKey].split('=');
                field[obj[0]] = obj[1];
            }
            cc.args = field;
            cc.director.preloadScene("gameScene",function(){
                if(defines.isDebug){
                    //请求登录
                    globalData.socketMgr.login(cc.args['uid'],cc.args['name'],cc.args['avatorUrl'],cc.args['score'],field['ob_uid'],function(){
                        globalData.socketMgr.sitdown(field['room'], parseInt(field['score']), parseInt(field['base_score']), field['play_count'], field['play_mode']);
                    })
                }else{
                    globalData.utils.post("https://www.fsyctech.com/client/alchemy/callback/checkSign",{sign:cc.args['sign']},function(isOk,data) {
                        if (isOk) {
                            //请求登录
                            globalData.socketMgr.login(data.data.userId, data.data.nickname, data.data.avatar, field['score'],field['ob_uid'], function () {
                                globalData.socketMgr.sitdown(field['room'], parseInt(field['score']), parseInt(field['base_score']), field['play_count'], field['play_mode']);
                            });
                        }
                    });
                }
            });
        }
    },
    update(){
        this.img_loading.angle = this.img_loading.angle + 20;
    },
    showTips(msg){
        console.log(msg);
        this.lab_tips.node.active = true;
        this.lab_tips.string = msg;
        this.scheduleOnce(function () {
            this.lab_tips.node.active = false;
        }, 2);
    },
});
