import globalData from "./data/globalData.js"
import PlayerNode from '../Prefab/PlayerNode.js'
import Map from '../Prefab/Map.js'
import PanelAvators from "../Prefab/PanelAvators"
import Dice from "../Prefab/Dice.js"
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
        button_dice:cc.Node,
        dice:Dice,
        btn_ready:cc.Node,
        btn_quit:cc.Node,
        btn_score:cc.Node,
        tips:cc.Node,
        lab_room:cc.Label,
        lab_warning:cc.Node,
        lab_contents:cc.Node,
        btn_score_close:cc.Node,
        map:Map,
        audioTpl:cc.Prefab,
        panel_loading:cc.Node,
        panel_avators:PanelAvators,
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
        console.log("游戏开始 开始骰：",data.posId,globalData.gameMgr.posId)
        this.reset()
        this.map.makeBomb(data.bomb_idxs)
        this.onShowTips("游戏开始 第"+globalData.gameMgr.play_index+"局");
        // this._cur_dice_idx = data.posId;
        this.button_dice.active = globalData.gameMgr.posId == data.posId && !globalData.gameMgr.is_ob;
        // if(this.dice.active){
        //     this.dice.getChildByName("img_bg").getComponent(cc.Button).interactable = true;
        // }
        this.dice.isShow = true;

        for (const i in globalData.gameMgr.playerData) {
            if (globalData.gameMgr.playerData[i]){
                this.playerNodes[globalData.gameMgr.playerData[i].posId].setTurnFlag(data.posId == i);
            }
        }
        this.dice.showNum(1,data.posId);

        this.render()
        this.btn_quit.active = false;
    },
    onGameOver(data){
        this.onShowTips("游戏结束！");
        globalData.gameMgr.roomState.state = 2; //结束
        globalData.gameMgr.score_list.push(data);

        this.panel_game_over.active = !globalData.gameMgr.isRecover;
        // this.btn_score.active = true;
        this.button_dice.active = false;
        this.dice.isShow = false;

        this._cur_score_idx = globalData.gameMgr.score_list.length -1;
        this.renderScorePanel()
        this.render();
    },
    onMakeDiceNumSuccess(data){
        var that = this;
        console.log("MakeDiceNumSuccess 骰子： ",data.num)
        if(!cc.gameInBackgroud){
            this.showDiceNum(data.num,data.posId,function(){
                that.playerNodes[data.posId].render()
                that.playerNodes[data.posId].showCtrlCircle(data.num);
                // that.playerNodes[data.posId].
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
        
        
        var isQuit = globalData.gameMgr.play_index >= globalData.gameMgr.play_count;
        this.panel_avators.node.active = this.btn_ready.active && !isQuit;
        this.panel_avators.render();
        
        this.btn_quit.active = false;
        for (let i = 0; i < this.playerNodes.length; i++) {
            if(globalData.gameMgr.playerData[i]){
                this.playerNodes[i].render()
            }
        }

        // this.btn_score.active = globalData.gameMgr.score_list.length > 0;
        this.lab_room.string = "局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;

        //发送退出游戏事件
        // if(isQuit){
        //     window.parent.postMessage({'quitGame':1}, "*");
        //     console.log("发送退出事件")
        // }
    },
    renderScorePanel(){
        var data = globalData.gameMgr.score_list[this._cur_score_idx];
        var lab_title = this.panel_game_over.getChildByName('lab_title').getComponent(cc.Label);
        if(data.invalid == 1){
            // lab_title.string = "有玩家逃跑，本局无效";
            this.lab_warning.active = true;
            this.lab_contents.active = false;

            this.panel_loading.active = false;
            console.log("this.panel_loading.active false")
        }else{
            this.lab_warning.active = false;
            this.lab_contents.active = true;

            if(data.winer == globalData.gameMgr.posId){
                lab_title.string = "恭喜，你赢了！";
            }else{
                lab_title.string = "你输了，加油~";
            }

            for (let i = 0; i < 4; i++) {
                var item = this.panel_game_over.getChildByName('container').getChildByName('player'+(i+1))
                var playerData = globalData.gameMgr.playerData[i];
                if(playerData && data.invalid != 1){
                    item.active = true;
                    item.getComponent(cc.Label).string = playerData.name + " " + "+"+data.score_list[playerData.posId]+"分";
                }else{
                    item.active = false;
                }
            }
        }
        this.btn_score_close.active = globalData.gameMgr.play_index < globalData.gameMgr.play_count;
    },
    onLoad(){
        var that = this;
        //进入后台继续动画

        this.playerNodes = [this.player_node1,this.player_node2,this.player_node3,this.player_node4];
        // this.btn_ready.active = true;
        this.button_dice.active = false;
        this.dice.isShow = false;

        globalData.eventlister.on('BACK_HOME',function(data){
            that.onBackHome(data)
        });
        globalData.eventlister.on('PREPARE_SUCCESS',function(data){
            that.panel_avators.render();
            that.onPrepareSuccess(data)
        })
        globalData.eventlister.on('SIT_CHANGE',function(data){
            that.panel_avators.render();
            that.onSitChange(data)
        });
        globalData.eventlister.on('GAME_START',function(data){
            that.panel_avators.node.active = false;
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
        globalData.eventlister.on('FINISH_CHESS_SUCCESS',function(data){
            that.playerNodes[data.posId].finishChess(data.idx);
        });
        globalData.eventlister.on('GAME_OVER',function(data){
            that.onGameOver(data)
        });
        globalData.eventlister.on("MESSAGE",function(msg){
            that.onShowTips(msg)
        });
        globalData.eventlister.on("CONNECT_STATE",function(data){
            that.playerNodes[data.posId].render();
        });
        globalData.eventlister.on("LOGIN_SUCCESS",function(){
            for (let i = 0; i < 4; i++) {
                that.playerNodes[i].node.active = false;
            }
            for (const i in globalData.gameMgr.playerData) {
                if(globalData.gameMgr.playerData[i]) {
                    that.playerNodes[globalData.gameMgr.playerData[i].posId].node.active = true;
                    that.playerNodes[globalData.gameMgr.playerData[i].posId].render();
                }
            }
            // this.btn_score.active = false;
            // cc.playMusic("sound/bg",true,1);
            that.panel_avators.render();
            that.render();
            that.panel_loading.active = false; 
        });
        globalData.eventlister.on("SET_RECOVER_STATUS",function(){
            if(globalData.gameMgr.isRecover == false){
                that.panel_loading.active = false;
            }
        })

        var audioObj = cc.instantiate(this.audioTpl);
        audioObj.parent = that.node;
        cc.audioObj = audioObj;
        if(cc.isPlayingGlobalBg === 0){
            cc.audioObj.getComponent(cc.AudioSource).stop();
        }
        // 监听游戏回到前台事件
        cc.game.targetOff(that);
        // cc.game.on(cc.game.EVENT_SHOW, function(){
        //     if(!cc.audioObj){
        //         var audioObj = cc.instantiate(that.audioTpl);
        //         audioObj.parent = that.node;
        //         cc.audioObj = audioObj;
        //     }
        //     if(cc.isPlayingGlobalBg === 0){
        //         cc.audioObj.getComponent(cc.AudioSource).stop();
        //     }
        // }, that);
        cc.game.on(cc.game.EVENT_HIDE, function(){
            if(cc.audioObj){
                cc.audioObj.destroy();
                cc.audioObj = null;
            }
        }, that);
    },


    showDiceNum(num,posId,cbFunc) {
        console.log("showDiceNum")
        for (let i = 0; i < this.playerNodes.length; i++) {
            this.playerNodes[i].cleanDice();
        }
        for (let i = 0; i < this.playerNodes.length; i++) {
            this.playerNodes[i].resetChessSelectIcon();
        }

        if(globalData.gameMgr.isRecover){
            this.dice.showNum(num,posId,cbFunc)
        }else{
            this.dice.playNum(num,posId,cbFunc)
        }
    },

    nextPlayerDice(data){

        this._isCanMakeDiceLock = false;
        // console.log(data.posId)
        this.onShowTips("请【"+globalData.gameMgr.playerData[data.posId].name+"】骰筛子");
        for (const i in globalData.gameMgr.playerData) {
            this.playerNodes[globalData.gameMgr.playerData[i].posId].setTurnFlag(data.posId == i);
        }
        this.dice.showNum(1,data.posId);

        console.log("轮到",data.posId,"  我是：",globalData.gameMgr.posId)

        this.button_dice.active = globalData.gameMgr.posId == data.posId && !globalData.gameMgr.is_ob;
        // if(this.dice.active){
        //     this.dice.getChildByName("img_bg").getComponent(cc.Button).interactable = true;
        // }
        this.dice.isShow = true;

        for (let i = 0; i < this.playerNodes.length; i++) {
            this.playerNodes[i].resetChessSelectIcon();
        }
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
