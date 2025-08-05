
cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
        progressbar_bg:cc.ProgressBar,
        progressbar_effect:cc.ProgressBar,
    },
    start:function(){
        if (cc.sys.isBrowser && cc.sys.os === cc.sys.OS_IOS && cc.sys.isMobile) {

            cc.game.on(cc.game.EVENT_SHOW, () => {
                setTimeout(() => {
                    cc.audioEngine.stopMusic();
                }, 50);
                setTimeout(() => {
                    cc.playMusic("sound/bg",true,1);
                }, 100);
            });
        }
    },
    onBtnClose:function(){
        this.node.active = false;
    },
    onShowPanel:function(){
        this.node.active = true;
    },
    onProgressBg:function(slider) {
        this.progressbar_bg.progress = slider.progress;
        cc.audioEngine.setMusicVolume(slider.progress);
    },
    onProgressEffect:function(slider) {
        this.progressbar_effect.progress = slider.progress;
        cc.audioEngine.setEffectsVolume(slider.progress);
    }
});
