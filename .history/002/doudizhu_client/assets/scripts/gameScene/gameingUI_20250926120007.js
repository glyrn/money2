import globalData from "../globalData";
import AvatorMini from "../prefabs/AvatorMini";

cc.Class({
    extends: cc.Component,
    name:"GameUI",
    properties: {
        gameingUI: cc.Node,
        card_prefab:cc.Prefab,
        bottom_card_pos_node:cc.Node,
        playingUI_node:cc.Node,
        panel_tip:cc.Node,
        tipsLabel:cc.Label, //玩家出牌不合法的tips
        // playing_clock_label:cc.Label,
        panel_score:cc.Node,
        panel_ctrl:cc.Node,
        panel_gameover:cc.Node,
        btn_buchu:cc.Node,
        avator_mini_list : {
            default:[],
            type:[AvatorMini]
        },
        lab_score1:cc.Label,
        lab_score2:cc.Label,
        lab_score3:cc.Label,
        lab_title:cc.Label,
        btn_score1:cc.Button,
        btn_score2:cc.Button,
        btn_score3:cc.Button,
        // btn_last_score:cc.Button,
        // btn_curr_score:cc.Button,
        // btn_score:cc.Node,
        lab_contents:cc.Node,
        lab_warning:cc.Node,
        btn_continues:cc.Node, 
        panel_loading:cc.Node,

    },

    onLoad (){
        let that = this;
        globalData.eventlister.on("CTX_USER_CHANGE1",function(){
            that.render();
        });
        globalData.eventlister.on('SHOW_TOP_CARD',function(){
            that.render();
        });
        globalData.eventlister.on('PLAY_CARD_ERROR',function(msg){
            that.renderTips(msg)
        });
        globalData.eventlister.on('MESSAGE',function(msg){
            that.renderTips(msg)
        })

        globalData.eventlister.on('PLAY_CARD_SUCCESS1',function(){
            that.render();
        });
        globalData.eventlister.on('CTX_PLAY_CHANGE1',function(){
            that.render();
        });
        globalData.eventlister.on('FORCE_EXIT_EV',function(msg){
            that.renderTips(msg)
            that.render();
        })
        globalData.eventlister.on('GAME_OVER1',function(param){
            that.render()
            that.pushGameOverData(param);
        })
        // globalData.eventlister.on("UPDATE_TIMER",function(){
        //     that.renderClock()
        // });
        this.btn_scores = [this.btn_score1,this.btn_score2,this.btn_score3];

    },
    update(){
        // this.renderClock();
    },
    start () {
        // this.btn_score.active = globalData.gameMgr.score_list.length > 0;
    },
    onBtnChupai(){
        globalData.gameMgr.playCards();
    },
    onBtnBuchu(){
        globalData.socketMgr.pass_card();
    },
    onBtnBuQiang(){
        globalData.socketMgr.call_score(0);
    },
    onBtnScore1(){
        globalData.socketMgr.call_score(1);
    },
    onBtnScore2(){
        globalData.socketMgr.call_score(2);
    },
    onBtnScore3(){
        globalData.socketMgr.call_score(3);
    },
    onBtnCloseSettle(){
        this.panel_gameover.active = false;
    },
    // onBtnScoreLast(){
    //     this.game_over_select_idx--;
    //     if(this.game_over_select_idx == 0){
    //         this.game_over_select_idx = 1;
    //     }
    //     this.renderGameOverPlane(this.game_over_select_idx);
    // },
    onBtnScoreCurrent(){
        this.renderGameOverPlane(this.current_play_index);
    },

    // renderClock(){
    //     var now = Math.floor(Date.parse(new Date()) / 1000);
    //     this.playing_clock_label.string = Math.max(0,globalData.gameMgr.roomState.server_time + globalData.gameMgr.roomState.timeout - now);
    // },
    render(){

        let roomState = globalData.gameMgr.roomState;

        if (roomState.state > 0 && roomState.state < 3 && roomState.ctxPos === 'self' && !globalData.gameMgr.is_ob){
            this.playingUI_node.active = true;
        }else{
            this.playingUI_node.active = false;
        }

        this.panel_score.active = roomState.state === 1
        this.panel_ctrl.active = roomState.state === 2

        this.btn_buchu.active = roomState.ctxCard.ctxPos !== roomState.ctxPos

        // this.btn_score.active = globalData.gameMgr.score_list.length > 0;

        //叫分按钮
        for (let i = 0; i < this.btn_scores.length; i++) {
            this.btn_scores[i].interactable = false;
            this.btn_scores[i].node.opacity = 255*0.5;

            for (let j = 0; j < roomState.ctxScore.length; j++) {
                if(roomState.ctxScore[j]-1 == i){
                    this.btn_scores[i].interactable = true;
                    this.btn_scores[i].node.opacity = 255;
                }
            }
        }

        // this.renderClock();
    },
    renderTips(msg) {
        this.panel_tip.active = !globalData.gameMgr.isRecover;
        this.tipsLabel.string = msg;
        this.scheduleOnce(function () {
            this.panel_tip.active = false;
        }, 2);
    
    },
    renderGameOverPlane(index){

        this.panel_gameover.active = !globalData.gameMgr.isRecover;
        let data = this.score_list[this.score_list.length-1];

        //有人逃跑 无效局
        if(data && data.invalid == 1){
            this.lab_contents.active = false;
            this.lab_warning.active = true;
            this.btn_continues.active = false;
            this.panel_loading.active = false;
        }else{
            this.lab_contents.active = true;
            this.lab_warning.active = false;
            var is_quit = globalData.gameMgr.play_index >= globalData.gameMgr.play_count;
            this.btn_continues.active = !is_quit;
            var isWin = data.winner.indexOf(globalData.gameMgr.posId) > -1;
            this.lab_title.string =  isWin ? '恭喜你，你赢了' : '很遗憾，你输了';
        }
        var score = data.score * data.ratio * globalData.gameMgr.base_score;

        var avator_mini_list = [this.avator_mini_list[0],this.avator_mini_list[1],this.avator_mini_list[2]];
        var lab_scores = [this.lab_score1,this.lab_score2,this.lab_score3];

        data.winner.forEach(function (id) {
            var direct = globalData.gameMgr.getDirectionByPosId(id);
            avator_mini_list.shift().render(globalData.gameMgr.posState[direct]);
            lab_scores.shift().string = '+'+(score / data.winner.length);
        });
        data.loser.forEach(function (id) {
            var direct = globalData.gameMgr.getDirectionByPosId(id);
            avator_mini_list.shift().render(globalData.gameMgr.posState[direct]);
            lab_scores.shift().string = '-'+(score / data.loser.length);
        });

        // this.btn_score_close.active = globalData.gameMgr.play_index < globalData.gameMgr.play_count;
    },
    pushGameOverData(data) {

        this.game_over_select_idx = globalData.gameMgr.play_index;
        this.current_play_index = globalData.gameMgr.play_index;
        globalData.gameMgr.score_list.push(data);
        this.score_list =  globalData.gameMgr.score_list;

        // this.btn_score.active = globalData.gameMgr.score_list.length > 0;

        var score_append = Number(data.score * data.ratio * globalData.gameMgr.base_score);
        data.winner.forEach(function (id) {
            var direct = globalData.gameMgr.getDirectionByPosId(id);
            var score =  Number(globalData.gameMgr.posState[direct].score)
            globalData.gameMgr.posState[direct].score = score + (score_append / data.winner.length);
        });
        data.loser.forEach(function (id) {
            var direct = globalData.gameMgr.getDirectionByPosId(id);
            var score =  Number(globalData.gameMgr.posState[direct].score)
            globalData.gameMgr.posState[direct].score = score - (score_append / data.loser.length);
        });
        this.onBtnScoreCurrent();
        //播放音效
        var isWin = data.winner.indexOf(globalData.gameMgr.posId) > -1;
        if(isWin){
            cc.playEffect("sound/win.mp3",false,1);
        }else{
            cc.playEffect("sound/lose.mp3",false,1);
        }
    }
});
