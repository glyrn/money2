
cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
        
    },

    onBtnClose:function(){
        this.node.active = false;
    },
    onShowPanel:function(){
        this.node.active = true;
    },
    onToggleBg:function(toggle, customEventData){
        if(toggle.isChecked){
            cc.audioEngine.stopMusic();
            cc.playMusic("sound/bg",true,1);
        }else{
            cc.audioEngine.stopMusic();
        }
    },
    onToggleEffect:function(toggle, customEventData){
       if(toggle.isChecked){
            cc.audioEngine.setEffectsVolume(1);
        }else{
            cc.audioEngine.setEffectsVolume(0.01);
        }
    },
  
});
