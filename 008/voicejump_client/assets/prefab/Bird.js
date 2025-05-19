import globalData from "../script/data/globalData";

const State = cc.Enum({
    //游戏开始前的准备状态
    Ready: -1,
    //移动
    MOVE:-1,
    //小鸟碰撞到管道坠落中
    Drop: -1,
    //游戏结束
    GAMEOVER:-1,
});

cc.Class({
    name:"Bird",
    statics: {
        State: State
    },
    extends: cc.Component,
    properties: {
        //上抛初速度，单位：像素/秒
        _initRiseSpeed1: 14,
        _initRiseSpeed2: 20,
        //重力加速度，单位：像素/秒的平方
        _gravity: 0.5,
        // speedX:0,
        main_camera:cc.Node,
        main_ui:cc.Node,
        lab_name:cc.Label,
        img_glass:cc.Node,
        img_dead:cc.Node,
        //小鸟的状态
        state: {
            default: State.Ready,
            type: State,
        },
    },
    onLoad() {

        this.fallOver = false;
        this.tweenAction = null;
        this._initPosX = this.node.parent.x;
        this._initPosY = this.node.parent.y;
        this.anim = this.getComponent(cc.Animation);
    },
    render(data){
        if(data === null || (data && data.uid === 0)){
            this.node.parent.active = false;
            return;
        }

        this.lab_name.string = data.name;
        if(data.posId == globalData.gameMgr.posId){
            this.lab_name.node.color = cc.Color.GREEN;
        }
        this.node.parent.active = true;
        this.fallOver = false;
        this.img_dead.active = false;
        this.state = State.Ready;
        this.currentSpeedY = 0;
        // this.currentSpeedX = 0;
        this.anim.stop();
        this.node.angle = 0;
        this.node.parent.x = this._initPosX;
        this.node.parent.y = this._initPosY;
        this.main_camera.x = 0;

        this.posId = data.posId;
    },
    startMove() {
        this.state = State.MOVE;
    },
    update(dt) {
        if (this.state === State.Ready || this.state === State.Drop) return;
        // 每帧更新bird位置
        this.updatePosition(dt);
        // 碰撞检测 处理
        this.detectCollision();

        this.refresh();
    },
    updatePosition(dt) {
        var flying = this.state === State.MOVE;
        if (flying) {
            if (this.posId == globalData.gameMgr.posId) {

                var score = Math.floor((this.node.parent.x - this._initPosX) / 100);
                if (this.last_score != score) {
                    globalData.eventlister.fire("GAIN_SCORE", score);
                    this.last_score = score;
                }
            }

            //站在平台上
            if (this.standTarget) {
                this.currentSpeedY = 0;
                this.node.parent.y = Math.floor(Math.max(this.node.parent.y, this.standTarget.position.y + this.standTarget.height / 2 + this.node.height / 2));

            }else{
                this.currentSpeedY -= this._gravity ;
                this.node.parent.y += this.currentSpeedY;
            }

            //限制不能超出屏幕
            this.node.parent.y = Math.min(this.node.parent.y, cc.view.getCanvasSize().height / 2);

            if (this.node.parent.y < -cc.view.getCanvasSize().height / 2) {
                this.fallOver = true;
            }
        }
    },

    detectCollision() {

        if (this.state === State.Ready || this.state === State.Drop || this.state === State.GAMEOVER) return;
        // 掉落地板下面
        if (this.fallOver) {
            this.img_dead.active = true;
            if(this.state !== State.Drop){
                this.state = State.Drop;
                this.anim.stop();

                if(this.posId == globalData.gameMgr.posId){
                    globalData.socketMgr.fallOver({cur_x:this.node.parent.position.x,cur_y:this.node.parent.position.y});
                }
            }
        }
    },
    refresh(){
        //第一名要戴眼镜
        var maxScore = 0;
        var maxPosId = 0;
        for (let i = 0; i < globalData.gameMgr.playerData.length; i++) {
            var data = globalData.gameMgr.playerData[i];
            if(data && data.gain_score >= maxScore) {
                maxPosId = data.posId;
                maxScore = data.gain_score;
            }
        }
        this.img_glass.active = maxPosId === this.posId;
    },
    setGameOver(){
        this.state = State.GAMEOVER;
    },
    onCollisionStay(other,self){
        if (other.node._name === "ground" || other.node._name === "block"){
            this.standTarget = other.node;
        }
    },
    onCollisionExit(other, self){
        if (other.node._name === "ground" || other.node._name === "block"){
            this.standTarget = null;
            if(this.move_type == 1){ //行走 掉落
                this.node.parent.stopAllActions();
            }
        }
    },
    onCollisionEnter(other, self) {
        //碰到砖块就暂停一下
        if(other.node._name === 'block'){
            this.standTarget = other.node;
            this.anim.stop();
            other.node.getComponent("Effect").fadeOut();
        }
        //碰到地板要站着
        if (other.node._name === "ground"){
            this.standTarget = other.node;
            this.anim.stop();
        }
        //碰到冰块 冰块会消失
        if(other.node._name === 'ice'){
            other.node.getComponent("Effect").fadeOut();
        }
        //碰到怪物 就会死
        if (other.node._name === "obstacle" || other.node._name === 'monster'){
            this.fallOver = true;
        }
    },
    move(data) {
        var that = this;

        if(data.type == 1){
            if(globalData.gameMgr.isRecover){
                this.node.parent.position = cc.v2(data.cur_x + 50 ,data.cur_y);
                //镜头跟随
                if (this.posId == globalData.gameMgr.posId) {
                    this.main_camera.x = this.node.parent.x - this._initPosX;
                }
            }else{
                var seq = cc.sequence([
                    cc.moveTo(0.5, cc.v2(data.cur_x + 50 ,data.cur_y)),
                    cc.callFunc(function(){
                        that.anim.play();
                    },this)
                ])
                this.anim.play();
                this.node.parent.stopAllActions();
                this.node.parent.runAction(seq);
                //镜头跟随
                if (this.posId == globalData.gameMgr.posId) {
                    this.main_camera.stopAllActions();
                    this.main_camera.runAction(cc.moveTo(1, cc.v2(data.cur_x + 50 - this._initPosX, this.main_camera.y)));
                }
            }

            this.state = State.MOVE;
            this.move_type = data.type;

        }else if(data.type == 2){
            this.standTarget = null;

            if(globalData.gameMgr.isRecover){
                this.node.parent.position = cc.v2(data.cur_x + 200 ,data.cur_y);
                //镜头跟随
                if (this.posId == globalData.gameMgr.posId) {
                    this.main_camera.x = this.node.parent.x - this._initPosX;
                }
            }else{
                this.currentSpeedY = this._initRiseSpeed1;
                var seq = cc.sequence([
                    cc.moveTo(1, cc.v2(data.cur_x + 200 ,data.cur_y)),
                    cc.callFunc(function(){

                    },this)
                ])
                this.node.parent.stopAllActions();
                this.node.parent.runAction(seq);
                //镜头跟随
                if (this.posId == globalData.gameMgr.posId) {
                    this.main_camera.stopAllActions();
                    this.main_camera.runAction(cc.moveTo(1, cc.v2(data.cur_x + 200 - this._initPosX, this.main_camera.y)));
                }
            }

            this.state = State.MOVE;
            this.move_type = data.type;

        }else if(data.type == 3){
            this.standTarget = null;

            if(globalData.gameMgr.isRecover){
                this.node.parent.position = cc.v2(data.cur_x + 350 ,data.cur_y);
                //镜头跟随
                if (this.posId == globalData.gameMgr.posId) {
                    this.main_camera.x = this.node.parent.x - this._initPosX;
                }
            }else{
                this.currentSpeedY = this._initRiseSpeed2;
                var seq = cc.sequence([
                    cc.moveTo(1.5, cc.v2(data.cur_x + 350 ,data.cur_y)),
                    cc.callFunc(function(){

                    },this)
                ])
                this.node.parent.stopAllActions();
                this.node.parent.runAction(seq);
                //镜头跟随
                if (this.posId == globalData.gameMgr.posId) {
                    this.main_camera.stopAllActions();
                    this.main_camera.runAction(cc.moveTo(1.5, cc.v2(data.cur_x + 350 - this._initPosX, this.main_camera.y)));
                }
            }

            this.state = State.MOVE;
            this.move_type = data.type;

        }else if(data.type == 4){ //同步掉落点

            this.standTarget = null;
            this.node.parent.stopAllActions();
            this.node.parent.position = cc.v2(data.x ,data.y);
            //镜头跟随
            if (this.posId == globalData.gameMgr.posId) {
                this.main_camera.x = this.node.parent.x - this._initPosX;
            }

            this.state = State.Drop;
            this.move_type = data.type;
            this.img_dead.active = true;
        }
    },
    isStand(){
        return this.standTarget != null;
    }
})
