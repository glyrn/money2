import AvatorReady from "./AvatorReady";
import globalData from "../Script/data/globalData";
cc.Class({
    extends: cc.Component,
    name:"PanelAvators",
    properties: {
        avator0:AvatorReady,
        avator1:AvatorReady,
        avator2:AvatorReady,
    },
    onLoad:function(){
        
    },
    render:function(){

        if(globalData.gameMgr.posState.self && globalData.gameMgr.posState.self.uid > 0){
            this.avator0.node.active = true;
            this.avator0.render(globalData.gameMgr.posState.self);
        }else{
            this.avator0.node.active = false;
        }
        
        if(globalData.gameMgr.posState.left && globalData.gameMgr.posState.left.uid > 0){
            this.avator1.node.active = true;
            this.avator1.render(globalData.gameMgr.posState.left);
        }else{
            this.avator1.node.active = false;
        }

        if(globalData.gameMgr.posState.right && globalData.gameMgr.posState.right.uid > 0){
            this.avator2.node.active = true;
            this.avator2.render(globalData.gameMgr.posState.right);
        }else{
            this.avator2.node.active = false;
        }
    }
})