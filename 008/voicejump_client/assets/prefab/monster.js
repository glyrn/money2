import Bird from "./Bird";
import globalData from "../script/data/globalData";

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

        var d = new Date();
        var seconds = d.getSeconds() + globalData.gameMgr.diff_time;
        if(seconds % 5 === 0){

            if(this.last_seconds == seconds){
                return;
            }
            this.last_seconds = seconds;
            this.node.position = this.basePosition;
            this.currentSpeedX = 0;
        }

        var nearBird = this['player'+0];

        var p_monster = this.node.convertToWorldSpaceAR(cc.Vec2.ZERO);
        var p_bird = nearBird.node.convertToWorldSpaceAR(cc.Vec2.ZERO);

        var distX =  Math.abs(p_bird.x) - p_monster.x;
        //选出最近的玩家
        for (let i = 1; i < 4; i++) {
            if(!this['player'+i].fallOver && this['player'+i].state == 1){
                p_bird = this['player'+i].node.convertToWorldSpaceAR(cc.Vec2.ZERO);
                if(Math.abs(p_bird.x) - p_monster.x < distX){
                    nearBird = this['player'+i];
                }
            }
        }

        p_bird = nearBird.node.convertToWorldSpaceAR(cc.Vec2.ZERO)

        //右边
        if(p_bird.x >= p_monster.x){
            this.currentSpeedX = 40 * dt;
        }else{ //左边
            this.currentSpeedX = -40 * dt;
        }

        this.node.x += this.currentSpeedX;
        //站在平台上
        if (this.standTarget) {
            this.currentSpeedY = 0;
            this.node.y = Math.max(this.node.y, this.standTarget.position.y + this.standTarget.height / 2 + this.node.height / 2);
        }else{
            this.currentSpeedY -= dt * this.gravity;
            this.node.y += dt * this.currentSpeedY;
        }

        if (this.node.y < -cc.view.getCanvasSize().height / 2) {
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