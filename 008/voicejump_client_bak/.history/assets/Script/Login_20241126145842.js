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
        // globalData.socketMgr.initSocket();
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

        // 首先，你需要引入Cocos的音频引擎
        let audio = cc.audioEngine;
        
        // 然后，你可以尝试打开麦克风权限
        audio.startRecord({
            sampleRate: 44100, // 采样率
            bit: 16, // 位深度
            channel: 1, // 单声道
            callback: function(data) {
                // 这里的data是音频数据，你可以通过分析这些数据来估算音量大小
                // 但是这个方法不直接提供音量，需要你根据数据处理
            }
        });
        
        // // 停止录音
        // audio.stopRecord();
        // var url = decodeURI(window.location.href);
        // if(url.split('?').length > 1){
        //     var params = url.split('?')[1].split('&');
        //     var field = {};
        //     for (const paramsKey in params) {
        //         var obj = params[paramsKey].split('=');
        //         field[obj[0]] = obj[1];
        //     }
        //     cc.args = field;

        //     globalData.socketMgr.login(cc.args['uid'],cc.args['name'],cc.args['avatorUrl'],cc.args['score'] ,cc.args['room'],
        //         cc.args['play_mode'],cc.args['play_count'],function(){
        //         cc.director.loadScene("Game");
        //     });
        // }
    },

});
