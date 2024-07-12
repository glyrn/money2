import globalData from "../globalData.js"
cc.Class({
    extends: cc.Component,

    properties: {
        input_name:cc.EditBox,
        input_room:cc.EditBox,
        input_pos:cc.EditBox,
        lab_tips:cc.Label,
        img_loading:cc.Node,
        btn_login:cc.Node,
    },

    onLoad () {
        cc.debug.setDisplayStats(false);

        globalData.socketMgr.initSocket()

        this.img_loading.active = false;

        globalData.eventlister.on("SITDOWN_SUCCESS",function(){
            // 进入游戏
            cc.director.loadScene("gameScene");
        });
        let that = this;
        globalData.eventlister.on('LOGIN_FAIL',function(msg){
            that.btn_login.active = true;
            that.img_loading.active = false;
            that.showTips(msg)
        })
        globalData.eventlister.on('SITDOWN_ERROR',function(msg){
            that.btn_login.active = true;
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
            if(params.length >= 3){

                this._uid = field['uid'];
                this.input_name.string = field['name'];
                this.input_room.string = field['room'];
                this.input_pos.string = field['pos'];
                this._avatarUrl = field['avatorUrl'];
                this._base_score = field['base_score'];
                this._score = field['score'];
                if(typeof this._score =='undefined'){
                    this._score = 0;
                }
                this._play_count = field['play_count'];
                this._play_mode = field['play_mode'];

                this._checkBtnGuestClick();
            }
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
    _checkBtnGuestClick(){
        var that = this;
        if(!that.input_name.string)
        {
            this.showTips("请输入名字");
            return;
        }
        if(!that.input_room.string)
        {
            this.showTips("请输入房号");
            return;
        }
        if(!that.input_pos.string)
        {
            this.showTips("请输入座位号");
            return;
        }
        if(that.input_name.string.length > 10)
        {
            this.showTips('名字不超过10个字');
            return;
        }

        //设置自己名字
        globalData.gameMgr.posState.self.name = that.input_name.string;
        globalData.gameMgr.posState.self.avatarUrl = that._avatarUrl;
        globalData.gameMgr.posState.self.score = that._score;
        globalData.gameMgr.posState.self.uid = that._uid;
        //请求登录
        this.img_loading.active = true;
        globalData.socketMgr.login(that._uid,that.input_name.string,that._avatarUrl,that._score,function(){
            that.btn_login.active = false;
            globalData.socketMgr.sitdown(that.input_room.string,parseInt(that.input_pos.string)-1,parseInt(that._score),that._base_score,that._play_count,that._play_mode);
        });
    },
    onBtnGuestClick(event,customData) {

        this._checkBtnGuestClick();
    },
});
