import AvatorReady from "./AvatorReady";
import globalData from "../scripts/globalData";

function hasPlayerUid(playerData) {
    return playerData && playerData.uid !== 0 && playerData.uid !== '0' && playerData.uid !== null && playerData.uid !== undefined && playerData.uid !== '';
}

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

        if(hasPlayerUid(globalData.gameMgr.playerData.self)){
            this.avator0.node.active = true;
            this.avator0.render(globalData.gameMgr.playerData.self);
        }else{
            this.avator0.node.active = false;
        }
        
        if(hasPlayerUid(globalData.gameMgr.playerData.left)){
            this.avator1.node.active = true;
            this.avator1.render(globalData.gameMgr.playerData.left);
        }else{
            this.avator1.node.active = false;
        }

        if(hasPlayerUid(globalData.gameMgr.playerData.top)){
            this.avator2.node.active = true;
            this.avator2.render(globalData.gameMgr.playerData.top);
        }else{
            this.avator2.node.active = false;
        }

        if(hasPlayerUid(globalData.gameMgr.playerData.right)){
            this.avator3.node.active = true;
            this.avator3.render(globalData.gameMgr.playerData.right);
        }else{
            this.avator3.node.active = false;
        }

    }
})
