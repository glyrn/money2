import Bird from "./Bird";

cc.Class({
    extends: cc.Component,
    name:"Monster",
    properties: {
        gravity: 1000,
        player0:Bird,
        player1:Bird,
        player2:Bird,
        player3:Bird,
    },

    start:function(){
        this.currentSpeedY = 0;
        this.currentSpeedX = 0;
        this.basePosition = this.node.position;
    },
    update:function(dt){

        var nearBird = this['player'+0];

        var distX =  Math.abs(nearBird.node.parent.x) - this.node.x;
        //选出最近的玩家
        for (let i = 1; i < 4; i++) {
            if(!this['player'+i].fallOver && this['player'+i].state == 1){
                if(Math.abs(this['player'+i].node.parent.x) - this.node.x < distX){
                    nearBird = this['player'+i];
                }
            }
        }
        //右边
        if(nearBird.node.parent.x >= this.node.x){
            this.currentSpeedX = 0.3 * dt;
        }else{ //左边
            this.currentSpeedX -= 0.3 * dt;
        }

        this.node.x += this.currentSpeedX;

        //站在平台上
        if (this.standTarget) {
            this.node.y = Math.max(this.node.y, this.standTarget.position.y + this.standTarget.height / 2 + this.node.height / 2);
        }else{
            this.currentSpeedY -= dt * this.gravity;
            this.node.y += dt * this.currentSpeedY;
        }

        if (this.node.y < -640 / 2) {
            this.fallOver = true;
        }

        //掉落后 要复位
        if(this.fallOver){
            this.node.position = this.basePosition;
            this.fallOver = false;
            this.currentSpeedX = 0;
        }
    },
    onCollisionStay(other,self){
        if (other.node._name === "ground"){
            this.standTarget = other.node;
        }
    },
    onCollisionExit(other, self){
        if (other.node._name === "ground"){
            this.standTarget = null;
        }
    },
    onCollisionEnter(other, self) {
        if (other.node._name === "ground"){
            this.standTarget = other.node;
        }
    },
});