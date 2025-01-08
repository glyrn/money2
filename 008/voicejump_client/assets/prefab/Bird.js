import globalData from "../script/data/globalData";

const State = cc.Enum({
    //游戏开始前的准备状态
    Ready: -1,
    //小鸟上升中
    Rise: -1,
    //小鸟自由落体中
    FreeFall: -1,
    //小鸟碰撞到管道坠落中
    Drop: -1,
    //游戏结束
    GAMEOVER:-1,
});
cc.Class({
    statics: {
        State: State
    },
    extends: cc.Component,
    properties: {
        //上抛初速度，单位：像素/秒
        initRiseSpeed: 800,
        iceRiseSpeed:300,
        //重力加速度，单位：像素/秒的平方
        gravity: 1000,
        main_camera:cc.Node,
        main_ui:cc.Node,
        lab_name:cc.Label,
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
    },
    render(data){
        if(data === null || (data && data.uid === 0)){
            this.node.parent.active = false;
            return;
        }

        this.lab_name.string = data.name;
        this.node.parent.active = true;
        this.fallOver = false;
        this.state = State.Ready;
        this.currentSpeedY = 0;
        this.currentSpeedX = 0;
        this.anim = this.getComponent(cc.Animation);
        // this.anim.playAdditive("birdFlapping");
        this.anim.playAdditive("birdWing");
        this.node.angle = 0;
        this.node.parent.x = this._initPosX;
        this.node.parent.y = this._initPosY;
        this.main_camera.x = 0;

        this.posId = data.posId;
    },
    refreshData(data){

        if(data.game_type == "normal") { // 正常飞行

            this.currentSpeedX = data.speedX;

        }else if(data.game_type == "pause"){ //暂停飞行

            this.currentSpeedX = 0;
        }else if(data.game_type == "fall") { //掉落

            this.currentSpeedX = 0;
        }
    },
    startFly() {

        // 停止小鸟上下浮动
        // this.anim.stop("birdFlapping");
        // bird rise move
        this.rise({type:1});
    },
    update(dt) {
        if (this.state === State.Ready || this.state === State.Drop) return;
        // 每帧更新bird位置
        this.updatePosition(dt);
        // 每帧更新状态
        this.updateState();
        // 碰撞检测 处理
        this.detectCollision();
    },
    updatePosition(dt) {
        var flying = this.state === State.Rise || this.state === State.FreeFall;
        if (flying) {
            this.currentSpeedY -= dt * this.gravity;
            this.node.parent.y += dt * this.currentSpeedY;

            this.node.parent.x += dt * this.currentSpeedX;

            if(this.posId == globalData.gameMgr.posId) {
                this.main_camera.x = this.node.parent.x - this._initPosX;
                var score = Math.floor((this.node.parent.x - this._initPosX)/100);
                if(this.last_score != score){
                    globalData.eventlister.fire("GAIN_SCORE",Math.floor((this.node.parent.x - this._initPosX)/100));
                    this.last_score = score;
                }
            }
        }
        //限制不能超出屏幕
        this.node.parent.y = Math.min(this.node.parent.y,640/2);

        if(this.node.parent.y < -640/2){
            this.fallOver = true;
        }

    },
    updateState() {
        switch (this.state) {
            case State.Rise:
                if (this.currentSpeedY < 0) {
                    this.state = State.FreeFall;
                    this.runFallAction(.6);
                }
                break;
        }
    },
    detectCollision() {

        if (this.state === State.Ready || this.state === State.Drop || this.state === State.GAMEOVER) return;

        // 掉落地板下面
        if (this.fallOver) {
            this.state = State.Drop;
            this.anim.stop();

            if(this.posId == globalData.gameMgr.posId){
                globalData.socketMgr.fallOver();
            }
        }
    },
    setGameOver(){
        this.state = State.GAMEOVER;
    },
    onCollisionEnter(other, self) {

        //碰到砖块就暂停一下
        if(other.node._name === 'block'){
            if(this.posId == globalData.gameMgr.posId) {
                globalData.socketMgr.pauseOver();
            }
            other.node.getComponent("Effect").fadeOut();
        }
        //碰到地板要弹起来
        if (other.node._name === "ground"){
            if(this.posId == globalData.gameMgr.posId){
                globalData.socketMgr.birdRise({type:1});
            }
        }
        //碰到冰块 冰块会消失
        if(other.node._name === 'ice'){
            if(this.posId == globalData.gameMgr.posId) {
                globalData.socketMgr.birdRise({type: 2});
            }
            other.node.getComponent("Effect").fadeOut();
        }
    },
    rise(data) {
        this.state = State.Rise;
        if(data.type == 1){
            this.currentSpeedY = this.initRiseSpeed;
        }else if(data.type == 2){
            this.currentSpeedY = this.iceRiseSpeed;
        }

        this.runRiseAction();
    },
    // 上升动作
    runRiseAction() {
        if (this.tweenAction) {
            this.tweenAction.stop();
            this.tweenAction = null;
        };
        this.tweenAction = cc.tween(this.node).to(.3, { angle: 30 }, { easing: 'cubicOut' }).start()
    },
    // 下落动作
    runFallAction(duration) {
        if (this.tweenAction) {
            this.tweenAction.stop();
            this.tweenAction = null;
        };
        this.tweenAction = cc.tween(this.node).to(duration, { angle: -90 }, { easing: 'cubicIn' }).start()
    },
})
