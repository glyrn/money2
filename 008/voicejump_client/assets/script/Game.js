import globalData from "./data/globalData"

const Bird = require('bird');
const Map = require('map')

cc.Class({
    extends: cc.Component,
    properties: {
        bird: Bird,
        scoreLabel: cc.Label,
        map:Map,
        readyMenu: {
            default: null,
            type: cc.Node
        },
        gameOverMenu: {
            default: null,
            type: cc.Node
        },
        lab_room:cc.Label,
    },
    onLoad() {
        this.score = 0;
        this.scoreLabel.string = this.score;
        this.bird.init(this);
        this.enableInput(true);

        var self = this;
        //刷新玩家
        globalData.eventlister.on("SIT_CHANGE",function(data){


        });

        this.render();
    },
    onBtnReady(){
        globalData.socketMgr.prepare()
    },
    onBtnScore(){
        this.overSprite.active = true;
    },
    render(){
        this.lab_room.string = "房号:"+globalData.gameMgr.roomState.roomId+"  局数:"+globalData.gameMgr.play_index +'-'+ globalData.gameMgr.play_count;
    },
    gameStart() {
        // bird fly
        this.bird.startFly();
        this.map.startRun();
    },
    gameOver() {

        // 管道重置
        // this.pipeManager.reset();
        this.map.stopRun();
        // 停止游戏输入监听
        this.enableInput(false);
        // 显示游戏结束面板
        this.showGameOverMenu()
    },
    gainScore(startTime) {
        this.score = Math.floor(new Date().getTime() / 1000) - startTime;
        this.scoreLabel.string = this.score
    },
    // 显示游戏结束面板
    showGameOverMenu() {
        // 隐藏分数
        cc.tween(this.scoreLabel.node).to(.3, { opacity: 0 }).call(() => {
            this.scoreLabel.node.active = false;
        }).start();
        // 获取游戏结束界面的各个节点
        const gameOverNode = this.gameOverMenu.getChildByName("gameOverLabel");
        const resultBoardNode = this.gameOverMenu.getChildByName("resultBoard");
        const startButtonNode = this.gameOverMenu.getChildByName("startBtn");
        const backButtonNode = this.gameOverMenu.getChildByName("backbtn");
        const currentScoreNode = resultBoardNode.getChildByName("currentScore");
        const bestScoreNode = resultBoardNode.getChildByName("bestScore");
        const medalNode = resultBoardNode.getChildByName("medal");
        // 保存最高分
        let bestScore = 0;
        // 显示当前分数、最高分
        currentScoreNode.getComponent(cc.Label).string = this.score;
        bestScoreNode.getComponent(cc.Label).string = bestScore;
        // 判断是否显示奖牌
        let showMedal = (err, spriteFrame) => {
            if (this.score >= this.goldScore) {
                medalNode.getComponent(cc.Sprite).spriteFrame = spriteFrame._spriteFrames.medal_gold;
            } else if (this.score >= this.silverScore) {
                medalNode.getComponent(cc.Sprite).spriteFrame = spriteFrame._spriteFrames.medal_silver;
            } else {
                medalNode.getComponent(cc.Sprite).spriteFrame = null;
            }
        };
        cc.loader.loadRes("res_bundle", cc.SpriteAtlas, showMedal); // 动态加载资源
        // 依次显示各个节点
        startButtonNode.active = true;
        backButtonNode.active = true;
        this.gameOverMenu.active = true;
        startButtonNode.opacity = 1;
        gameOverNode.opacity = 1;
        cc.tween(gameOverNode).parallel(
            cc.tween().to(.2, { opacity: 255 }),
            cc.tween().by(.2, { position: cc.v2(0, 10) }).by(.3, { position: cc.v2(0, -10) })
        ).start();
        cc.tween(startButtonNode).delay(.3).to(.5, { opacity: 255 }).start();
        cc.tween(resultBoardNode).delay(.3).to(.9, { position: cc.v2(resultBoardNode.x, 200) }, { easing: 'cubicInOut' }).start();
    },
    // 开始或者bird jump
    startGameOrJumpBird() {
        if (this.bird.state === Bird.State.Ready) {
            this.gameStart()
        } else {
            this.bird.rise()
        }
    },
    // 事件控制
    enableInput(enable) {
        if (enable) {
            this.node.on(cc.Node.EventType.TOUCH_START, this.startGameOrJumpBird, this)
        } else {
            this.node.off(cc.Node.EventType.TOUCH_START, this.startGameOrJumpBird, this)
        }
    }
})