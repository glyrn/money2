import globalData from "./data/globalData";

const Bird = require('../prefab/Bird');
const Map = require('./Map');
const Avator = require('../prefab/Avator');
const PanelScore = require('PanelScore');
const ProgBar = require("../prefab/ProgBar")
cc.Class({
    extends: cc.Component,
    properties: {
        player0: Bird,
        player1: Bird,
        player2: Bird,
        player3: Bird,
        avator0:Avator,
        avator1:Avator,
        avator2:Avator,
        avator3:Avator,
        lab_score: cc.Label,
        map:Map,
        panel_score: PanelScore,
        panel_drop:cc.Node,
        lab_room:cc.Label,
        btn_ready:cc.Node,
        camera:cc.Node,
        btn_score:cc.Node,
        tips:cc.Node,
        prog_bar:ProgBar,
    },
    onLoad() {

        var that = this;

        const manager = cc.director.getCollisionManager();
        manager.enabled = true;
        manager.enabledDebugDraw = false;
        //进入后台继续动画
        that.handleMainLoopTimer=setInterval(()=>{
            cc.director.mainLoop();
        }, 1000 / 60);

        for (let i = 0; i < 4; i++) {
            that['avator'+i].node.active = false;
        }
        for (let i = 0; i < 4; i++) {
            that['player'+i].node.parent.active = false;
        }
        this.lab_score.node.active = false;
        this.btn_score.active = false;
        this.panel_score.node.active = false;

        this.enableInput(false);
        //刷新玩家
        globalData.eventlister.on("SIT_CHANGE",function(data){
            that['avator'+data.posId].render(data.target);
            if(data.target){ //准备中
                if(data.target.state == 2){
                    that['player'+data.posId].render(data.target);
                }

            }else{ //掉线
                that['player'+data.posId].node.parent.active = false;
            }
        });

        globalData.eventlister.on('PREPARE_SUCCESS',function(posId){
            that['avator'+posId].render(globalData.gameMgr.playerData[posId]);
            that['player'+posId].render(globalData.gameMgr.playerData[posId]);
            that.render();
        });

        globalData.eventlister.on("REFRESH_DATA",function(refresh_list){
            for (let i = 0; i < refresh_list.length; i++) {
                var refreshData = refresh_list[i];
                that['player'+refreshData.posId].refreshData(refreshData);
            }
        });

        globalData.eventlister.on("BIRD_RISE_SUCCESS",function(data){
            that['player' + data.posId].rise(data)
        });

        globalData.eventlister.on("GAIN_SCORE",function(score){
            that.lab_score.string = score;
            globalData.socketMgr.gainScore(score);
        });

        globalData.eventlister.on('GAME_START',function(data){

            that.enableInput(true);
            that.render();

            for (const i in globalData.gameMgr.playerData) {
                that['player'+i].startFly();
            }
            that.panel_score.node.active = false;
        });
        globalData.eventlister.on("FALL_OVER_SUCCESS",function(posId){
            if(posId == globalData.gameMgr.posId) {
                that.panel_drop.active = true;
            }
            that['avator'+posId].render(globalData.gameMgr.playerData[posId]);
        });
        globalData.eventlister.on("GAME_OVER",function(data){
            for (const i in globalData.gameMgr.playerData) {
                that['player'+i].setGameOver();
            }
            that.enableInput(false);
            // 显示游戏结束面板
            that.panel_drop.active = false;
            that.panel_score.node.active = true;
            that.panel_score.onBtnCur();
            that.btn_score.active = true;
            that.render()
        });
        globalData.eventlister.on("MESSAGE",function(msg){
            that.onShowTips(msg)
        });

        this.render();
        //初始化麦克风
        navigator.mediaDevices.getUserMedia({audio: true}).then(
            stream => {
                that.voiceSuccess(stream);
            }).catch(err => {
                that.voiceFail(err);
            });
    },
    onBtnReady(){
        globalData.socketMgr.prepare()
    },
    onBtnScore(){
        this.panel_score.node.active = true;
    },
    onBtnClosePanelDrop(){
        this.panel_drop.active = false;
    },
    render(){
        this.lab_room.string = "房号:"+globalData.gameMgr.roomState.roomId+"  局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
        this.btn_ready.active = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) &&
            globalData.gameMgr.playerData[globalData.gameMgr.posId].state < 2 ;

        this.lab_score.node.active = globalData.gameMgr.roomState.state == 1;//游戏进行中
        this.btn_score.active = globalData.gameMgr.score_list.length > 0;
        for (const i in globalData.gameMgr.playerData) {
            this['avator'+i].render(globalData.gameMgr.playerData[i]);
            if(globalData.gameMgr.playerData[i].state == 2){
                this['player'+i].render(globalData.gameMgr.playerData[i]);
            }
        }

        this.prog_bar.init();
    },

    // 开始或者bird jump
    onTouchCallBack() {
        //跳起来
        if(!this['player'+globalData.gameMgr.posId].fallOver){
            globalData.socketMgr.birdRise({type:1});
        }
    },
    // 事件控制
    enableInput(enable) {
        this._enableInput = enable;
        if(cc.args['debug'] == 1) {
            if (enable) {
                this.camera.on(cc.Node.EventType.TOUCH_START, this.onTouchCallBack, this)
            } else {
                this.camera.off(cc.Node.EventType.TOUCH_START, this.onTouchCallBack, this)
            }
        }
    },
    voiceFail(error){
        this.onShowTips('获取麦克风音量时出错:'+ error);
    },
    voiceSuccess(stream){

        var that = this;

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function updateVolume() {
            analyser.getByteFrequencyData(dataArray);
            const rms = getRMS(dataArray);

            // 在此处使用rms作为麦克风音量
            // that.img_test.position = cc.v2(0, rms * 2);
            if(rms > 50){

                if(that._enableInput && cc.args['debug'] != 1 && globalData.gameMgr.roomState.state == 1) {
                    //跳起来
                    if (!that['player' + globalData.gameMgr.posId].fallOver) {
                        globalData.socketMgr.birdRise({type: 1});
                    }
                }
            }

            requestAnimationFrame(updateVolume);
        }

        function getRMS(dataArray) {
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] ** 2;
            }
            const avg = sum / dataArray.length;
            return Math.sqrt(avg);
        }

        updateVolume();
    },
    onShowTips(msg){
        var that = this;
        this.tips.active = true;
        this.tips.getChildByName('label').getComponent(cc.Label).string = msg;
        this.scheduleOnce(function () {
            that.tips.active = false;
        },1);
    },
})