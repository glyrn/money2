cc.Class({
    name: "EventPanel",
    extends: cc.Component,
    properties: {
        sp_event1:cc.SpriteFrame,
        sp_event2:cc.SpriteFrame,
    },

    render:function(data){
        this.node.getChildByName("img_bg").getComponent(cc.Sprite).spriteFrame = this['sp_event'+data.event];
        this.node.getChildByName("label1").getComponent(cc.Label).string = data.msg;
        this.node.getChildByName("label2").getComponent(cc.Label).string = data.msg;
    }
});