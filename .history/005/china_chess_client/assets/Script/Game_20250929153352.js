import globalData from "./data/globalData.js"
import chessLogic from "./data/chessLogic.js"
import playLogic from "./data/playLogic.js"
import AvatorMini from "../Prefab/AvatorMini";
import PanelAvators from "../Prefab/PanelAvators"
cc.Class({
    extends: cc.Component,

    properties: {
        btnRestart:{
            default: null,
            type: cc.Button
        },
        panel_over:cc.Node,

    
        chessPrefab:{//棋子的预制资源
            default:null,
            type:cc.Prefab
        },

        lab_room:cc.Label,
        btn_ready:cc.Node,
        btn_score:cc.Node,
        btn_quit:cc.Node,

        target_node:cc.Node,
        avator_mini1:AvatorMini,
        avator_mini2:AvatorMini,
        lab_player1:cc.Label,
        lab_player2:cc.Label,
        icon_player1:cc.Sprite,
        icon_player2:cc.Sprite,
        icon_win:cc.SpriteFrame,
        icon_lost:cc.SpriteFrame,
        img_yuanbao1:cc.Sprite,
        img_yuanbao2:cc.Sprite,
        yuanbao_win:cc.SpriteFrame,
        yuanbao_lost:cc.SpriteFrame,

        dialog_retrack:cc.Node,

        avator_target:cc.Node,
        avator_my:cc.Node,
        game_start:cc.Node,
        img_jiangjun:cc.Node,
        lab_tips:cc.Label,
        tips:cc.Node,
        lab_warning:cc.Node,
        lab_contents:cc.Node,
        btn_score_close:cc.Node,
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
        this.panel_over.active = true;
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
        this.panel_over.active = false;
    },
    onBtnRetrack(){

        if(playLogic.isPlay){
            if(globalData.gameMgr.play_mode == 1) { //人人
                if(!this.retrack_lock){
                    if(playLogic.pace.length == 0) { //游戏还没走步
                        this.showTips("请走步");
                    }else{
                        console.log(globalData.gameMgr.playerData.self.retrack_num)
                        if (globalData.gameMgr.playerData.turn != globalData.gameMgr.playerData.self.posId
                            && globalData.gameMgr.playerData.self.retrack_num > 0) {
                            this.retrack_lock = true;
                            globalData.socketMgr.retrackChess();
                            globalData.gameMgr.playerData.self.retrack_num--;
                            this.showTips("请求悔棋中,剩余" + globalData.gameMgr.playerData.self.retrack_num + "次");
                        }
                    }
                }else{
                    this.showTips("本回合已使用过悔棋，请走步");
                }
            }else{ //人机
                playLogic.regret();
            }
        }else{
            this.showTips("游戏还没开始")
        }
    },
    onBtnAgreeRetrack(){
        globalData.socketMgr.retrackRsp(1)
        this.dialog_retrack.active = false;
    },
    onBtnNotAgreeRetrack(){
        globalData.socketMgr.retrackRsp(0)
        this.dialog_retrack.active = false;
    },
    onBtnCloseRetrack(){
        this.dialog_retrack.active = false;
    },
    onLoad: function () {

        this.game_start.active = false;
        this.panel_over.active = false;
        this.btn_quit.active = false;
        // this.btn_score.active = false;
        this.dialog_retrack.active = false;
        var that = this;

        chessLogic.init();
        playLogic.init(3);
        //监听点击
        var children = this.node.getChildByName('grid').getChildren();
        for (let i = 0; i < children.length; i++) {
            children[i].getComponent(cc.Button).node.on('click',function(btn){

                var pos = btn.node.position;
                var x = (pos.x - 30) / 60;
                var y = (522 - (pos.y - 29)) / 58;
                //人机
                if(globalData.gameMgr.play_mode == 0) {
                    playLogic.clickCanvas(x,y);
                }else{ //人人
                    //悔棋中
                    if(that.retrack_lock) return;

                    if(globalData.gameMgr.playerData.turn == globalData.gameMgr.playerData.self.posId){

                        var key = playLogic.getClickMan(x,y);
                        if(key == false){
                            // globalData.socketMgr.playChess(x,y,1);
                        }else{
                            if((chessLogic.mans[key].my === 1 && globalData.gameMgr.playerData.self.posId == 0) ||
                                (chessLogic.mans[key].my === -1 && globalData.gameMgr.playerData.self.posId == 1)){
                                if(key != playLogic.nowManKey){
                                    // globalData.socketMgr.playChess(x,y,0);
                                }
                            }
                        }
                    }
                }
            })
        }


        globalData.eventlister.on("GAME_START",function(){
            that.panel_avators.node.active = false;
            that.gameStart()
        });
        globalData.eventlister.on("GAME_OVER",function(data){
            that.gameOver(data)
        });
        globalData.eventlister.on("MESSAGE",function(msg){
            that.showTips(msg)
        });
        globalData.eventlister.on("SHOW_JIANGJUN",function(){
            that.showJiangjun();
        })
        globalData.eventlister.on("RETRACK_CHESS_REQ",function(data){
            that.retrack_lock = true;
            //非观众
            that.dialog_retrack.active = data.posId == globalData.gameMgr.playerData.self.posId 
            && !globalData.gameMgr.is_ob
            && !globalData.gameMgr.isRecover;
        });
        //刷新对手
        globalData.eventlister.on("SIT_CHANGE",function(data){
            that.panel_avators.render();
            that.render();
        })
        globalData.eventlister.on("LOGIN_SUCCESS",function(){
            that.panel_avators.render();
            that.render();
            that.panel_loading.active = false;
        })
        globalData.eventlister.on("SET_RECOVER_STATUS",function(){
            if(globalData.gameMgr.isRecover == false){
                that.panel_loading.active = false;
            }
        })
        globalData.eventlister.on('PREPARE_SUCCESS',function(prepare_uid){
            //准备成功
            
            if(globalData.gameMgr.play_mode == 0){ //人机
                that.btn_ready.active = false;
            }else{ //人人
                if(globalData.gameMgr.playerData.self.uid == prepare_uid){
                    globalData.gameMgr.playerData.self.state = 2;
                }else if(globalData.gameMgr.playerData.target &&
                    globalData.gameMgr.playerData.target.uid == prepare_uid){
                    globalData.gameMgr.playerData.target.state = 2;
                }
                that.panel_avators.render();
                that.render();
            }
        });
        globalData.eventlister.on('PLAY_CHESS_SUCCESS',function(data){
            playLogic.clickCanvas(data.x,data.y);

        })
        globalData.eventlister.on('CHECK_END',function(){
            var winer = playLogic.AICheckRedEnd();
            if(winer !== -1){
                playLogic.isPlay = false;
                globalData.eventlister.fire('GAME_OVER',{score:100,winer:winer});
            }

            var winer = playLogic.AICheckBlackEnd();
            if(winer !== -1){
                playLogic.isPlay = false;
                globalData.eventlister.fire('GAME_OVER',{score:100,winer:winer});
            }
        })
        globalData.eventlister.on("RETRACK_CHESS_RSP_SUCCESS",function(data){
            that.retrack_lock = false;
            //同意
            if(data.agree){
                playLogic.regret();
                playLogic.nowManKey = false;
                globalData.gameMgr.playerData.turn = data.turn;
                globalData.eventlister.fire("CHANGE_TURN")
            }
        });
        globalData.eventlister.on('CHANGE_TURN',function(){
            that.retrack_lock = false;
            that.render();
        })
        globalData.eventlister.on("CONNECT_STATE",function(data){
            that.render();
        });
    },

    render(){

        this.btn_ready.active = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) &&
            globalData.gameMgr.playerData.self.state < 2;

        var isQuit = globalData.gameMgr.play_index >= globalData.gameMgr.play_count ;
        this.panel_avators.node.active = this.btn_ready.active && !isQuit;
        this.panel_avators.render();

        this.btn_quit.active = false;
        this.avator_my.active = true;
        this.avator_target.active = true;

        if(globalData.gameMgr.play_mode == 0){//人机对战
            this.avator_target.active = true;
            if(globalData.gameMgr.playerData.self.posId == 0){
                globalData.gameMgr.playerData.pc.posId = 1;
            }else{
                globalData.gameMgr.playerData.pc.posId = 0;
            }
            this.avator_my.getComponent("Avator").setData(globalData.gameMgr.playerData.self,"self");
            this.avator_target.getComponent("Avator").setData(globalData.gameMgr.playerData.pc,"pc");
        }else{
            this.avator_my.getComponent("Avator").setData(globalData.gameMgr.playerData.self,'self');
            this.avator_target.getComponent("Avator").setData(globalData.gameMgr.playerData.target,'target');
        }
        this.lab_room.string = "局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
    },
    gameStart:function(){

        var that = this;
        this.game_start.active = !globalData.gameMgr.isRecover;
        this.game_start.getComponent(cc.Animation).play()
        this.retrack_lock = true;

        this.scheduleOnce(function () {
            that.game_start.active = false;
        },1.5)

        var rotation = 0;
        if(globalData.gameMgr.playerData.self.posId == 0){
            rotation = 0;
        }else{
            rotation = -180;
        }
        cc.find('Canvas/center').rotation = rotation;

        playLogic.isPlay=true ;
        chessLogic.reset(rotation);
        playLogic.reset();

       

        this.render();
        this.panel_over.active = false;
    },
    gameOver:function(data){

        globalData.gameMgr.roomState.state = 2; //结束
        globalData.gameMgr.server_time = Math.floor(new Date().getTime() / 1000);
        globalData.gameMgr.score_list.push(data);

        globalData.gameMgr.playerData.self.score = parseInt(globalData.gameMgr.playerData.self.score);
        if(globalData.gameMgr.play_mode == 0){ //人机
            if(globalData.gameMgr.playerData.target){
                globalData.gameMgr.playerData.target = globalData.gameMgr.playerData.pc;
            }
        }

        if(globalData.gameMgr.playerData.target) {
            globalData.gameMgr.playerData.target.score = parseInt(globalData.gameMgr.playerData.target.score);
        }
        data.score = parseInt(data.score);
        if(data.winer == globalData.gameMgr.playerData.self.posId){
            globalData.gameMgr.playerData.self.score += data.score;
            if(globalData.gameMgr.playerData.target) {
                globalData.gameMgr.playerData.target.score -= data.score;
            }
        }else{
            globalData.gameMgr.playerData.self.score -= data.score;
            if(globalData.gameMgr.playerData.target) {
                globalData.gameMgr.playerData.target.score += data.score;
            }
        }

        this._cur_score_idx = globalData.gameMgr.score_list.length -1;
        this.renderScorePanel()
        // this.btn_score.active = globalData.gameMgr.score_list.length > 0;

        globalData.gameMgr.playerData.self.state = 1;
        if(globalData.gameMgr.playerData.target){
            globalData.gameMgr.playerData.target.state = 1;
        }
        // this.select_icon.active = false;
        this.touchChess = null;
        this.render()
        var isQuit = globalData.gameMgr.play_index >= globalData.gameMgr.play_count ;
        this.btn_quit.active = false;

        globalData.socketMgr.reqGameOver(data);

        //发送退出游戏事件
        // if(isQuit){
        //     window.parent.postMessage({'quitGame':1}, "*");
        //     console.log("发送退出事件")
        // }
    },
    renderScorePanel(){

        this.panel_over.active = !globalData.gameMgr.isRecover;
        var data = globalData.gameMgr.score_list[this._cur_score_idx];
        //有人逃跑
        if(data.invalid == 1){
            this.lab_warning.active = true;
            this.lab_contents.active = false;

            this.panel_loading.active = false;
            console.log("this.panel_loading.active false")
        }else{

            this.lab_warning.active = false;
            this.lab_contents.active = true;

            this.avator_mini1.setData(globalData.gameMgr.playerData.self,"self");
            var flag = "target"
            if(globalData.gameMgr.play_mode == 0){ //人机
                flag = "pc"
            }
            if(globalData.gameMgr.playerData.target){
                this.target_node.active = true;
                this.avator_mini2.setData(globalData.gameMgr.playerData.target,flag);
            }else{
                this.target_node.active = false;
            }

            if(data.winer == globalData.gameMgr.playerData.self.posId){
                this.lab_player1.string = "+" + data.score;
                this.lab_player2.string = "-" + data.score;
                this.lab_player1.node.color = cc.color(253,223,0);
                this.lab_player2.node.color = cc.color(213,213,213);
                this.icon_player1.spriteFrame = this.icon_win;
                this.icon_player2.spriteFrame = this.icon_lost;
                this.img_yuanbao1.spriteFrame = this.yuanbao_win;
                this.img_yuanbao2.spriteFrame = this.yuanbao_lost;
            }else{
                this.lab_player1.string = "-" + data.score;
                this.lab_player2.string = "+" + data.score;
                this.lab_player1.node.color = cc.color(213,213,213);
                this.lab_player2.node.color =  cc.color(253,223,0);
                this.icon_player1.spriteFrame = this.icon_lost;
                this.icon_player2.spriteFrame = this.icon_win;
                this.img_yuanbao1.spriteFrame = this.yuanbao_lost;
                this.img_yuanbao2.spriteFrame = this.yuanbao_win;
            }
        }
        this.btn_score_close.active = globalData.gameMgr.play_index < globalData.gameMgr.play_count;
    },
    showTips:function(msg){

        this.tips.active = !globalData.gameMgr.isRecover;
        this.lab_tips.string = msg;
        this.scheduleOnce(function () {
            this.tips.active = false;
        },1);
    },
    showJiangjun:function(){

        cc.playEffect('jiangjun',false,1);

        this.img_jiangjun.active = !globalData.gameMgr.isRecover;
        this.img_jiangjun.getComponent(cc.Animation).play();
        this.scheduleOnce(function () {
            this.img_jiangjun.active = false;
        },2.5);
    }
});
