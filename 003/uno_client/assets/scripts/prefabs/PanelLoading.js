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
        this.lab_prog.string = Math.floor(this._prog_value.toFixed(2)) + "%";
        if(this._prog_value < 100){
            this._prog_value += this.setp_value;

            window.parent.postMessage({'event_loading':{type:"runing",value:this._prog_value}}, "*");
            console.log("Loading中",this._prog_value);
        }else{
            if(!this._had_init){
                this._had_init = true;
                
                window.parent.postMessage({'event_loading':{type:"end"}}, "*");
                console.log("Loading结束",this._prog_value);

                if(this._finishCbFunc){
                    this._finishCbFunc();
                }

                this.scheduleOnce(function () {
                    this.node.active = false;
                },0.5);
            }
        }
    },
    showLoading(cbFunc){
        this.node.active = true;
        this._prog_value = 0;
        this._had_init = false;
        this._finishCbFunc = cbFunc;

        window.parent.postMessage({'event_loading':{type:"start"}}, "*");
        console.log("开始展示Loading");
    }
});