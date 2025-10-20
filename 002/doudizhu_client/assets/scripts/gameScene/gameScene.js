import globalData from "../globalData";
import PanelAvators from "../../Prefab/PanelAvators";

cc.Class({
    extends: cc.Component,

    properties: {
        lab_roomid:cc.Label,
        player_node_prefab:cc.Prefab,
        //绑定玩家座位,下面有3个子节点
        players_seat_pos:cc.Node,
        gameBeforeUI:cc.Node,
        gameUI:cc.Node,
        player_node_list : {
            default:[],
            type:[cc.Node]
        },
        bottom_card_pos_node:cc.Node,
        topCardNodeList:{
            default:[],
            type:[cc.Node]
        },
        laiziCardNodeList:{
            default:[],
            type:[cc.Node]
        },
        labTopCardScore:cc.Label,
        globalSelfAnim:cc.Animation,
        audioTpl:cc.Prefab,
        panel_loading:cc.Node,
        panel_avators:PanelAvators,
        top_score_view:cc.Node,
    },
    onLoad () {

        let that = this;

        // for(var i=0;i<3;i++){
        //     var player_node = cc.instantiate(this.player_node_prefab);
        //     player_node.parent = cc.find('seat_node_'+(i+1),this.players_seat_pos);
        //     player_node.active = false;
        //     this.player_node_list[i] = player_node;
        // }
        
        // cc.playMusic("sound/bg",true,1);

        globalData.eventlister.on('PREPARE_SUCCESS',function(){
            //准备成功
            that.renderPlayerNode();
            that.renderBeforeUI();
            that.panel_avators.render();
        });

        //有其他玩家坐下
        globalData.eventlister.on("POS_STATUS_CHANGE",function(){
            that.renderPlayerNode();
            that.renderRoom();
            that.panel_avators.render();
        });

        globalData.eventlister.on("GAME_START",function(){
            that.renderPlayerNode();
            that.renderCard();
            that.renderTopCard();
            that.renderRoom();
            cc.playEffect("sound/wash_card",false,1);
            that.globalSelfAnim.node.active = false;
            that.panel_avators.node.active = false;

        });
        globalData.eventlister.on("SHOW_TOP_CARD",function(data){

            that.renderPlayerNode();
            that.renderCard();
            that.renderTopCard(data);
        })

        globalData.eventlister.on("PLAY_CARD_SUCCESS",function(){
            that.renderCard();
            if(globalData.gameMgr.posState.left.isPass ) {
                that.player_node_list[1].getComponent('PlayerNode').cleanPass()
            }
            if(globalData.gameMgr.posState.right.isPass){
                that.player_node_list[2].getComponent('PlayerNode').cleanPass()
            }
            
        });
        globalData.eventlister.on('CTX_PLAY_CHANGE',function(){
            that.renderPlayerNode();
            that.renderCard();
        })
        globalData.eventlister.on("CALL_SCORE_SUCCESS",function(){
            that.renderPlayerNode();
        });
        globalData.eventlister.on("CTX_USER_CHANGE",function(){
            that.renderPlayerNode();
        });
        globalData.eventlister.on('GAME_OVER',function(){
            that.renderPlayerNode();
            that.renderCard();
            that.panel_avators.render()
            that.globalSelfAnim.node.active = false;
        });
        globalData.eventlister.on('FORCE_EXIT_EV1',function(){
            that.renderPlayerNode();
            that.renderCard();
        });
        globalData.eventlister.on('UPDATE_TIMER1',function(){
            that.renderPlayerClock();
        });
        globalData.eventlister.on('auto_play_card',function(){
            if(that.player_node_list[0].getComponent('PlayerNode').selectTips(globalData.gameMgr.posState.self)){
                globalData.gameMgr.playCards();
            }else{
                if(globalData.gameMgr.roomState.ctxCard.ctxPos !== globalData.gameMgr.roomState.ctxPos){ //可以pass
                    globalData.socketMgr.pass_card();
                }else{
                    that.player_node_list[0].getComponent('PlayerNode').selectLastOne(globalData.gameMgr.posState.self);
                    globalData.gameMgr.playCards();
                }
            }
        });
        globalData.eventlister.on('show_global_effect',function(data){

            if(data.isHide){
                that.globalSelfAnim.node.active = false;
                globalData.gameMgr.isShowingGlobalEffect = false;
            }else{
                that.globalSelfAnim.node.active = true;
                that.globalSelfAnim.play(data.anim);
                globalData.gameMgr.isShowingGlobalEffect = true;
                if(data.isAutoHide){
                    that.scheduleOnce(function () {
                        that.globalSelfAnim.node.active = false;
                        globalData.gameMgr.isShowingGlobalEffect = false;
                    }, 2);
                }
            }
        });
        globalData.eventlister.on("CONNECT_STATE",function(data){
            that.renderPlayerNode();
        });
        globalData.eventlister.on("LOGIN_SUCCESS",function(){
            if(!globalData.gameMgr.isRecover){
                that.panel_loading.active = false;
            }
            that.panel_avators.render();
        })
        globalData.eventlister.on("SET_RECOVER_STATUS",function(){
            if(globalData.gameMgr.isRecover){
                that.panel_loading.active = true;
            }
        })

        this.node.on(cc.Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(cc.Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(cc.Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        var audioObj = cc.instantiate(this.audioTpl);
        audioObj.parent = that.node;
        cc.audioObj = audioObj;
        if(cc.isPlayingGlobalBg === 0){
            cc.audioObj.getComponent(cc.AudioSource).stop();
        }

        // 监听游戏回到前台事件
        cc.game.targetOff(that);

        cc.game.on(cc.game.EVENT_HIDE, function(){
            if(cc.audioObj){
                cc.audioObj.destroy();
                cc.audioObj = null;
            }
        }, that);
    },

    update:function(){

        var that = this;
        var now = Math.floor(Date.parse(new Date()) / 1000);
        var timer_value = globalData.gameMgr.roomState.server_time + globalData.gameMgr.roomState.timeout - now;
        
        if(timer_value >= 0 && (globalData.gameMgr.roomState.state == 1 || globalData.gameMgr.roomState.state == 2)) {
            

            // globalData.eventlister.fire("UPDATE_TIMER");
            that.renderPlayerClock();
            
            // if (timer_value == 0) {
            //     globalData.gameMgr.roomState.server_time =0;
            //     globalData.gameMgr.roomState.timeout = 0;
   
            //     if (globalData.gameMgr.roomState.state == 2 && globalData.gameMgr.roomState.ctxPos === 'self') {
            //         globalData.eventlister.fire('auto_play_card')
            //     }else if(globalData.gameMgr.roomState.state == 1 && globalData.gameMgr.roomState.ctxPos === 'self'){
            //         //不抢
            //         globalData.socketMgr.call_score(0);
            //     }
              
            // }
        }
    },
    onTouchStart(event){
        let pos = event.getLocation();
        let beginPos = this._beginPos = this.player_node_list[0].getComponent('PlayerNode').node.parent.convertToNodeSpaceAR(pos);
        this._hasTouchCard = this.player_node_list[0].getComponent('PlayerNode').checkSelectCard(beginPos, beginPos, true);
    },
    onTouchMove(event){
        let pos = event.getLocation();
        let movePos = this.player_node_list[0].getComponent('PlayerNode').node.parent.convertToNodeSpaceAR(pos);

        // 这里确定是(movePos, movePos) 每次移动只选择右侧一张
        this.player_node_list[0].getComponent('PlayerNode').checkSelectCard(movePos, movePos);
        // 这里要传入起点和结束点，获取总的框取范围
        this.player_node_list[0].getComponent('PlayerNode').checkSelectCardReverse(this._beginPos, movePos);
        //查漏
        this.player_node_list[0].getComponent('PlayerNode').checkMissSelectCard()
    },
    onTouchEnd(){
        this.player_node_list[0].getComponent('PlayerNode').onSelectCardEnd(this._hasTouchCard);
        //检测是否有特效牌型
        this.player_node_list[0].getComponent('PlayerNode').checkEffectCardAnim(globalData.gameMgr.posState.self);
    },

    start(){
        // this.renderPlayerNode();
    },
    onBtnTips(){
        this.player_node_list[0].getComponent('PlayerNode').selectTips(globalData.gameMgr.posState.self,true)
        //检测是否有特效牌型
        this.player_node_list[0].getComponent('PlayerNode').checkEffectCardAnim(globalData.gameMgr.posState.self);
    },
    renderRoom(){
        this.lab_roomid.string = 
            "底分:"+globalData.gameMgr.base_score +
            " 局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
        this.labTopCardScore.string = '';
        this.top_score_view.active = false;
    },
    renderPlayerNode(){
        // 刷新玩家头像
        let roomState = globalData.gameMgr.roomState
        this.player_node_list[0].getComponent('PlayerNode').render(globalData.gameMgr.posState.self,roomState);
        this.player_node_list[1].getComponent('PlayerNode').render(globalData.gameMgr.posState.left,roomState);
        this.player_node_list[2].getComponent('PlayerNode').render(globalData.gameMgr.posState.right,roomState);
    },
    renderPlayerClock(){
        // 刷新玩家倒计时
        let roomState = globalData.gameMgr.roomState;
        this.player_node_list[0].getComponent('PlayerNode').renderClock(roomState);
        this.player_node_list[1].getComponent('PlayerNode').renderClock(roomState);
        this.player_node_list[2].getComponent('PlayerNode').renderClock(roomState);
    },
    renderCard(){
        let roomState = globalData.gameMgr.roomState
        this.player_node_list[0].getComponent('PlayerNode').renderCard('self',globalData.gameMgr.posState.self,roomState);
        this.player_node_list[1].getComponent('PlayerNode').renderCard('left',globalData.gameMgr.posState.left,roomState);
        this.player_node_list[2].getComponent('PlayerNode').renderCard('right',globalData.gameMgr.posState.right,roomState);
    },
    renderTopCard(data){

        let roomState = globalData.gameMgr.roomState
        for(var i=0;i<3;i++){
            var card = globalData.gameMgr.posState.top.cards[i];
            this.topCardNodeList[i].active = roomState.state > 1;
            this.topCardNodeList[i].getComponent('Card').render('top',roomState.state >= 2 ? card : {value:0,type:0})
        }

        for(var i=0;i<2;i++){
            var card = globalData.gameMgr.posState.laizi.cards[i];
            if(card){
                this.laiziCardNodeList[i].active = roomState.state > 1;
                this.laiziCardNodeList[i].getComponent('Card').render('laizi',roomState.state >= 2 ? card : {value:0,type:0})
            }else{
                this.laiziCardNodeList[i].active = false;
            }
        }

        if(data){
            this.top_score_view.active = true;
            this.labTopCardScore.string = data.score + "倍";
        }
    },

    renderBeforeUI() {
        this.gameBeforeUI.getComponent('GameBeforeUI').render();
    },

    
});
