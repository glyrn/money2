import globalData from "./data/globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        img_loading:cc.Node,
        lab_tips:cc.Label,
        lab_debug:cc.Label,
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

        this.lab_debug.string+= msg;
    },

    start(){

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
            cc.args = field;

            cc.director.preloadScene("Game",function() {
                if (defines.isDebug || defines.serverUrl == 'www.g-xinyi1313.cn') {
                    globalData.socketMgr.login(cc.args['uid'], cc.args['name'], cc.args['avatorUrl'], cc.args['score'], cc.args['room'],
                        cc.args['play_mode'], cc.args['play_count'], cc.args['ob_uid'], function () {
                            cc.director.loadScene("Game");
                        });
                } else {
                    console.log("��ʼ�����û���Ϣ��")
                    globalData.utils.post("https://www.fsyctech.com/client/alchemy/callback/checkSign",{sign:cc.args['sign']},function(isOk,data) {
                        console.log("�û���Ϣ��",data)
                        if (isOk) {
                            globalData.socketMgr.login(data.data.userId, data.data.nickname,data.data.avatar, cc.args['score'], cc.args['room'],
                                cc.args['play_mode'], cc.args['play_count'], cc.args['ob_uid'],function () {
                                    cc.director.loadScene("Game");
                                });
                        }
                    });
                }
            });

        }
    },

});
