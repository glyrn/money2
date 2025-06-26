
cc.Class({
    extends: cc.Component,
    name:"PanelSetting",
    properties: {
        progressbar_bg:cc.ProgressBar,
        progressbar_effect:cc.ProgressBar,
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
