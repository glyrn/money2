import globalData from "../globalData";

cc.Class({
    extends: cc.Component,

    properties: {
        lab_roomid:cc.Label,
        btn_ready:cc.Node,
        btn_score:cc.Node,
        btn_quit:cc.Node,
        panel_score:cc.Node,
        panel_tip:cc.Node,
        panel_dialog:cc.Node,
        panel_bank:cc.Node,
        panel_luck:cc.Node,
        panel_event_view:cc.Node,
        avator_mini_tpl:cc.Prefab,
        player_tpl:cc.Prefab,
        build_tpl:cc.Prefab,
        _player_list : [],
        _avator_mini_list : [],
        dice:cc.Node,
    },
    onLoad() {

        let that = this;

        this.map_grids = [];
        var map = this.node.getChildByName('map');
        for (let i = 1; i <= 40 ; i++) {
            var grid = map.getChildByName(i.toString());
            var build = cc.instantiate(this.build_tpl);
            build.parent = grid;
            this.map_grids.push(grid);
        }

        //进入后台继续动画
        this.handleMainLoopTimer=setInterval(()=>{
            cc.director.mainLoop();
        }, 1000 / 60);

        this.renderRoom();


        globalData.eventlister.on('PREPARE_SUCCESS',function(posId){
            //准备成功
            that.renderRoom()
            that.renderPlayer();
        });
        globalData.eventlister.on('SIT_CHANGE',function(){
            that.renderPlayer();
            that.renderRoom();
        })

        globalData.eventlister.on("GAME_START",function(data){
            that.reset()
            that.btn_quit.active = false;
            that.renderPlayer();
            that.renderRoom();
            that.renderMap();

            that.dice.active = globalData.gameMgr.selfPosId == data.turn;
            if(that.dice.active){
                that.dice.getComponent(cc.Button).interactable = true;
            }
            that.dice.getComponent('Dice').isShow = true;
        });

        globalData.eventlister.on('GAME_OVER',function(data){
            // that.renderUI();
            that.renderRoom();
            that.renderPlayer();
            that.onBtnCurScore();

            that.dice.active = false;
            that.dice.getComponent('Dice').isShow = false;
            that.dice.getComponent(cc.Animation).stop();
        });
        globalData.eventlister.on('SHOW_DIALOG',function(data){
            that.showDialog(data.msg,data.okFunc);
        })
        globalData.eventlister.on("MESSAGE",function(msg){
            that.showTips(msg)
        });
        globalData.eventlister.on('CHANGE_TURN',function(data){

            that._isCanMakeDiceLock = false;

            that.renderPlayer();
            that.renderRoomTitle();

            that.dice.active = globalData.gameMgr.selfPosId == data.turn;
            if(that.dice.active){
                that.dice.getComponent(cc.Button).interactable = true;
            }
            that.dice.getComponent('Dice').isShow = true;
        });
        globalData.eventlister.on('MAKE_DICE_NUM_SUCCESS',function(data){
            that.dice.getComponent("Dice").playNum(data.num,function(){

                that.onMoveStep(data.posId,data.from_place_index,data.num,function(place_index){
                    if(globalData.gameMgr.selfPosId == data.posId){
                        var map_info = globalData.gameMgr.game_map[place_index];
                        if(map_info.type == 1){  //命运
                            that.showPanelLuck(function(){
                                globalData.socketMgr.luckyEvent();
                            });
                        }else if(map_info.type == 2){ //监狱
                            var money = globalData.gameMgr.getPlayerData(globalData.gameMgr.selfPosId).money;
                            that.showDialog("因触犯法律，需收监"+map_info.ext.round+'个回合，是否支付保释金'+map_info.ext.money+'(目前现金'+money+')？取消则开始坐牢！',
                                function(){  //交保释金
                                    globalData.socketMgr.payBail();
                                },function(){  //收监
                                    globalData.socketMgr.inJail();
                                });
                        }else if(map_info.type == 3){ //已买地，但未起
                            //自己地
                            if(map_info.belong == globalData.gameMgr.selfPosId){
                                if(map_info.build >= 4){ //已建
                                    //没事发生
                                    globalData.socketMgr.nextPlayerDice();
                                }else{
                                    var money = globalData.gameMgr.getPlayerData(globalData.gameMgr.selfPosId).money;
                                    that.showDialog('是否需要花费'+((map_info.build+1)*map_info.build_price)+'建酒店？(目前现金'+money+')',function(){
                                        globalData.socketMgr.buyBuild();
                                    });
                                }
                            }else{  //别人地  要交租
                                var money = globalData.gameMgr.getPlayerData(globalData.gameMgr.selfPosId).money;
                                that.showDialog('需要支付租金：'+map_info.rent+'元(目前现金'+money+')',function() {
                                    globalData.socketMgr.payRent();
                                },null,true);
                            }
                        }else{ //空地
                            var money = globalData.gameMgr.getPlayerData(globalData.gameMgr.selfPosId).money;
                            that.showDialog('是否需要花费'+map_info.land_price+'购买该土地？(目前现金'+money+')',function(){
                                globalData.socketMgr.buyBuild();
                            },function(){
                                //没事发生
                                globalData.socketMgr.nextPlayerDice();
                            });
                        }

                    }
                });
            });
        });

        globalData.eventlister.on('BUY_BUILD_SUCCESS',function(){
            that.renderPlayer();
            that.renderMap();
        });
        globalData.eventlister.on('PAY_RENT_SUCCESS',function(){
            that.renderPlayer();
            that.renderMap();
        });
        globalData.eventlister.on('LUCKY_EVENT_SUCCESS',function(data){
            that.showPanelEventView(data);
            that.renderPlayer();
        });

        globalData.eventlister.on("SAVE_MONEY_SUCCESS",function(){
            that.panel_bank.getComponent('BankPanel').render();
            that.renderPlayer();
        });
        globalData.eventlister.on("WITHDRAW_MONEY_SUCCESS",function(){
            that.panel_bank.getComponent('BankPanel').render();
            that.renderPlayer();
        });
        globalData.eventlister.on("BUY_BANK_ASSET_SUCCESS",function(){
            that.panel_bank.getComponent('BankPanel').render();
            that.renderMap();
            that.renderPlayer();
        });
        globalData.eventlister.on('IN_JAIL_SUCCESS',function(data){
            that.showPanelEventView(data);
        });
        globalData.eventlister.on("PLAYER_BROKEN",function(){
            that.renderPlayer();
        });

        globalData.eventlister.on('PAY_BAIL_SUCCESS',function(data){
            var playerData = globalData.gameMgr.playerData[data.posId];
            var name = playerData.name;
            var map_info = globalData.gameMgr.game_map[playerData.place_index];
            that.showTips(name+':缴纳'+map_info.ext.money+'元保释金成功');
        });

    },

    start(){

        this.renderPlayer();

    },

    onBtnCurScore(){
        this._cur_score_idx = globalData.gameMgr.score_list.length -1;
        this.renderScorePanel()
    },
    onBtnLastScore(){
        this._cur_score_idx = Math.max(0,this._cur_score_idx-1);
        this.renderScorePanel()
    },

    onBtnReady(){
        globalData.socketMgr.prepare();
    },
    onBtnBank(){
        //只有轮到自己才能操作
        if(globalData.gameMgr.roomState.state == 1){
            if(globalData.gameMgr.turn == globalData.gameMgr.selfPosId) {
                this.panel_bank.active = true;
                this.panel_bank.getComponent('BankPanel').render();
            }else{
                this.showTips('还没轮到我操作~');
            }
        }else{
            this.showTips('游戏还没开始~');
        }
    },
    onBtnShowScore(){
        this.panel_score.active = true;
        this.onBtnLastScore();
    },
    onBtnHideScore(){
        this.panel_score.active = false;
    },
    onBtnDice(){
        if(!this._isCanMakeDiceLock){
            this._isCanMakeDiceLock = true;
            globalData.socketMgr.makeDiceNum()
        }
    },
    renderUI(){
        // this.panel_ctrl.active = globalData.gameMgr.roomState.state == 1 &&
        //     (globalData.gameMgr.getSelfData().posId == globalData.gameMgr.playerData.turn);
    },
    renderRoomTitle(){
        this.lab_roomid.string = "房号:"+globalData.gameMgr.roomId +
            " 局数:"+globalData.gameMgr.play_index+
            " 回合："+globalData.gameMgr.roomState.round+
            " 最大回合："+cc.args['max_turns'];
    },
    renderRoom(){
        this.renderRoomTitle();
        this.btn_ready.active = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) &&
            globalData.gameMgr.getSelfData().state < 2 ;
        this.btn_quit.active = globalData.gameMgr.is_quit
            && globalData.gameMgr.roomState.state == 2;

        this.btn_score.active = globalData.gameMgr.score_list.length > 0;
    },
    renderPlayer(){
        // 刷新玩家头像
        for (let i = 0; i < globalData.gameMgr.playerData.length; i++) {
            if(!this._player_list[i]){
                this._player_list[i] = cc.instantiate(this.player_tpl);
                this._player_list[i].parent = this.node.getChildByName('avators');

                this._avator_mini_list[i] = cc.instantiate(this.avator_mini_tpl);
            }
            var data = globalData.gameMgr.playerData[i];
            this._player_list[i].getComponent("Player").render(data);

            this._avator_mini_list[i].getComponent('AvatorMini').render(data);
            if(data && this.map_grids[data.place_index]){
                this._avator_mini_list[i].parent = this.map_grids[data.place_index].getChildByName('place');
            }
        }

    },
    renderMap(){

        for (let i = 0; i < globalData.gameMgr.game_map.length; i++) {
            var map_info = globalData.gameMgr.game_map[i];
            var build = this.map_grids[i].getChildByName("build").getComponent("Building");
            build.render(map_info);
        }
    },
    onMoveStep(posId,from_place_index,step_num,cbFunc){

        var acts = [];
        var next_place_index;
        var next_grid;

        var avator_mini = this._avator_mini_list[posId];
        avator_mini.parent = this.node.getChildByName("move");
        avator_mini.position = avator_mini.parent.convertToNodeSpaceAR(this.map_grids[from_place_index].parent.convertToWorldSpaceAR(this.map_grids[from_place_index].position))

        for (let i = 1; i <= step_num; i++) {
            if(from_place_index + i > 40-1){
                next_place_index = from_place_index + i - 40;
            }else{
                next_place_index = from_place_index + i;
            }
            var moveTo = avator_mini.parent.convertToNodeSpaceAR(this.map_grids[next_place_index].parent.convertToWorldSpaceAR(this.map_grids[next_place_index].position))
            acts.push(cc.moveTo(0.5, moveTo));
        }
        acts.push(cc.callFunc(function () {
            avator_mini.parent = next_grid.getChildByName('place');
            cbFunc(next_place_index);
        }));
        next_grid = this.map_grids[next_place_index];

        avator_mini.runAction(cc.sequence(acts));
    },
    renderScorePanel(){
        this.panel_score.active = true;

        var data = globalData.gameMgr.score_list[this._cur_score_idx];

        if(data.winer == globalData.gameMgr.selfPosId){
            this.panel_score.getChildByName("lab_title").getComponent(cc.Label).string = "恭喜，你赢了！";
        }else{
            this.panel_score.getChildByName("lab_title").getComponent(cc.Label).string = "你输了，加油~";
        }

        for (let i = 0; i < 6; i++) {
            var label = this.panel_score.getChildByName('items').getChildByName('label'+i);
            if(data.score_list[i]){
                label.active = true;
                label.getComponent(cc.Label).string = globalData.gameMgr.getPlayerData(i).name + " " + data.score_list[i]+ "元";
            }else{
                label.active = false;
            }
        }
    },
    reset(){
        for (const i in this._player_list) {
            this._player_list[i].getComponent("Player").reset()
        }
    },
    showTips:function(msg){

        this.panel_tip.active = true;
        this.panel_tip.getChildByName("txt").getComponent(cc.Label).string = msg;
        this.scheduleOnce(function () {
            this.panel_tip.active = false;
        },1);
    },
    onBtnDialogOk:function(){
        if(this._onBtnDialogOkFunc){
            this._onBtnDialogOkFunc();
        }
        this.panel_dialog.active = false;
    },
    onBtnDialogCancel:function(){
        if(this._onBtnDialogCancelFunc){
            this._onBtnDialogCancelFunc();
        }
        this.panel_dialog.active = false;
    },
    onBtnHideBank:function(){
        this.panel_bank.active = false;
    },
    onBtnCloseScore:function(){
        this.panel_score.active = false;
    },
    showDialog:function(msg,okCbFunc,cancelCbFunc,onlyYes){

        this.panel_dialog.active = true;
        this.panel_dialog.getChildByName("txt").getComponent(cc.Label).string = msg;

        if(onlyYes){
            this.panel_dialog.getChildByName("center").getChildByName("btn_cancel").active = false;
        }else{
            this.panel_dialog.getChildByName("center").getChildByName("btn_cancel").active = true;
        }
        this._onBtnDialogOkFunc = okCbFunc;
        this._onBtnDialogCancelFunc = cancelCbFunc;
    },
    onBtnSelectLuckCard(e,eventData){
        if(this._onBtnLuckOkFunc){
            this._onBtnLuckOkFunc();
        }
        this.panel_luck.active = false;
    },
    showPanelLuck:function(okCbFunc){
        this.panel_luck.active = true;

        this._onBtnLuckOkFunc = okCbFunc;
    },
    showPanelEventView:function(data){

        this.panel_event_view.active = true;
        this.panel_event_view.getComponent('EventPanel').render(data);

        this.scheduleOnce(function () {
            this.panel_event_view.active = false;
        },2);
    },

});
