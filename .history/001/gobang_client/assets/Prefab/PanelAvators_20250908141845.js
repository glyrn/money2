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
        // if(globalData.gameMgr.playerData.self.uid)
        this.avator0.render(globalData.gameMgr.playerData.self);
        this.avator1.render(globalData.gameMgr.playerData.target);
    }
})