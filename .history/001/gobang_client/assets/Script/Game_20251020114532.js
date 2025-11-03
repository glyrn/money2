import globalData from "./data/globalData.js"
import AvatorMini from "../Prefab/AvatorMini"
import PanelAvators from "../Prefab/PanelAvators"
cc.Class({
    extends: cc.Component,

    properties: {
        // btn_score_close:cc.Node,
        overSprite:cc.Node,
    
        chessPrefab:{//棋子的预制资源
            default:null,
            type:cc.Prefab
        },
        
        chessList:{//棋子节点的集合，用一维数组表示二维位置
            default: [],
            type: [cc.node]
        },
        
        whiteSpriteFrame:{//白棋的图片
            default:null,
            type:cc.SpriteFrame
        },
        
        blackSpriteFrame:{//黑棋的图片
            default:null,
            type:cc.SpriteFrame
        },
        
        touchChess:{//每一回合落下的棋子
            default:null,
            type:cc.Node,
            visible:false//属性窗口不显示
        },

        select_icon:cc.Node,
        lab_room:cc.Label,
        btn_ready:cc.Node,
        btn_continues:cc.Node,
        // btn_score:cc.Node,
        // btn_quit:cc.Node,
        target_node:cc.Node,
        my_node:cc.Node,
        lab_warning:cc.Node,
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
        dialog_note:cc.Node,
        my_box:cc.Node,
        target_box:cc.Node,
        avator_target:cc.Node,
        avator_my:cc.Node,
        game_start:cc.Animation,
        fiveGroup:[],//五元组
        
        fiveGroupScore:[],//五元组分数

        img_light0:cc.Node,
        img_light1:cc.Node,
        img_light2:cc.Node,
        img_light3:cc.Node,
        img_light4:cc.Node,
        

        lab_tips:cc.Label,
        tips:cc.Node,
        note_item_prefab:cc.Node,
        note_item_content:cc.Node,
        panel_loading:cc.Node,
        panel_avators:PanelAvators,
        
    },
    //退出游戏
    // onBtnQuit(){
    //     window.close();
    //     cc.director.end();
    // },
    onBtnReady(){
        globalData.socketMgr.prepare()
    },
    // onBtnScore(){
    //     this.overSprite.active = true;
    // },
    // onBtnCurScore(){
    //     this._cur_score_idx = globalData.gameMgr.score_list.length -1;
    //     this.renderScorePanel()
    // },
    // onBtnLastScore(){
    //     this._cur_score_idx = Math.max(0,this._cur_score_idx-1);
    //     this.renderScorePanel()
    // },
    // onBtnCloseScore(){
    //     this.overSprite.active = false;
    // },
    onBtnRetrack(){

        if(globalData.gameMgr.is_ob) return;
        
        if(globalData.gameMgr.play_mode == 1) { //人人
            if(globalData.gameMgr.roomState.state == 1 ){
                if (globalData.gameMgr.playerData.turn == globalData.gameMgr.playerData.self.posId){
                    return;
                }
                if(!this.retrack_lock) {
                    if(this.chess_place_list.length == 0) { //游戏还没走步
                        globalData.eventlister.fire("MESSAGE","请走步");
                    }else{
                        if(globalData.gameMgr.playerData.self.retrack_num > 0) {
                            // var target = globalData.gameMgr.playerData.turn == 1 ? '白棋' : "黑棋";
                            // this.pushNoteMsg(target + "请求[悔棋]")
                            this.retrack_lock = true;
                            globalData.socketMgr.retrackChess();
                            globalData.gameMgr.playerData.self.retrack_num--;
                            globalData.eventlister.fire("MESSAGE", "请求悔棋中,剩余" + globalData.gameMgr.playerData.self.retrack_num + "次");
                        } else {
                            globalData.eventlister.fire("MESSAGE", "本回合悔棋次数已用完");
                        }
                    }
                }else{
                    globalData.eventlister.fire("MESSAGE", "本回合已使用过悔棋，请走步");
                }
            }else{
                globalData.eventlister.fire("MESSAGE","请等待玩家就位");
            }
        }else{
            this.makeRetrackWithPc()
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
    onBtnOpenNote(){
        this.dialog_note.active = true;
    },
    onBtnCloseNote(){
        this.dialog_note.active = false;
    },
    onLoad: function () {

        this.game_start.node.active = false;
        this.select_icon.active = false;
        this.overSprite.active = false;
        // this.btn_quit.active = false;
        // this.btn_score.active = false;
        this.dialog_retrack.active = false;
        this.dialog_note.active = false;
        this.chequer_list = [];
        this.chess_place_list = [];//人人对战 已下的棋

        var self = this;
        //初始化棋盘上225个棋子节点，并为每个节点添加事件
        for(var y = 0;y<15;y++){
            for(var x = 0;x < 15;x++){
                var newNode = cc.instantiate(this.chessPrefab);//复制Chess预制资源
                newNode.parent = this.node;
                newNode.position = cc.v2(x*40+20,y*40+20);//根据棋盘和棋子大小计算使每个棋子节点位于指定位置
                newNode.getComponent("Chess").tag = y*15+x;//根据每个节点的tag就可以算出其二维坐标
                newNode.on(cc.Node.EventType.TOUCH_END,function(event){

                    if(globalData.gameMgr.roomState.state != 1 ||
                        globalData.gameMgr.playerData.turn != globalData.gameMgr.playerData.self.posId) return;

                    if(event.currentTarget.getComponent(cc.Sprite).spriteFrame === null) {

                        self.touchChess = event.currentTarget;
                        var tag = self.touchChess.getComponent("Chess").tag;
                        //人机对战
                        // if (globalData.gameMgr.play_mode == 0) {

                        //     self.touchChess.getComponent(cc.Sprite).spriteFrame = self.whiteSpriteFrame;//下子后添加棋子图片使棋子显示
                        //     cc.playEffect("down_chess",false,1);
                        //     // self.pushNoteMsg("白棋落在("+(tag % 15)+","+(parseInt(tag / 15))+")");
                        //     self.chequer_list.push({tag:tag,flag:'self'});

                        //     self.judgeOver(tag);
                        //     //电脑 还没结束
                        //     if (globalData.gameMgr.roomState.state == 1) { //进行中

                        //         globalData.gameMgr.playerData.turn = 3; //电脑
                        //         self.renderTurn();
                        //         self.scheduleOnce(function () {
                        //             self.ai()
                        //             globalData.gameMgr.playerData.turn = globalData.gameMgr.playerData.self.posId; //玩家
                        //             self.renderTurn();
                        //         }, 1);//延迟一秒电脑下棋
                        //     }
                        //     //人人对战

                        // } else if (globalData.gameMgr.play_mode == 1) //人人对战
                        // {
                            if(self.select_icon.active && self.select_icon.position.equals(self.chessList[tag].position)){
                                globalData.socketMgr.playChess(tag)
                            }else{
                                self.select_icon.active = true;
                                self.select_icon.position = self.chessList[tag].position;
                            }
                        // }
                    }
                });
                this.chessList.push(newNode);
            }
        }

        //添加五元数组
        //横向
        for(var y=0;y<15;y++){
            for(var x=0;x<11;x++){
                this.fiveGroup.push([y*15+x,y*15+x+1,y*15+x+2,y*15+x+3,y*15+x+4]);
            }  
        }
        //纵向
        for(var x=0;x<15;x++){
            for(var y=0;y<11;y++){
                this.fiveGroup.push([y*15+x,(y+1)*15+x,(y+2)*15+x,(y+3)*15+x,(y+4)*15+x]);
            }
        }
        //右上斜向
        for(var b=-10;b<=10;b++){
            for(var x=0;x<11;x++){
                if(b+x<0||b+x>10){
                    continue;
                }else{
                    this.fiveGroup.push([(b+x)*15+x,(b+x+1)*15+x+1,(b+x+2)*15+x+2,(b+x+3)*15+x+3,(b+x+4)*15+x+4]);
                }
            }
        }
        //右下斜向
        for(var b=4;b<=24;b++){
            for(var y=0;y<11;y++){
                if(b-y<4||b-y>14){
                    continue;
                }else{
                    this.fiveGroup.push([y*15+b-y,(y+1)*15+b-y-1,(y+2)*15+b-y-2,(y+3)*15+b-y-3,(y+4)*15+b-y-4]);
                }
            }
        }

        //刷新对手
        globalData.eventlister.on("SIT_CHANGE",function(data){
            self.avator_target.active = data.target != null;
            self.avator_target.getComponent("Avator").setData(data.target);
            self.panel_avators.render();
            //对手逃跑
            if(data.target == null){
                self.render();
            }
        })
        globalData.eventlister.on("CHANGE_TURN",function(){
            self.renderTurn();
        })
        //刷新棋子
        globalData.eventlister.on("PLAY_CHESS_SUCCESS",function(data){
            self.retrack_lock = false;
            var sf;
            if(data.posId == 0){
                sf = self.whiteSpriteFrame;
                // self.pushNoteMsg("白棋落在("+(data.tag % 15)+","+(parseInt(data.tag / 15))+")",data.day_time);
            }else{
                sf = self.blackSpriteFrame;
                // self.pushNoteMsg("黑棋落在("+(data.tag % 15)+","+(parseInt(data.tag / 15))+")",data.day_time);
            }
            cc.playEffect("down_chess",false,1);

            self.chessList[data.tag].getComponent(cc.Sprite).spriteFrame = sf;
            self.touchChess = self.chessList[data.tag];
            self.select_icon.active = true;
            self.select_icon.position = self.chessList[data.tag].position;
            self.chess_place_list.push(data.tag);
            if (globalData.gameMgr.roomState.state == 1) {
                if (data.posId == 0) {
                    globalData.gameMgr.playerData.turn = 1;
                } else {
                    globalData.gameMgr.playerData.turn = 0;
                }
                self.renderTurn();
            }
        })
        //人机对战
        globalData.eventlister.on('PREPARE_SUCCESS',function(prepare_uid){
            
            // if(globalData.gameMgr.play_mode == 0){ //人机
            //     //准备成功
            //     self.btn_ready.active = false;
            // }else{ //人人

                if(globalData.gameMgr.playerData.self.uid == prepare_uid){
                    globalData.gameMgr.playerData.self.state = 2;
                }else if(globalData.gameMgr.playerData.target &&
                    globalData.gameMgr.playerData.target.uid == prepare_uid){
                    globalData.gameMgr.playerData.target.state = 2;
                }
                self.panel_avators.render();
                self.render();
            // }
        });

        globalData.eventlister.on("GAME_START",function(){
            
            self.retrack_lock = false;

            if(!globalData.gameMgr.isRecover){
                self.scheduleOnce(function () {
                    self.game_start.node.active = true;
                    self.game_start.play();
                },0.5);
                self.scheduleOnce(function () {
                    self.game_start.node.active = false;
                },2);
            }else{
                self.game_start.node.active = false;
            }
            
            // self.pushNoteMsg("游戏开始 第"+globalData.gameMgr.play_index+"局");
            for (let i = 0; i < self.chessList.length; i++) {
                self.chessList[i].getComponent(cc.Sprite).spriteFrame = null;
            }
            self.panel_avators.node.active = false;
            

            // if(globalData.gameMgr.play_mode == 0) { //人机
            //     var min = 1;
            //     var max = 224;
            //     var randomInt = Math.floor(Math.random() * (max - min + 1)) + min;
            //     self.chessList[randomInt].getComponent(cc.Sprite).spriteFrame = self.blackSpriteFrame;
            //     // self.pushNoteMsg("黑棋落在("+(randomInt % 15)+","+(parseInt(randomInt / 15))+")");
            //     cc.playEffect("down_chess",false,1);
            //     self.chequer_list = [];
            //     self.chequer_list.push({tag:randomInt,flag:'pc'});
            //     globalData.gameMgr.playerData.turn = globalData.gameMgr.playerData.self.posId;
            // }

            for (let i = 0; i < 5; i++) {
                self['img_light'+i].active = false;
            }

            self.render();
        })

        globalData.eventlister.on("MESSAGE",function(msg){
            
            self.tips.active = !globalData.gameMgr.isRecover;
            self.lab_tips.string = msg;
            self.scheduleOnce(function () {
                self.tips.active = false;
            },1);
        });

        globalData.eventlister.on("GAME_OVER",function(data){

            if(data.invalid != 1 ){
                if(globalData.gameMgr.isRecover){
                    self.gameOver(data);
                }else{
                    for (let i = 0; i < 5; i++) {
                        self['img_light'+i].active = true;
                        self['img_light'+i].position = self.chessList[data.fiveCountList[i]].position;
                        self['img_light'+i].stopAllActions();
                        self['img_light'+i].runAction(cc.repeatForever(
                        cc.sequence(
                            cc.fadeOut(0.25),
                            cc.fadeIn(0.25),
                            cc.fadeOut(0.25),
                            cc.fadeIn(0.25),
                            cc.delayTime(1)
                        )))
                    }
                    //看一下动效再结算
                    self.scheduleOnce(function () {
                        self.gameOver(data);
                    },2.5);
                }
            }else{
                self.gameOver(data);
            }   
        });

        globalData.eventlister.on("RETRACK_CHESS_RSP_SUCCESS",function(data){
            self.retrack_lock = false;
            for (let i = 0; i < data.del_list.length; i++) {
                self.chessList[data.del_list[i]].getComponent(cc.Sprite).spriteFrame = null;
                self.chess_place_list.pop();
            }
            if(data.now_tag >= 0){
                self.select_icon.active = true;
                self.select_icon.position = self.chessList[data.now_tag].position;
            }else{
                self.select_icon.active = false;
            }
            globalData.gameMgr.playerData.turn = data.posId;
            self.renderTurn();
        })

        globalData.eventlister.on("RETRACK_CHESS_REQ",function(data){
            self.dialog_retrack.active = data.posId == globalData.gameMgr.playerData.self.posId 
            && !globalData.gameMgr.is_ob
            && !globalData.gameMgr.isRecover;
        })

        globalData.eventlister.on("CONNECT_STATE",function(data){
            self.render();
        });
        globalData.eventlister.on("SET_RECOVER_STATUS",function(){
            if(globalData.gameMgr.isRecover){
                self.panel_loading.active = true;
            }
        })
        globalData.eventlister.on("LOGIN_SUCCESS",function(){
            if(!globalData.gameMgr.isRecover){
                self.panel_loading.active = false;
            }
            self.render();
            self.panel_avators.render();
        });
    },

    render(){

        this.btn_ready.active = globalData.gameMgr.playerData.self.state < 2;

        var is_quit = (globalData.gameMgr.roomState.state == 0 || globalData.gameMgr.roomState.state == 2) && 
                        globalData.gameMgr.play_index >= globalData.gameMgr.play_count;
        
        this.panel_avators.node.active = is_quit;
        this.panel_avators.render();
        
        // this.btn_quit.active = false;
        this.avator_my.active = true;

        this.avator_my.getComponent("Avator").setData(globalData.gameMgr.playerData.self,"self");

        // if(globalData.gameMgr.play_mode == 0){//人机对战
        //     this.avator_target.active = true;
        //     if(globalData.gameMgr.playerData.self.posId == 0){
        //         globalData.gameMgr.playerData.pc.posId = 1;
        //     }else{
        //         globalData.gameMgr.playerData.pc.posId = 0;
        //     }
        //     this.avator_target.getComponent("Avator").setData(globalData.gameMgr.playerData.pc,"pc");
        // }else{
            this.avator_target.active = globalData.gameMgr.playerData.target != null;
            this.avator_target.getComponent("Avator").setData(globalData.gameMgr.playerData.target);
        // }

        this.lab_room.string = "局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
    },
    makeRetrackWithPc(){
        var del_list = [];
        var del_idx;
        for (let i = this.chequer_list.length - 1; i >= 0; i--) {
            if(this.chequer_list[i].flag == 'pc'){
                del_list.push(this.chequer_list[i].tag);
            }else if(this.chequer_list[i].flag == 'self'){
                del_list.push(this.chequer_list[i].tag);
                del_idx = i;
                break;
            }
        }
        for (let j = 0; j < del_list.length; j++) {
            this.chessList[del_list[j]].getComponent(cc.Sprite).spriteFrame = null;
        }
        this.chequer_list.splice(del_idx,del_list.length);

        if(this.chequer_list.length > 0){
            this.select_icon.active = true;
            this.select_icon.position = this.chessList[this.chequer_list[this.chequer_list.length -1].tag].position;
        }else{
            this.select_icon.active = false;
        }

        // this.pushNoteMsg("白棋使用了[悔棋]");
    },
    //电脑下棋逻辑
    ai:function(){
        //评分
        for(var i=0;i<this.fiveGroup.length;i++){
            var b=0;//五元组里黑棋的个数
            var w=0;//五元组里白棋的个数
            for(var j=0;j<5;j++){
                if(this.chessList[this.fiveGroup[i][j]].getComponent(cc.Sprite).spriteFrame == this.blackSpriteFrame){
                    b++;
                }else if(this.chessList[this.fiveGroup[i][j]].getComponent(cc.Sprite).spriteFrame == this.whiteSpriteFrame){
                    w++;
                }
            }

            if(b+w==0){
                this.fiveGroupScore[i] = 7;
            }else if(b>0&&w>0){
                this.fiveGroupScore[i] = 0;
            }else if(b==0&&w==1){
                this.fiveGroupScore[i] = 15;
            }else if(b==0&&w==2){
                this.fiveGroupScore[i] = 400;
            }else if(b==0&&w==3){
                this.fiveGroupScore[i] = 1800;
            }else if(b==0&&w==4){
                this.fiveGroupScore[i] = 100000;
            }else if(w==0&&b==1){
                this.fiveGroupScore[i] = 35;
            }else if(w==0&&b==2){
                this.fiveGroupScore[i] = 800;
            }else if(w==0&&b==3){
                this.fiveGroupScore[i] = 15000;
            }else if(w==0&&b==4){
                this.fiveGroupScore[i] = 800000;
            }            
        }
        //找最高分的五元组
        var hScore=0;
        var mPosition=0;
        for(var i=0;i<this.fiveGroupScore.length;i++){
            if(this.fiveGroupScore[i]>hScore){
                hScore = this.fiveGroupScore[i];
                mPosition = (function(x){//js闭包
                    return x;
                    })(i);
            }
        }
        //在最高分的五元组里找到最优下子位置
        var flag1 = false;//无子
        var flag2 = false;//有子
        var nPosition = 0;
        for(var i=0;i<5;i++){
            if(!flag1&&this.chessList[this.fiveGroup[mPosition][i]].getComponent(cc.Sprite).spriteFrame == null){
                nPosition = (function(x){return x})(i);
            }
            if(!flag2&&this.chessList[this.fiveGroup[mPosition][i]].getComponent(cc.Sprite).spriteFrame != null){
                flag1 = true;
                flag2 = true;
            }
            if(flag2&&this.chessList[this.fiveGroup[mPosition][i]].getComponent(cc.Sprite).spriteFrame == null){
                nPosition = (function(x){return x})(i);
                break;
            }
        }
        //在最最优位置下子
        var tag = this.fiveGroup[mPosition][nPosition];
        this.chessList[tag].getComponent(cc.Sprite).spriteFrame = this.blackSpriteFrame;
        cc.playEffect("down_chess",false,1);
        // this.pushNoteMsg("黑棋落在("+(tag % 15)+","+(parseInt(tag / 15))+")");
        this.touchChess = this.chessList[tag];
        this.chequer_list.push({tag:tag,flag:'pc'});
        this.judgeOver(this.touchChess.getComponent("Chess").tag);
    },
    renderTurn(){
        // if(globalData.gameMgr.playerData.turn == globalData.gameMgr.playerData.self.posId){
        //     // this.my_box.active = true;
        //     // this.target_box.active = false;

        //     // globalData.eventlister.fire("MESSAGE", "到你了，请落子");
        // }else{
        //     // this.my_box.active = false;
        //     // this.target_box.active = true;
        // }
    },
    renderScorePanel(){

        this.overSprite.active = !globalData.gameMgr.isRecover;
        var data = globalData.gameMgr.score_list[this._cur_score_idx];

        //弃局
        if(data.invalid == 1){

            this.my_node.active = false;
            this.target_node.active = false;
            this.lab_warning.active = true;
            this.btn_continues.active = false;
            // this.panel_loading.active = false;
            // console.log("this.panel_loading.active false")
        }else{

            var is_quit = globalData.gameMgr.play_index >= globalData.gameMgr.play_count;
            this.btn_continues.active = !is_quit;
            this.lab_warning.active = false;
            this.my_node.active = true;
            this.avator_mini1.setData(globalData.gameMgr.playerData.self,"self");
            var flag = "target"
            // if(globalData.gameMgr.play_mode == 0){ //人机
            //     flag = "pc"
            // }
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

        // this.btn_score_close.active = globalData.gameMgr.play_index < globalData.gameMgr.play_count;
    },
    gameOver:function(data){

        // this.pushNoteMsg("游戏结束！");
        globalData.gameMgr.roomState.state = 2; //结束
        globalData.gameMgr.score_list.push(data);
        
        globalData.gameMgr.playerData.self.score = parseInt(globalData.gameMgr.playerData.self.score);
        // if(globalData.gameMgr.play_mode == 0){ //人机
        //     globalData.gameMgr.playerData.target = globalData.gameMgr.playerData.pc;
        // }

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
        this.select_icon.active = false;
        this.chess_place_list = [];
        this.touchChess = null;
        this.render()
        // this.btn_quit.active = false;
        // var isQuit = globalData.gameMgr.play_index >= globalData.gameMgr.play_count && !globalData.gameMgr.is_ob;

    },
    judgeOver:function(tag){

        var x0 = tag % 15;
        var y0 = parseInt(tag / 15);

        this.select_icon.active = true;
        this.select_icon.position = this.chessList[tag].position;
        //判断横向
        var fiveCount = 0;
        for(var x = 0;x < 15;x++){

            if((this.chessList[y0*15+x].getComponent(cc.Sprite)).spriteFrame != null && (this.chessList[y0*15+x].getComponent(cc.Sprite)).spriteFrame === this.touchChess.getComponent(cc.Sprite).spriteFrame){
                fiveCount++; 
                if(fiveCount==5){
                    this.gameOver({winer:globalData.gameMgr.playerData.turn,score:10})
                    return;
                }
            }else{
                fiveCount=0;
            }
        }
        //判断纵向
        fiveCount = 0;
        for(var y = 0;y < 15;y++){
            if((this.chessList[y*15+x0].getComponent(cc.Sprite)).spriteFrame != null && (this.chessList[y*15+x0].getComponent(cc.Sprite)).spriteFrame === this.touchChess.getComponent(cc.Sprite).spriteFrame){
                fiveCount++; 
                if(fiveCount==5){
                    this.gameOver({winer:globalData.gameMgr.playerData.turn,score:10})
                    return;
                }
            }else{
                fiveCount=0;
            }
        }
        //判断右上斜向
        var f = y0 - x0;
        fiveCount = 0;
        for(var x = 0;x < 15;x++){
            if(f+x < 0 || f+x > 14){
                continue;
            }
            if((this.chessList[(f+x)*15+x].getComponent(cc.Sprite)).spriteFrame != null && (this.chessList[(f+x)*15+x].getComponent(cc.Sprite)).spriteFrame === this.touchChess.getComponent(cc.Sprite).spriteFrame){
                fiveCount++; 
                if(fiveCount==5){
                    this.gameOver({winer:globalData.gameMgr.playerData.turn,score:10})
                    return;
                }
            }else{
                fiveCount=0;
            }
        }
        //判断右下斜向
        f = y0 + x0;
        fiveCount = 0;
        for(var x = 0;x < 15;x++){
            if(f-x < 0 || f-x > 14){
                continue;
            }
            if((this.chessList[(f-x)*15+x].getComponent(cc.Sprite)).spriteFrame != null && (this.chessList[(f-x)*15+x].getComponent(cc.Sprite)).spriteFrame === this.touchChess.getComponent(cc.Sprite).spriteFrame){
                fiveCount++; 
                if(fiveCount==5){
                    this.gameOver({winer:globalData.gameMgr.playerData.turn,score:10})
                    return;
                }
            }else{
                fiveCount=0;
            }
        }
    },
    pushNoteMsg(msg,day_time){
        var note_item = cc.instantiate(this.note_item_prefab)
        note_item.active = true;
        note_item.parent = this.note_item_content;
        if(!day_time){
            var day = new Date().toLocaleDateString()
            var time = new Date().toLocaleTimeString('chinese', { hour12: false });
            day_time = day + " "+time;
        }

        note_item.getComponent(cc.Label).string = day_time +" "+msg;
    },
});
