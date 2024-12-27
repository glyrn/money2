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
        //重力加速度，单位：像素/秒的平方
        gravity: 1000,
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
    },
    init() {
        this.node.active = true;
        this.state = State.Ready;
        this.currentSpeed = 0;

        this.anim = this.getComponent(cc.Animation);
        this.anim.playAdditive("birdFlapping");
        this.anim.playAdditive("birdWing");
    },
    render(data){
        if(data === null || (data && data.uid === 0)){
            this.node.active = false;
            return;
        }

        this.node.active = true;
    },
    startFly() {

        this.startTime = Math.floor(new Date().getTime() / 1000);
        // 停止小鸟上下浮动
        this.anim.stop("birdFlapping");
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
            this.currentSpeed -= dt * this.gravity;
            this.node.y += dt * this.currentSpeed;
        }
        //限制不能超出屏幕
        this.node.y = Math.min(this.node.y,640/2);

        if(this.node.y < -640/2){
            this.fallOver = true;
        }

    },
    updateState() {
        switch (this.state) {
            case State.Rise:
                if (this.currentSpeed < 0) {
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
            // this.game.gameOver();
        }
        //计算得分
        // this.game.gainScore(this.startTime);
    },

    onCollisionEnter(other, self) {
        //碰到砖块就挂了
        if(other.node._name === 'block'){
            this.fallOver = true;
        }
        //碰到地板要弹起来
        if (other.node._name === "ground"){
            this.currentSpeed = 500; //回弹力度
        }
        //碰到冰块 冰块会消失
        if(other.node._name === 'ice'){
            this.currentSpeed = 300;
            other.node.getComponent("Ice").fadeOut();
        }
    },
    rise() {
        this.state = State.Rise;
        this.currentSpeed = this.initRiseSpeed;
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
