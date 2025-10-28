import globalData from "./data/globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        prog_bar:cc.ProgressBar,
        lab_prog:cc.Label,
        // img_loading:cc.Node,
        // lab_tips:cc.Label,
        // lab_debug:cc.Label,
    },

    onLoad () {
        // this.lab_tips.node.active = false;
        cc.debug.setDisplayStats(false);

        this._prog_value = 0;
        this._had_init = false;
        
    },
    update(){

        console.log(this._prog_value)
        this.prog_bar.progress = this._prog_value;
        this.lab_prog.string = this._prog_value.toFixed(2) + "%";
        if(this._prog_value < 100){
            this._prog_value += 0.5;
        }else{
            if(!this._had_init){
                this._had_init = true;

                globalData.socketMgr.initSocket();
            }
        }
    },
    start(){

        console.log("启动参数："+window.location.href);
        // this.lab_debug.string = "启动参数："+window.location.href;

        var url = decodeURI(window.location.href);
        if(url.split('?').length > 1){
            var params = url.split('?')[1].split('&');
            var field = {};
            for (const paramsKey in params) {
                var obj = params[paramsKey].split('=');
                field[obj[0]] = obj[1];
            }
            var that = this;
            cc.args = field;
            cc.args['lanuch_url'] = window.location.href;

        }
    },

});
