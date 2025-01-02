import globalData from "./data/globalData";

const Bird = require('../prefab/Bird');
const Map = require('./Map');
const Avator = require('../prefab/Avator');

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
        panel_score: cc.Node,
        lab_room:cc.Label,
        btn_ready:cc.Node,
    },
    onLoad() {

        var that = this;

        //进入后台继续动画
        that.handleMainLoopTimer=setInterval(()=>{
            cc.director.mainLoop();
        }, 1000 / 60);

        for (let i = 0; i < 4; i++) {
            that['avator'+i].node.active = false;
        }
        for (let i = 0; i < 4; i++) {
            that['player'+i].node.active = false;
        }
        this.lab_score.node.active = false;

        this.enableInput(true);
        //刷新玩家
        globalData.eventlister.on("SIT_CHANGE",function(data){
            that['avator'+data.posId].render(data.target);
            if(data.target){ //准备中
                if(data.target.state == 2){
                    that['player'+data.posId].render(data.target);
                }

            }else{ //掉线
                that['player'+data.posId].node.active = false;
            }
        });

        globalData.eventlister.on('PREPARE_SUCCESS',function(posId){
            that['avator'+posId].render(globalData.gameMgr.playerData[posId]);
            that['player'+posId].render(globalData.gameMgr.playerData[posId]);
            that.render();
        });

        globalData.eventlister.on("REFRESH_DATA",function(data){
            if(data.target == 'map'){
                that.map.refreshData(data.refreshData);
            }else if(data.target == 'other'){
                for (const i in globalData.gameMgr.playerData) {
                    if(!globalData.gameMgr.playerData[i].fallOver)
                        that['player'+i].refreshData(data.refreshData);
                }
            }
        });

        globalData.eventlister.on("BIRD_RISE_SUCCESS",function(data){
            that['player' + data.posId].node.x = data.x;
            that['player' + data.posId].node.y = data.y;
            that['player' + data.posId].rise(data)
        });

        globalData.eventlister.on("FALL_OVER_SUCCESS",function(){

        });
        globalData.eventlister.on('GAME_START',function(data){

            that.render();

            for (const i in globalData.gameMgr.playerData) {
                that['player'+i].startFly();
            }
        });

        globalData.eventlister.on("GAME_OVER",function(){

        });

        this.render();
    },
    onBtnReady(){
        globalData.socketMgr.prepare()
    },
    onBtnScore(){
        this.panel_score.active = true;
    },
    render(){
        this.lab_room.string = "房号:"+globalData.gameMgr.roomState.roomId+"  局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
        this.btn_ready.active = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) &&
            globalData.gameMgr.playerData[globalData.gameMgr.posId].state < 2 ;

        this.lab_score.node.active = globalData.gameMgr.roomState.state == 1;//游戏进行中

        for (const i in globalData.gameMgr.playerData) {
            this['avator'+i].render(globalData.gameMgr.playerData[i]);
            if(globalData.gameMgr.playerData[i].state == 2){
                this['player'+i].render(globalData.gameMgr.playerData[i]);
            }
        }
    },
    gameOver() {
        // this.map.stopRun();
        // 停止游戏输入监听
        this.enableInput(false);
        // 显示游戏结束面板
        this.panel_score.active = true;
    },

    // 开始或者bird jump
    onTouchCallBack() {
        // if (this.bird.state === Bird.State.Ready) {
        //     this.gameStart()
        // } else {
        //     this.bird.rise()
        // }
        //控制摄像机
        if(!this['player'+globalData.gameMgr.posId].fallOver){
            var node = this['player'+globalData.gameMgr.posId].node;
            globalData.socketMgr.birdRise({type:1,x:node.x,y:node.y});
        }
    },
    // 事件控制
    enableInput(enable) {
        if (enable) {
            this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchCallBack, this)
        } else {
            this.node.off(cc.Node.EventType.TOUCH_START, this.onTouchCallBack, this)
        }
    }
})