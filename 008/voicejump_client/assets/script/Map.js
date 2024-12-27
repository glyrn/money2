cc.Class({
    extends: cc.Component,
    properties: {
        // speed: -300,
        area1:cc.Node,
        area2:cc.Node,
        isCanRun:false,
    },
    start () {

    },
    refresh(mapInfo){
        cc.moveTo(mapInfo.duration,cc.v2(mapInfo.x))
    },
    update (dt) {
        // if(this.isCanRun){
        //     this.area1.x += this.speed * dt;
        //     this.area2.x += this.speed * dt;
        //     if(this.area1.x < -5000*2+300){
        //         this.area1.x = 0;
        //     }
        //     if(this.area2.x < -5000-300){
        //         this.area2.x = 5000;
        //     }
        // }
    },
    startRun: function() {
        this.isCanRun = true;
        this.area1.x = 0;
        this.area2.x = 5000;
    },
    stopRun:function(){
        this.isCanRun = false;
    }
});
