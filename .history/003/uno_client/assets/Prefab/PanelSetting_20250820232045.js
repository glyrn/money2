cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
        // progressbar_bg:cc.ProgressBar,
        // progressbar_effect:cc.ProgressBar,
    },
   
    onBtnClose:function(){
        this.node.active = false;
    },
    onShowPanel:function(){
        this.node.active = true;
    },
    onToggleBg:function(toggle, customEventData){

        if(toggle.isChecked){
            cc.isPlayingGlobalBg = 1;
            // cc.audioEngine.setMusicVolume(1);
            cc.audioEngine.stopMusic();
            cc.playMusic("sound/bg",true,1);
        }else{
            cc.isPlayingGlobalBg = 0;
            // cc.audioEngine.setMusicVolume(0.01);
            cc.audioEngine.stopMusic();
        }
    },
    onToggleEffect:function(toggle, customEventData){

       if(toggle.isChecked){
            cc.isPlayingGlobalEffect = 1;
            cc.audioEngine.setEffectsVolume(1);
        }else{
            cc.isPlayingGlobalEffect = 0;
            cc.audioEngine.setEffectsVolume(0.01);
        }
    },
});
