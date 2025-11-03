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

        if(globalData.gameMgr.playerData[0] && globalData.gameMgr.playerData[0].uid > 0){
            this.avator0.node.active = true;
            this.avator0.render(globalData.gameMgr.playerData[0]);
        }else{
            this.avator0.node.active = false;
        }
        
        if(globalData.gameMgr.playerData[1] && globalData.gameMgr.playerData[1].uid > 0){
            this.avator1.node.active = true;
            this.avator1.render(globalData.gameMgr.playerData[1]);
        }else{
            this.avator1.node.active = false;
        }

        if(globalData.gameMgr.playerData[2] && globalData.gameMgr.playerData[2].uid > 0){
            this.avator2.node.active = true;
            this.avator2.render(globalData.gameMgr.playerData[2]);
        }else{
            this.avator2.node.active = false;
        }

        if(globalData.gameMgr.playerData[3] && globalData.gameMgr.playerData[3].uid > 0){
            this.avator3.node.active = true;
            this.avator3.render(globalData.gameMgr.playerData[3]);
        }else{
            this.avator3.node.active = false;
        }

    }
})