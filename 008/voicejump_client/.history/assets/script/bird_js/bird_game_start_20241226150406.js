cc.Class({
    extends: cc.Component,
    properties: {
        maskLayer: {
            default: null,
            type: cc.Node
        }
    },
    startGame() {
        cc.director.preloadScene('Game');

        this.maskLayer.active = true;
        this.maskLayer.opacity = 1;
        this.maskLayer.color = cc.Color.BLACK;
        cc.tween(this.maskLayer).to(.2, { opacity: 255 }).call(() => {
            // 重新加载场景
            cc.director.loadScene('Game');
        }).start()
    },
})
