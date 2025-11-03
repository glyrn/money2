import globalData from "./data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        lab_score_0:cc.Label,
        lab_score_1:cc.Label,
        lab_score_2:cc.Label,
        lab_score_3:cc.Label,
        // lab_title:cc.Label,
        lab_warning:cc.Node,
        lab_contents:cc.Node,
        btn_score_close:cc.Node,
        panel_loading:cc.Node,
    },
    onLoad(){
        this.cur_idx = 0;
    },
    onBtnClose(){
        this.node.active = false;
    },
    onBtnLast(){
        this.cur_idx = Math.max(0,this.cur_idx-1);
        this.refresh();
    },
    onBtnCur(){
        this.cur_idx = globalData.gameMgr.score_list.length - 1;
        this.refresh();
    },
    refresh(){
        var data = globalData.gameMgr.score_list[this.cur_idx];
        //有人逃跑
        if(data.invalid == 1){
            this.lab_warning.active = true;
            this.lab_contents.active = false;
            this.panel_loading.active = false;

        }else{

            this.lab_warning.active = false;
            this.lab_contents.active = true;

            var score_list = data.score_list;

            // for (let i = 0; i < 4; i++) {
            //     this['lab_score_'+i].node.active = false;
            // }

            // // var cur_sort = 0;
            // for (let i = 0; i < score_list.length; i++) {
            //     var info = score_list[i];
            //     this['lab_score_'+i].node.active = true;
            //     this['lab_score_'+i].string = "Top"+(i+1)+"："+info.name+"："+info.score;

            //     // if(info.posId == globalData.gameMgr.posId){
            //     //     cur_sort = i+1;
            //     // }
            // }
        }
        this.btn_score_close.active = globalData.gameMgr.play_index < globalData.gameMgr.play_count;
    },
});
