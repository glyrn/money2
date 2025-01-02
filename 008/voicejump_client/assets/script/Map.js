cc.Class({
    extends: cc.Component,
    properties: {
        // speed: -300,
        area1:cc.Node,
        area2:cc.Node,
        area3:cc.Node,
        isCanRun:false,
    },
    onLoad () {
        this._initPosX1 = this.area1.x;
        this._initPosX2 = this.area2.x;
        this._initPosX3 = this.area3.x;
    },
    refreshData(data){

        if (this.tweenMoveAction1) {
            this.tweenMoveAction1.stop();
            this.tweenMoveAction1 = null;
        };

        this.area1.x = this._initPosX1 - data.last_x;
        this.tweenMoveAction1 = cc.tween(this.area1).to(data.duration, { x: this._initPosX1 - data.x }).start();

        if (this.tweenMoveAction2) {
            this.tweenMoveAction2.stop();
            this.tweenMoveAction2 = null;
        };

        this.area2.x = this._initPosX2 - data.last_x;
        this.tweenMoveAction1 = cc.tween(this.area2).to(data.duration, { x: this._initPosX2 - data.x }).start();

        if (this.tweenMoveAction3) {
            this.tweenMoveAction3.stop();
            this.tweenMoveAction3 = null;
        };

        this.area3.x = this._initPosX3 - data.last_x;
        this.tweenMoveAction1 = cc.tween(this.area3).to(data.duration, { x: this._initPosX3 - data.x }).start();
    },

    startRun: function() {
        this.isCanRun = true;
        // this.area1.x = 0;
        // this.area2.x = 5000;
    },
    stopRun:function(){
        this.isCanRun = false;
    }
});
