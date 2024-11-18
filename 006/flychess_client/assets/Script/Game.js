import globalData from "./data/globalData.js"
import PlayerNode from '../Prefab/PlayerNode.js'
import Map from '../Prefab/Map.js'
cc.Class({
    extends: cc.Component,

    properties: {

        panel_game_over:cc.Node,
        player_node1:{
            type:PlayerNode,
            default:null,
        },
        player_node2:{
            type:PlayerNode,
            default:null,
        },
        player_node3:{
            type:PlayerNode,
            default:null,
        },
        player_node4:{
            type:PlayerNode,
            default:null,
        },
        dice:cc.Node,
        btn_ready:cc.Node,
        btn_quit:cc.Node,
        btn_score:cc.Node,
        tips:cc.Node,
        lab_room:cc.Label,
        map:Map,
    },
    //退出游戏
    onBtnQuit(){
        window.close();
        cc.director.end();
    },
    onBtnReady(){
        globalData.socketMgr.prepare()
    },
    onBtnScore(){
        this.panel_game_over.active = true;
    },
    onBtnCurScore(){
        this._cur_score_idx = globalData.gameMgr.score_list.length -1;
        this.renderScorePanel()
    },
    onBtnLastScore(){
        this._cur_score_idx = Math.max(0,this._cur_score_idx-1);
        this.renderScorePanel()
    },
    onBtnCloseScore(){
        this.panel_game_over.active = false;
    },
    onBtnDice(){

        if(!this._isCanMakeDiceLock){
            this._isCanMakeDiceLock = true;
            globalData.socketMgr.makeDiceNum()
        }
    },
    onBackHome(data){
        if(data.posId == 0){
            this.player_node1.backHome(data.chess_idx)
        }else if(data.posId == 1){
            this.player_node2.backHome(data.chess_idx)
        }else if(data.posId == 2){
            this.player_node3.backHome(data.chess_idx)
        }else if(data.posId == 3){
            this.player_node4.backHome(data.chess_idx)
        }
    },
    onPrepareSuccess(posId){
        this.render()
        this.playerNodes[posId].render();
    },
    onSitChange(data){
        if(data.target){
            this.playerNodes[data.posId].node.active = true;
            this.playerNodes[data.posId].render();
        }else{
            this.playerNodes[data.posId].node.active = false;
        }
    },
    onGameStart(data){
        console.log("游戏开始 开始骰：",data.posId)
        this.reset()
        this.map.makeBomb(data.bomb_idxs)
        this.onShowTips("游戏开始 第"+globalData.gameMgr.play_index+"局");
        // this._cur_dice_idx = data.posId;
        this.dice.active = globalData.gameMgr.posId == data.posId;
        if(this.dice.active){
            this.dice.getComponent(cc.Button).interactable = true;
        }
        this.dice.getComponent('Dice').isShow = true;

        for (const i in globalData.gameMgr.playerData) {
            this.playerNodes[globalData.gameMgr.playerData[i].posId].setTurnFlag(data.posId == i);
        }

        this.render()
        this.btn_quit.active = false;
    },
    onGameOver(data){
        this.onShowTips("游戏结束！");
        globalData.gameMgr.roomState.state = 2; //结束
        globalData.gameMgr.score_list.push(data);
        this.panel_game_over.active = true;
        this.btn_score.active = true;
        this.dice.active = false;
        this.dice.getComponent('Dice').isShow = false;

        this._cur_score_idx = globalData.gameMgr.score_list.length -1;
        this.renderScorePanel()
        this.render();
    },
    onMakeDiceNumSuccess(data){
        var that = this;

        if(!cc.gameInBackgroud){
            this.showDiceNum(data.num,function(){
                that.playerNodes[data.posId].render()
                that.playerNodes[data.posId].showCtrlCircle(data.num);
            });
        }
    },
    onShowTips(msg){
        var that = this;
        this.tips.active = true;
        this.tips.getChildByName('label').getComponent(cc.Label).string = msg;
        this.scheduleOnce(function () {
            that.tips.active = false;
        },1);
    },
    reset(){
        for (let i = 0; i < 4; i++) {
            this.playerNodes[i].reset();
        }
        this.map.reset()
    },
    render(){
        this.btn_ready.active = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) &&
            globalData.gameMgr.playerData[globalData.gameMgr.posId].state < 2 ;
        this.btn_quit.active = globalData.gameMgr.play_index >= globalData.gameMgr.play_count;

        for (let i = 0; i < this.playerNodes.length; i++) {
            if(globalData.gameMgr.playerData[i]){
                this.playerNodes[i].render()
            }
        }

        this.btn_score.active = globalData.gameMgr.score_list.length > 0;
        this.lab_room.string = "版本:v0.0.3.3 房号:"+globalData.gameMgr.roomState.roomId+"  局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
    },
    renderScorePanel(){
        var data = globalData.gameMgr.score_list[this._cur_score_idx];
        var lab_title = this.panel_game_over.getChildByName('lab_title').getComponent(cc.Label);
        if(data.winer == globalData.gameMgr.posId){
            lab_title.string = "恭喜，你赢了！";
        }else{
            lab_title.string = "你输了，加油~";
        }

        for (let i = 0; i < 4; i++) {
            var item = this.panel_game_over.getChildByName('container').getChildByName('player'+(i+1))
            var playerData = globalData.gameMgr.playerData[i];
            if(playerData){
                item.active = true;
                item.getComponent(cc.Label).string = playerData.name + " " + "+"+data.score_list[playerData.posId]+"分";
            }else{
                item.active = false;
            }
        }
    },
    onLoad(){
        var that = this;
        //进入后台继续动画
        that.handleMainLoopTimer=setInterval(()=>{
            cc.director.mainLoop();
        }, 1000 / 60);

        this.playerNodes = [this.player_node1,this.player_node2,this.player_node3,this.player_node4];
        this.btn_ready.active = true;
        this.dice.active = false;
        this.dice.getComponent('Dice').isShow = false;

        globalData.eventlister.on('BACK_HOME',function(data){
            that.onBackHome(data)
        });
        globalData.eventlister.on('PREPARE_SUCCESS',function(data){
            that.onPrepareSuccess(data)
        })
        globalData.eventlister.on('SIT_CHANGE',function(data){
            that.onSitChange(data)
        });
        globalData.eventlister.on('GAME_START',function(data){
            that.onGameStart(data)
        });
        globalData.eventlister.on('MAKE_DICE_NUM_SUCCESS',function(data){
            that.onMakeDiceNumSuccess(data)
        });
        globalData.eventlister.on('FINISH_MOVE_STEP',function(){
            globalData.socketMgr.nextPlayerDice();
        })
        globalData.eventlister.on("NEXT_PLAYER_DICE_SUCCESS",function(data){
            that.nextPlayerDice(data);
        })
        globalData.eventlister.on('PLAY_MOVE_STEP_SUCCESS',function(data){
            that.playerNodes[data.posId].onPlayMoveStepAnim(data.idx,data.num)
        });
        globalData.eventlister.on('GAME_OVER',function(data){
            that.onGameOver(data)
        });
        globalData.eventlister.on("MESSAGE",function(msg){
            that.onShowTips(msg)
        });
    },
    start(){

        for (let i = 0; i < 4; i++) {
            this.playerNodes[i].node.active = false;
        }
        for (const i in globalData.gameMgr.playerData) {
            this.playerNodes[globalData.gameMgr.playerData[i].posId].node.active = true;
            this.playerNodes[globalData.gameMgr.playerData[i].posId].render();
        }
        this.btn_score.active = false;
        this.render()
    },

    showDiceNum(num,cbFunc) {
        console.log("showDiceNum")
        for (let i = 0; i < this.playerNodes.length; i++) {
            this.playerNodes[i].cleanDice();
        }
        console.log("cc.gameInBackgroud ",cc.gameInBackgroud)

        this.dice.getComponent("Dice").playNum(num,cbFunc)
    },

    nextPlayerDice(data){

        this._isCanMakeDiceLock = false;
        this.onShowTips("请【"+globalData.gameMgr.playerData[data.posId].name+"】骰筛子");
        for (const i in globalData.gameMgr.playerData) {
            this.playerNodes[globalData.gameMgr.playerData[i].posId].setTurnFlag(data.posId == i);
        }

        console.log("nextPlayerDice",globalData.gameMgr.posId,data.posId)

        this.dice.active = globalData.gameMgr.posId == data.posId;
        if(this.dice.active){
            this.dice.getComponent(cc.Button).interactable = true;
        }
        this.dice.getComponent('Dice').isShow = true;
    },

    resumeAllActions(){
        for (let i = 0; i < this.playerNodes.length; i++) {
            this.playerNodes[i].resumeAllActions();
        }
    },
    // renderNowGame(){
    //     for (let i = 0; i < this.playerNodes.length; i++) {
    //         this.playerNodes[i].renderNowGame();
    //     }
    //
    //     this.dice.active = globalData.gameMgr.posId == this._cur_dice_idx;
    // },
});
