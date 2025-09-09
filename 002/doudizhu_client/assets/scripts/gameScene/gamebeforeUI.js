import globalData from "../globalData.js"

cc.Class({
    extends: cc.Component,
    name:'GameBeforeUI',
    properties: {
        btn_ready:cc.Node,
        btn_quit:cc.Node,
    },

    onLoad () {

        let that = this;
        globalData.eventlister.on('GAME_OVER2',function(){
            that.render();
        })
        globalData.eventlister.on('FORCE_EXIT_EV2',function(){
            that.render();
        });
    },

    start () {
        this.render();
    },
    render(){

        this.btn_ready.active = globalData.gameMgr.posState.self.state < 2 && !globalData.gameMgr.is_ob;
        var isQuit = globalData.gameMgr.roomState.state == 3 &&
            globalData.gameMgr.play_index >= globalData.gameMgr.play_count &&
            globalData.gameMgr.posState.self.state < 2 &&
            !globalData.gameMgr.is_ob;
        this.btn_quit.active = false;
        //发送退出游戏事件
        if(isQuit){
            // window.parent.postMessage({'quitGame':1}, "*");
            // console.log("发送退出事件")
        }
    },
    onBtnPrepare(){
        globalData.socketMgr.prepare();
    },
    onBtnQuit(){
        window.close();
        cc.director.end();
    }
});
