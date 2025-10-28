cc.Class({
    extends: cc.Component,
    name:"PanelLoading",
    properties: {
        prog_bar:cc.ProgressBar,
        lab_prog:cc.Label,
        setp_value:0.5,
    },

    onLoad () {
        this._prog_value = 0;
        this._had_init = false;
        this._finishCbFunc = null;
    },

    update(){
    
        this.prog_bar.progress = this._prog_value * 0.01;
        this.lab_prog.string = this._prog_value.toFixed(2) + "%";
        if(this._prog_value < 100){
            this._prog_value += this.setp_value;
        }else{
            if(!this._had_init){
                this._had_init = true;

                globalData.socketMgr.initSocket();
            }
        }
    },

    setFinishCallback(cbFunc){
        this._finishCbFunc = cbFunc;
    }
});