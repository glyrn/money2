cc.Class({
    extends: cc.Component,
    name:"PanelLoading",
    properties: {
        prog_bar:cc.ProgressBar,
        lab_prog:cc.Label,
    },

    onLoad () {
        this._prog_value = 0;
        this._had_init = false;
        this._finishCbFunc = null;
    },

    setFinishCallback(cbFunc){
        this._finishCbFunc = cbFunc;
    }
});