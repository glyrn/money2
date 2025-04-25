cc.Class({
    extends: cc.Component,
    properties: {
        area0:cc.Node,
        area1:cc.Node,
        area2:cc.Node,
        camera:cc.Node,
    },

    // update(){
    //     var cameraX = this.camera.x;
    //     var cur_idx = Math.floor((cameraX+960) / 5000);
    //     var pos_idx = cur_idx;
    //     if(cur_idx >=3) cur_idx = cur_idx - 3;

    //     this['area'+cur_idx].x = 5000 * pos_idx;
    //     if(cur_idx+1 >= 3){
    //         this['area0'].x = 5000 * (pos_idx+1)
    //     }else{
    //         this['area'+(cur_idx+1)].x = 5000 * (pos_idx+1);
    //     }
    // },
});
