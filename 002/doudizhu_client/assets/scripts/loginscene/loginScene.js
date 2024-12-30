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
            var that = this;
            globalData.utils.post("https://www.fsyctech.com/client/alchemy/callback/checkSign",{sign:cc.args['sign']},function(isOk,data) {
                if (isOk) {

                    that._uid = data.data.userId;
                    that._name = data.data.nickname;
                    that._room = field['room'];
                    that._avatarUrl = data.data.avatar;
                    that._base_score = field['base_score'];
                    that._score = field['score'];
                    if (typeof that._score == 'undefined') {
                        that._score = 0;
                    }
                    that._play_count = field['play_count'];
                    that._play_mode = field['play_mode'];

                    //设置自己名字
                    globalData.gameMgr.posState.self.name = that._name;
                    globalData.gameMgr.posState.self.avatarUrl = that._avatarUrl;
                    globalData.gameMgr.posState.self.score = that._score;
                    globalData.gameMgr.posState.self.uid = that._uid;
                    //请求登录
                    globalData.socketMgr.login(that._uid, that._name, decodeURIComponent(that._avatarUrl), that._score, function () {
                        globalData.socketMgr.sitdown(that._room, parseInt(that._score), that._base_score, that._play_count, that._play_mode);
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
