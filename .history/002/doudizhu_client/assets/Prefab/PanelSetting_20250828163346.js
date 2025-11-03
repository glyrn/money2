
cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
        // bgMucic:cc.AudioSource,
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
            // this.bgMucic.play();
            cc.audioObj.getComponent(cc.AudioSource).play();
        }else{
            cc.isPlayingGlobalBg = 0;
            // this.bgMucic.stop();
            cc.audioObj.getComponent(cc.AudioSource).stop();
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
