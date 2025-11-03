import AvatorMini from "./AvatorMini";
import globalData from "../Script/data/globalData";
cc.Class({
    extends: cc.Component,
    name:"PanelAvators",
    properties: {
        avator0:AvatorMini,
        avator1:AvatorMini,
    },
    onLoad:function(){
        
    },
    render:function(){
        if(globalData.gameMgr.playerData.self && globalData.gameMgr.playerData.self.uid > 0){
            this.avator0.render(globalData.gameMgr.playerData.self);
        }else{
            this.avator0.node.active = false;
        }
        
        if(globalData.gameMgr.playerData.target && globalData.gameMgr.playerData.target.uid > 0){
            this.avator1.render(globalData.gameMgr.playerData.target);
        }else{
            this.avator1.node.active = false;
        }
    }
})