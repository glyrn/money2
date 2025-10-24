cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
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
    // start:function(){
    //     // 监听切后台
    //     cc.game.on(cc.game.EVENT_HIDE, this.onEnterBackground, this);
    //     cc.game.on(cc.game.EVENT_SHOW, this.onEnterForeground, this);
    
    // },
    // onEnterBackground() {
    //     // 如果当前是播放音乐，则直接停掉音乐
    //     cc.audioEngine.stopMusic();
    // },
    // onEnterForeground() {
    //     // 如果当前是播放音乐，则重新播放音乐
    //     cc.playMusic("sound/bg",true,1);
    // },
    onBtnClose:function(){
        this.node.active = false;
    },
    onShowPanel:function(){
        this.node.active = true;
    },
    onToggleBg:function(toggle, customEventData){
        if(toggle.isChecked){
            globalData
            // cc.audioEngine.setMusicVolume(1);
            cc.audioEngine.stopMusic();
            cc.playMusic("sound/bg",true,1);
        }else{
            // cc.audioEngine.setMusicVolume(0.01);
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
    // onProgressBg:function(slider) {
    //     this.progressbar_bg.progress = slider.progress;
    //     cc.audioEngine.setMusicVolume(slider.progress);
    // },
    // onProgressEffect:function(slider) {
    //     this.progressbar_effect.progress = slider.progress;
    //     cc.audioEngine.setEffectsVolume(slider.progress);
    // }
});
