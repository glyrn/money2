import globalData from "./data/globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        lab_score_0:cc.Label,
        lab_score_1:cc.Label,
        lab_score_2:cc.Label,
        lab_score_3:cc.Label,
        lab_title:cc.Label,
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
        var score_list = globalData.gameMgr.score_list[this.cur_idx];
        for (let i = 0; i < 4; i++) {
            this['lab_score_'+i].node.active = false;
        }

        var cur_sort = 0;
        for (let i = 0; i < score_list.length; i++) {
            var info = score_list[i];
            this['lab_score_'+i].node.active = true;
            this['lab_score_'+i].string = "第"+(i+1)+"名："+info.name+"："+info.score+"分";

            if(info.posId == globalData.gameMgr.posId){
                cur_sort = i+1;
            }
        }
        this.lab_title.string = "太棒了，您获得了第"+cur_sort+"名！";
    },
});
