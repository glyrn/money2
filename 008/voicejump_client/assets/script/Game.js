import globalData from "./data/globalData";

const Bird = require('../prefab/Bird');
// const Map = require('./Map');
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
        // map:Map,
        panel_avators:cc.Node,
        panel_score: PanelScore,
        panel_drop:cc.Node,
        lab_room:cc.Label,
        btn_ready:cc.Node,
        camera:cc.Node,
        btn_score:cc.Node,
        tips:cc.Node,
        prog_bar:ProgBar,
        _lastVoiceTime:0,
        _lastJump1Time:0,
        _lastJump2Time:0,
        _voiceCDTime:100,
        _jump1CDTime:700,
        _jump2CDTime:1000,
        prog_voice:cc.Node,
    },
    onLoad() {

        var that = this;

        cc.game.setFrameRate(60);
        const manager = cc.director.getCollisionManager();
        manager.enabled = true;
        manager.enabledDebugDraw = false;

        for (let i = 0; i < 4; i++) {
            that['avator'+i].node.active = false;
        }
        for (let i = 0; i < 4; i++) {
            that['player'+i].node.parent.active = false;
        }
        this.lab_score.node.active = false;
        this.btn_score.active = false;
        this.panel_score.node.active = false;

        if(!globalData.gameMgr.isAllReady()){
            this.panel_avators.active = true;
        }

        this.enableInput(false);
        //刷新玩家
        globalData.eventlister.on("SIT_CHANGE",function(data){
            console.log(data)
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

        globalData.eventlister.on("BIRD_MOVE_SUCCESS",function(data){
            that['player' + data.posId].move(data)
        });

        globalData.eventlister.on("GAIN_SCORE",function(score){
            that.lab_score.string = score;
            globalData.socketMgr.gainScore(score);
        });

        globalData.eventlister.on('GAME_START',function(data){

            that.enableInput(true);
            that.render();

            for (const i in globalData.gameMgr.playerData) {
                that['player'+i].startMove();
            }
            that.panel_score.node.active = false;
            that.panel_avators.active = false;
            that.prog_bar.node.active = true;
            that.prog_bar.init();
        });
        globalData.eventlister.on("FALL_OVER_SUCCESS",function(data){
            if(data.posId == globalData.gameMgr.posId) {
                that.panel_drop.active = true;
            }
            that['player' + data.posId].move(data);
            that['avator'+data.posId].render(globalData.gameMgr.playerData[data.posId]);
            that.prog_bar.refresh();
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
            // that.btn_score.active = true;
            that.panel_avators.active = true;
            that.prog_bar.node.active = false;
            that.render()

            window.parent.postMessage({'quitGame':1}, "*");
            console.log("发送退出事件")
        });
        globalData.eventlister.on("MESSAGE",function(msg){
            that.onShowTips(msg)
        });

        this.render();
        //初始化麦克风
        navigator.mediaDevices.getUserMedia({audio:true}).then(
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
    renderRoomTitle(){
        this.lab_room.string = "v0.0.3房号:"+globalData.gameMgr.roomState.roomId+" 局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
        var distance = globalData.gameMgr.roomState.gametime_remain - Date.parse(new Date()) / 1000;
        if(distance > 0){
            const minutes = Math.floor((distance % ( 60 * 60)) /  60);
            const seconds = Math.floor(distance % 60);
            this.lab_room.string += " 倒计时:"+minutes + "分 " + seconds + "秒 ";
        }
    },
    render(){
        this.renderRoomTitle();
        this.btn_ready.active = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) &&
            globalData.gameMgr.playerData[globalData.gameMgr.posId].state < 2 && !globalData.gameMgr.is_ob;

        this.lab_score.node.active = globalData.gameMgr.roomState.state == 1;//游戏进行中
        // this.btn_score.active = globalData.gameMgr.score_list.length > 0;
        for (const i in globalData.gameMgr.playerData) {
            this['avator'+i].render(globalData.gameMgr.playerData[i]);
            if(globalData.gameMgr.playerData[i] && globalData.gameMgr.playerData[i].state == 2){
                this['player'+i].render(globalData.gameMgr.playerData[i]);
            }
        }
    },
    // 事件控制
    enableInput(enable) {
        this._enableInput = enable;
    },
    voiceFail(error){
        this.onShowTips('获取麦克风音量时出错:'+ error);
    },
    voiceSuccess(stream){

        var that = this;
        const audioContext = new AudioContext();
        // 将麦克风的声音输入这个对象
        var mediaStreamSource = audioContext.createMediaStreamSource(stream);
        // 创建一个音频分析对象，采样的缓冲区大小为4096，输入和输出都是单声道
        var scriptProcessor = audioContext.createScriptProcessor(4096,1,1);
        // 将该分析对象与麦克风音频进行连接
        mediaStreamSource.connect(scriptProcessor);
        // 此举无甚效果，仅仅是因为解决 Chrome 自身的 bug
        scriptProcessor.connect(audioContext.destination);
        // 开始处理音频
        scriptProcessor.onaudioprocess = function(e) {
            // 获得缓冲区的输入音频，转换为包含了PCM通道数据的32位浮点数组
            let buffer = e.inputBuffer.getChannelData(0);
            // 获取缓冲区中最大的音量值
            let maxVal = Math.max.apply(Math, buffer);
            // 显示音量值
            // console.log(Math.round(maxVal * 100));

            that._rms = Math.round(maxVal * 100);

        };

    },
    update(){

        var that = this;

        var rms = that._rms;

        if(cc.args['debug'] != 1 && globalData.gameMgr.roomState.state == 1 && !globalData.gameMgr.is_ob) {

            if (!that['player' + globalData.gameMgr.posId].fallOver) {
                // if(that._lastVoiceTime + that._voiceCDTime > Date.now()){
                //     return
                // }
                // that._lastVoiceTime = Date.now();

                // that.slide_voice.progress = that._rms / 100;

                that.prog_voice.height = that._rms / 100 * 200;
                var curPlayer = this['player'+globalData.gameMgr.posId];
                var position = curPlayer.node.parent.position;
                if(curPlayer.isStand()) {
                    if (rms > 10 && rms <= 30) { //向前走
                        globalData.socketMgr.birdMove({type: 1, cur_x: position.x, cur_y: position.y});
                    } else if (rms > 30 && rms <= 60) { //小跳
                        globalData.socketMgr.birdMove({type: 2, cur_x: position.x, cur_y: position.y});
                    } else if (rms > 60) { //大跳
                        globalData.socketMgr.birdMove({type: 3, cur_x: position.x, cur_y: position.y});
                    }
                }
            }
        }

        this.renderRoomTitle();
    },
    onBtnRun(){
        var position = this['player'+globalData.gameMgr.posId].node.parent.position;
        globalData.socketMgr.birdMove({type: 1,cur_x:position.x,cur_y:position.y});
    },
    onBtnJump1(){
        var position = this['player'+globalData.gameMgr.posId].node.parent.position;
        globalData.socketMgr.birdMove({type: 2,cur_x:position.x,cur_y:position.y});
    },
    onBtnJump2(){
        var position = this['player'+globalData.gameMgr.posId].node.parent.position;
        globalData.socketMgr.birdMove({type: 3,cur_x:position.x,cur_y:position.y});
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