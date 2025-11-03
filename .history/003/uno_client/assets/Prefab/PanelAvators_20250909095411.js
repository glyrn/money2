import AvatorReady from "./AvatorReady";
import globalData from "../Script/data/globalData";
cc.Class({
    extends: cc.Component,
    name:"PanelAvators",
    properties: {
        avator0:AvatorReady,
        avator1:AvatorReady,
        avator2:AvatorReady,
        avator3:AvatorReady,

    },
    onLoad:function(){
        
    },
    render:function(){

        if(globalData.gameMgr.playerData.self && globalData.gameMgr.playerData.self.uid > 0){
            this.avator0.node.active = true;
            this.avator0.render(globalData.gameMgr.playerData.self);
        }else{
            this.avator0.node.active = false;
        }
        
        if(globalData.gameMgr.playerData.left && globalData.gameMgr.playerData.left.uid > 0){
            this.avator1.node.active = true;
            this.avator1.render(globalData.gameMgr.playerData.left);
        }else{
            this.avator1.node.active = false;
        }

        if(globalData.gameMgr.playerData.top && globalData.gameMgr.playerData.top.uid > 0){
            this.avator1.node.active = true;
            this.avator1.render(globalData.gameMgr.playerData.top);
        }else{
            this.avator1.node.active = false;
        }

        if(globalData.gameMgr.playerData.right && globalData.gameMgr.playerData.right.uid > 0){
            this.avator1.node.active = true;
            this.avator1.render(globalData.gameMgr.playerData.right);
        }else{
            this.avator1.node.active = false;
        }

    }
})