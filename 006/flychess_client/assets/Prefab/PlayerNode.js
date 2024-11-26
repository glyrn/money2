import globalData from "../Script/data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        color: {
            type: cc.Enum({
                yellow: 0,
                blue: 1,
                red: 2,
                green: 3,
            }),
            default:0,
        },
        img_avatar:cc.Sprite,
        lab_name:cc.Label,
        lab_score:cc.Label,
        img_ready:cc.Node,
        chess_list:[cc.Node],
        dice:cc.Sprite,
        finish_tags:[cc.Node],
        standup_pos:cc.Node,
        map:cc.Node,
        posId:0,
        flag:cc.Node,
    },
    name:"PlayerNode",

    onLoad(){
        this.img_ready.active = false;
        this.flag.active = false;
        this.chess_steps = {0:-1,1:-1,2:-1,3:-1};
        this.chess_status = {0:0,1:0,2:0,3:0}; //3完成 2进行中 1起机 0未起机
    },
    onChessClick(event,chess_idx){

        if(globalData.gameMgr.posId == this.posId){
            if(!this._chessClickLock){
                this._chessClickLock = true;
                globalData.socketMgr.playMoveStep(chess_idx,this.cur_num);
            }
        }
    },
    resumeAllActions(){
        // for (let i = 0; i < this.chess_list.length; i++) {
        //     this.chess_list[i].getChildByName('select_icon').active = false;
        // }
        for (let i = 0; i < this.chess_list.length; i++) {
            this.chess_list[i].resumeAllActions()
        }
    },
    //进入后台恢复强刷画面
    renderNowGame(){
        var all_places = this.map.getComponent('Map').getPosPlaces(this.posId);
        for (let i = 0; i < this.chess_list.length; i++) {
            var target_place_node;
            var moveTo;
            if(this.chess_steps[i] > -1) {
                if(this.chess_steps[i] == 0 && this.chess_status[i] == 1){ //起机
                    target_place_node = this.standup_pos;
                    moveTo = this.chess_list[i].parent.convertToNodeSpaceAR(target_place_node.parent.convertToWorldSpaceAR(target_place_node.position))
                }else{
                    if(this.chess_steps[i] == all_places.length - 1){//终点
                        moveTo = this.finish_tags[i].position;
                        this.finish_tags[i].active = true;
                    }else{
                        target_place_node = all_places[this.chess_steps[i]];
                        moveTo = this.chess_list[i].parent.convertToNodeSpaceAR(target_place_node.parent.convertToWorldSpaceAR(target_place_node.position))
                    }
                }
                this.chess_list[i].position = moveTo;
            }
        }
        this.render();
    },
    onPlayMoveStepAnim(chess_idx,num){

        for (let i = 0; i < this.chess_list.length; i++) {
            this.chess_list[i].getChildByName('select_icon').active = false;
        }
        var that = this;
        var nextFunc = function(){
            if(globalData.gameMgr.posId == that.posId){
                that._chessClickLock = false;
                globalData.eventlister.fire("FINISH_MOVE_STEP");
            }
        }
        var status = this.chess_status[chess_idx];
        if(status == 0){
            var isCanUp = false;
            if(globalData.gameMgr.play_mode == 0 && num == 6){
                isCanUp = true;
            }else if((globalData.gameMgr.play_mode == 1 || globalData.gameMgr.play_mode == 2) && (num == 2 || num == 4 || num == 6)){
                isCanUp = true;
            }
            if(isCanUp){
                this.standUpChess(chess_idx,nextFunc)
            }
        }else if(status == 1 || status == 2){
            this.moveStep(chess_idx,num,nextFunc)
        }
    },
    showCtrlCircle(num){

        var isCanUp = false;
        if(globalData.gameMgr.play_mode == 0 && num == 6){
            isCanUp = true;
        }else if((globalData.gameMgr.play_mode == 1 || globalData.gameMgr.play_mode == 2) && (num == 2 || num == 4 || num == 6)){
            isCanUp = true;
        }

        this.cur_num = num;

        var hasActive = false;
        for (let i = 0; i < this.chess_list.length; i++) {

            this.chess_list[i].getChildByName('select_icon').getComponent(cc.Button).interactable = this.posId == globalData.gameMgr.posId;
            if(this.chess_status[i] == 0){
                this.chess_list[i].getChildByName('select_icon').active = isCanUp;
                if(isCanUp) hasActive = true;
            }else if (this.chess_status[i] == 1){
                this.chess_list[i].getChildByName('select_icon').active = true;
                hasActive = true;
            }else if (this.chess_status[i] == 2){
                this.chess_list[i].getChildByName('select_icon').active = true;
                hasActive = true;
            }else if (this.chess_status[i] == 3){
                this.chess_list[i].getChildByName('select_icon').active = false;
            }
        }
        //没有可行动的棋子
        if(!hasActive){
            console.log("没有可行动的棋子 ",globalData.gameMgr.posId , this.posId);
            if(globalData.gameMgr.posId == this.posId){
                globalData.eventlister.fire("FINISH_MOVE_STEP");
            }
        }
    },
    standUpChess(idx,cbFunc){
        //起
        this.chess_steps[idx] = 0;
        this.chess_status[idx] = 1;

        this.cur_run_idx = idx;
        var moveTo = this.chess_list[this.cur_run_idx].parent.convertToNodeSpaceAR(this.standup_pos.parent.convertToWorldSpaceAR(this.standup_pos.position))
        var act1 = cc.moveTo(0.5,moveTo);
        var act2 = cc.rotateTo(0.5,this.standup_pos.getComponent("Place").angle);
        this.chess_list[this.cur_run_idx].runAction(act1)
        this.chess_list[this.cur_run_idx].runAction(cc.sequence(act2,cc.callFunc(function () {
            if(cbFunc){
                cbFunc()
            }
        }, this)))
    },

    moveStep(idx,num,allCallFunc){

        this.cur_run_idx = idx;

        var seq1 = [];
        var seq2 = [];

        var that = this;
        var all_places = this.map.getComponent('Map').getPosPlaces(this.posId);
        console.log("当前棋子",this.cur_run_idx)
        var cur_chess = this.chess_list[this.cur_run_idx];

        function animBomb(target_place) {
            seq1.push(cc.callFunc(function () {
                cur_chess.active = false;
                target_place.bomb.play()
                that.scheduleOnce(function () {
                    cur_chess.active = true;
                }, 0.5)
            }, that))

            var num = 3; // 爆炸退3格
            var _target_place;
            for (let i = 0; i < num; i++) {

                if (that.chess_steps[idx] -1 >= 0) {
                    that.chess_steps[idx]--;
                    var target_place_node = all_places[that.chess_steps[idx]];
                    _target_place = target_place_node.getComponent('Place')
                    var moveTo = cur_chess.parent.convertToNodeSpaceAR(target_place_node.parent.convertToWorldSpaceAR(target_place_node.position))
                    var angle = _target_place.angle;
                    var act1 = cc.rotateTo(0.2, angle)
                    var act2 = cc.moveTo(0.2, moveTo)

                    seq1.push(act1)
                    seq2.push(act2)
                }else{
                    //回到起飞点
                    that.chess_steps[idx] = 0;
                    that.chess_status[idx] = 1;

                    var moveTo = that.chess_list[idx].parent.convertToNodeSpaceAR(that.standup_pos.parent.convertToWorldSpaceAR(that.standup_pos.position))
                    var act1 = cc.moveTo(0.5,moveTo);
                    var act2 = cc.rotateTo(0.5,that.standup_pos.getComponent("Place").angle);
                    seq1.push(act1)
                    seq2.push(act2)
                    continue;
                }
            }

            var _cur_step = that.chess_steps[idx];
            seq1.push(cc.callFunc(function () {
                // check
                that.map.getComponent('Map').checkEat(that.posId, all_places[_cur_step].getComponent('Place').id);
            }, that));

            if(_target_place && _target_place.type == 1) { //炸弹
                animBomb(_target_place)
            }
        }

        function jumpOnNum(num){
            var target_place_node = all_places[that.chess_steps[idx] + num];
            var target_place = target_place_node.getComponent('Place');

            var moveTo = cur_chess.parent.convertToNodeSpaceAR(target_place_node.parent.convertToWorldSpaceAR(target_place_node.position))
            var angle = target_place.angle;
            var act1 = cc.rotateTo(0.1, angle)
            var act2 = cc.moveTo(0.2, moveTo)
            // 检测飞行过程中是否撞别人的飞机
            var act3 = cc.callFunc(function () {

                that.map.getComponent('Map').checkFlyHit(that.posId);
            });
            seq1.push(act1)
            seq1.push(act3)
            seq2.push(act2)
            that.chess_steps[idx] = that.chess_steps[idx] + num;

            if(target_place.type == 1) { //炸弹
                animBomb(target_place)
            }

            seq1.push(cc.callFunc(function () {
                // 吃
                that.map.getComponent('Map').checkEat(that.posId,target_place.id);
            },that));
        }

        function jumpTo(idx,cbFunc){
            var act1 = cc.rotateTo(0.35, 0)
            var act2 = cc.moveTo(0.35, that.finish_tags[idx].position)
            seq1.push(act1)
            seq2.push(act2)
            seq2.push(cc.callFunc(function () {
                if(cbFunc){
                    cbFunc()
                }
            }, that))
            that.chess_steps[idx] = -1;
        }

        function handleEnd(target_place,seq1,seq2){

            var is_special = false;
            if(target_place.type == 2 && target_place.color == that.color) { //跳

                seq1.push(cc.delayTime(0.4))
                seq2.push(cc.delayTime(0.4))
                seq1.push(cc.callFunc(function () {
                    // 吃
                    that.map.getComponent('Map').checkEat(that.posId,target_place.id);
                }, that))
                jumpOnNum(12)

                is_special = true;
            }else if(target_place.type == 1) { //炸弹

                animBomb(target_place);

                is_special = true;
            }
            return is_special;
        }

        function moveOnNum(num){

            function moveOnNumSimple(num){

                if(that.chess_steps[idx] > 0 || (that.chess_status[idx] == 2)){
                    that.chess_steps[idx]++;
                }
                var target_place;
                var last_place_idx = all_places.length - 1;
                var direct_flag = true; //正向
                for (let i = 0; i < num; i++) {

                    //一下次移动
                    if (i < num - 1) {
                        if(direct_flag){
                            //一下次移动 超过终点3
                            if(that.chess_steps[idx] + 1 > last_place_idx){
                                that.chess_steps[idx]--;
                                direct_flag = false;
                            }else{
                                that.chess_steps[idx]++;
                            }
                        }else{
                            that.chess_steps[idx]--;
                        }
                    }

                    var target_place_node = all_places[that.chess_steps[idx]];
                    if(target_place_node) {
                        target_place = target_place_node.getComponent('Place');


                        var moveTo = cur_chess.parent.convertToNodeSpaceAR(target_place_node.parent.convertToWorldSpaceAR(target_place_node.position))
                        var angle = target_place.angle;
                        var act1 = cc.rotateTo(0.2, angle)
                        var act2 = cc.moveTo(0.2, moveTo)

                        seq1.push(act1)
                        seq2.push(act2)
                    }
                }
                var _cur_step = that.chess_steps[idx];
                seq1.push(cc.callFunc(function () {
                    // check
                    that.map.getComponent('Map').checkEat(that.posId,all_places[_cur_step].getComponent('Place').id);
                },that));

                that.chess_status[idx] = 2;

                return handleEnd(target_place,seq1,seq2)
            }

            var is_special = moveOnNumSimple(num)
            if(!is_special) {

                //最后一步
                //检测颜色
                //胜利点
                var target_place = all_places[that.chess_steps[idx]].getComponent('Place');
                if (target_place.type == 6) {

                    seq1.push(cc.delayTime(0.4))
                    seq2.push(cc.delayTime(0.4))
                    jumpTo(idx, function () {
                        that.finish_tags[idx].active = true;
                        that.chess_status[idx] = 3;
                        globalData.socketMgr.finish_chess(that.posId,idx);
                    })
                } else if (target_place.type == 0 || target_place.type == 7) { //普通

                    if (target_place.type == 0 && target_place.color == that.color) {//同色 奖励
                        seq1.push(cc.delayTime(0.4))
                        seq2.push(cc.delayTime(0.4))

                        moveOnNumSimple(4)
                    }
                }
                handleEnd(target_place, seq1, seq2)
            }
        }

        moveOnNum(num);

        seq1.push(cc.callFunc(function () {
            if(allCallFunc){
                allCallFunc()
            }
        }, that))
        seq2.push(cc.callFunc(function () {

        }, that))
        this.chess_list[this.cur_run_idx].runAction(cc.sequence(seq1))
        this.chess_list[this.cur_run_idx].runAction(cc.sequence(seq2))

        if(all_places[that.chess_steps[idx]]){
            this.map.getComponent('Map').setChessPlace(this.posId,idx,all_places[that.chess_steps[idx]].getComponent('Place').id)
        }
    },

    backHome(chess_idx){

        var seq = cc.sequence([
            cc.rotateTo(0.2, 0),
            cc.rotateTo(0.15, 720),
            cc.rotateTo(0.15, 0)
        ])
        var act2 = cc.moveTo(0.5, this.finish_tags[chess_idx].position)
        this.chess_steps[chess_idx] = -1;
        this.chess_status[chess_idx] = 0;
        this.chess_list[chess_idx].runAction(seq)
        this.chess_list[chess_idx].runAction(act2)
    },
    getChessNowPlaceId(idx){
        var all_places = this.map.getComponent('Map').getPosPlaces(this.posId);
        if(this.chess_steps[idx] >= 0 && this.chess_status[idx] == 2){
            var place = all_places[this.chess_steps[idx]].getComponent('Place')
            if(place.type == 0 || place.type == 2 || place.type == 7){ //普通的格子可以吃
                return place.id;
            }else{
                return -1;
            }
        }else{
            return -1;
        }
    },
    getMidStraightChress(){
        var ret = [];
        var all_places = this.map.getComponent('Map').getPosPlaces(this.posId);
        for (let i = 0; i < 4; i++) {
            if(this.chess_steps[i] == all_places.length - 4){ //跑道中间
                ret.push(i);
            }
        }
        return ret;
    },
    cleanDice(){
        this.dice.node.active = false;
    },
    setTurnFlag(isShow){
        this.flag.active = isShow;
    },
    reset(){
        this.chess_steps = {0:-1,1:-1,2:-1,3:-1};
        this.chess_status = {0:0,1:0,2:0,3:0};
        for (let i = 0; i < 4; i++) {
            this.finish_tags[i].active = false;
            this.chess_list[i].position = this.finish_tags[i].position;
        }
    },
    render(){

        var that = this;
        var data = globalData.gameMgr.playerData[this.posId];
        if(data) {
            this.img_ready.active = data.state == 2 && globalData.gameMgr.roomState.state != 1;
            this.lab_name.string = data.name;
            this.lab_score.string = data.score + "分";

            if (data.dice && data.dice > 0) {
                this.dice.node.active = true;
                cc.loader.loadRes(data.dice.toString(), cc.SpriteFrame, function (error, spriteFrame) {
                    that.dice.spriteFrame = spriteFrame;
                });
            } else {
                this.dice.node.active = false;
            }

            if (this._avatorUrl != data.avatorUrl && data.avatorUrl != null && data.avatorUrl != '') {

                // var avatorUrl = 'http://'+window.defines.serverUrl+'/avator/'+ data.uid + '.jpg';
                cc.loader.load(data.avatorUrl, function (err, img) {
                    if (!err) {
                        that._avatorUrl = data.avatorUrl;
                        that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                    }
                    console.log("头像：",err)
                });
            }
        }
    }

});
