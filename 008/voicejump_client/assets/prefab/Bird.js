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
});
cc.Class({
    statics: {
        State: State
    },
    extends: cc.Component,
    properties: {
        //上抛初速度，单位：像素/秒
        initRiseSpeed: 800,
        currentSpeedX:300,
        //重力加速度，单位：像素/秒的平方
        gravity: 1000,
        main_camera:cc.Node,
        main_ui:cc.Node,
        //小鸟的状态
        state: {
            default: State.Ready,
            type: State,
        },
    },
    onLoad() {
        const manager = cc.director.getCollisionManager();
        manager.enabled = true;
        manager.enabledDebugDraw = false;
        this.fallOver = false;
        this.tweenAction = null;
        this._initPosX = this.node.x;
    },
    init() {
        this.node.active = true;
        this.state = State.Ready;
        this.currentSpeedY = 0;
        this.anim = this.getComponent(cc.Animation);
        // this.anim.playAdditive("birdFlapping");
        this.anim.playAdditive("birdWing");
    },
    render(data){
        if(data === null || (data && data.uid === 0)){
            this.node.active = false;
            return;
        }

        this.posId = data.posId;
        this.node.active = true;
    },
    refreshData(data) {
        if (this.tweenMoveAction) {
            this.tweenMoveAction.stop();
            this.tweenMoveAction = null;
        };

        this.node.x = this._initPosX + data.last_x;
        this.tweenMoveAction = cc.tween(this.node).to(data.duration, { x: this._initPosX + data.x }).start();

        if(this.posId == globalData.gameMgr.posId) {
            //摄像机跟随
            if (this.tweenMoveAction1) {
                this.tweenMoveAction1.stop();
                this.tweenMoveAction1 = null;
            }
            ;
            this.tweenMoveAction1 = cc.tween(this.main_camera).to(data.duration, {x: data.x}).start();
            //UI跟随
            if (this.tweenMoveAction2) {
                this.tweenMoveAction2.stop();
                this.tweenMoveAction2 = null;
            }
            ;
            this.tweenMoveAction2 = cc.tween(this.main_ui).to(data.duration, {x: data.x}).start();
        }
    },
    startFly() {

        // 停止小鸟上下浮动
        // this.anim.stop("birdFlapping");
        // bird rise move
        this.rise();
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
            // this.currentSpeedY -= dt * this.gravity;
            // this.node.y += dt * this.currentSpeedY;

            // this.node.x += dt * this.currentSpeedX;
            //控制摄像机
            // if(this.posId == globalData.gameMgr.posId){
            //     this.main_camera.x += dt * this.currentSpeedX;
            //     this.main_ui.x += dt * this.currentSpeedX;
            // }
        }
        //限制不能超出屏幕
        this.node.y = Math.min(this.node.y,640/2);

        if(this.node.y < -640/2){
            // this.fallOver = true;
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

        if (this.state === State.Ready || this.state === State.Drop) return;

        // 掉落地板下面
        if (this.fallOver) {
            this.state = State.Drop;
            this.anim.stop();

            if(this.posId == globalData.gameMgr.posId){
                globalData.socketMgr.fallOver();
            }

            // this.game.gameOver();
        }
        //计算得分
        // this.game.gainScore(this.startTime);
    },

    onCollisionEnter(other, self) {
        //碰到砖块就挂了
        if(other.node._name === 'block'){
            // this.fallOver = true;
        }
        //碰到地板要弹起来
        if (other.node._name === "ground"){
            this.currentSpeedY = 500; //回弹力度
        }
        //碰到冰块 冰块会消失
        if(other.node._name === 'ice'){
            this.currentSpeedY = 300;
            other.node.getComponent("Ice").fadeOut();
        }
    },
    rise() {
        this.state = State.Rise;
        this.currentSpeedY = this.initRiseSpeed;
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
