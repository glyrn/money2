
cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
        toggleBg:cc.Toggle
        // bgMucic:cc.AudioSource,
        // progressbar_bg:cc.ProgressBar,
        // progressbar_effect:cc.ProgressBar,
    },
    // start:function(){
    //     if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_IOS && cc.sys.isMobile) {

    //         cc.game.on(cc.game.EVENT_SHOW, () => {
    //             setTimeout(() => {
    //                 cc.audioEngine.stopMusic();
    //             }, 50);
    //             setTimeout(() => {
    //                 cc.playMusic("sound/bg",true,1);
    //             }, 100);
    //         });
    //     }
    // },
    // onBtnReset:function(){
    //     setTimeout(() => {
    //         cc.audioEngine.stopAll();
    //         cc.audioEngine.stopMusic();

    //         // cc.audioEngine.stopAllEffects();
    //     }, 50);
    //     setTimeout(() => {
    //         cc.playMusic("sound/bg",true,1);
    //     }, 100);
    // },
    onBtnClose:function(){
        this.node.active = false;
    },
    onShowPanel:function(){
        this.node.active = true;
        // cc.isPlayingGlobalBg == 1
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
    // onProgressBg:function(slider) {
    //     this.progressbar_bg.progress = slider.progress;
    //     cc.audioEngine.setMusicVolume(slider.progress);
    // },
    // onProgressEffect:function(slider) {
    //     this.progressbar_effect.progress = slider.progress;
    //     cc.audioEngine.setEffectsVolume(slider.progress);
    // }
});
