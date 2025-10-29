import globalData from "../../globalData";

cc.Class({
    extends: cc.Component,
    name:'Card',
    properties: {
        bg:cc.Sprite,
        num:cc.Sprite,
        sf_0:cc.SpriteFrame,
        sf_1:cc.SpriteFrame,
        sf_2:cc.SpriteFrame,
        sf_3:cc.SpriteFrame,
        sf_4:cc.SpriteFrame,
        sf_5:cc.SpriteFrame,
        sf_6:cc.SpriteFrame,
        sf_7:cc.SpriteFrame,
        sf_8:cc.SpriteFrame,
        sf_9:cc.SpriteFrame,
        sf_stop:cc.SpriteFrame,
        sf_turn:cc.SpriteFrame,
        sf_plus2:cc.SpriteFrame,
        sf_plus4:cc.SpriteFrame,
        sf_color:cc.SpriteFrame,
        sf_color1:cc.SpriteFrame,
        sf_color2:cc.SpriteFrame,
        sf_color3:cc.SpriteFrame,
        sf_color4:cc.SpriteFrame,
        // color:cc.Sprite,
        mask:cc.Node,

    },
    setPlayer:function(player){
        this._player = player;
    },
    setTouchEnable:function(value){
        this._touchEnable = value;
    },
    onBtnClick:function(){

        if(!this._touchEnable) return;
        if(!this._data) return;

        this._player.resetCard(this);

        this._data.selected = !this._data.selected;
        this.checkSelectColor();
        this.updatePos();
    },
    updatePos:function(){

        if(!this._data) return;
        this.node.position = this._data.selected ? cc.v2(this.base_pos.x, this.base_pos.y + 40) : this.base_pos;
    },
    checkSelectColor:function(){
        if(this._data && this._data.selected && (this._data.value == 'color' || this._data.value == 'plus4')
            && globalData.gameMgr.playerData.turn == globalData.gameMgr.playerData.self.posId){
            globalData.eventlister.fire('SHOW_SELECT_COLOR')
        }else{
            globalData.eventlister.fire('HIDE_SELECT_COLOR')
        }
    },
    checkShowColor:function(){
        if(this._data && this._data.value == 'plus4' || this._data.value == 'color'){
            globalData.eventlister.fire('SHOW_CARD_COLOR',this._data.color);
            // this.color.node.active = true;
            // this.color.spriteFrame = this['sf_color' + this._data.color];
        }else{
            globalData.eventlister.fire('HIDE_CARD_COLOR',this._data.color);
            // this.color.node.active = false;
        }
    },
    resetPos:function(){
        if(!this._data) return;
        this._data.selected = false;
        this.updatePos();
    },
    render:function(data,idx){

        this.base_pos = this.node.position;
        this._data = data;

        this.num.node.active = true;
        this.num.getComponent(cc.Sprite).spriteFrame = this['sf_'+data.value];
        this.bg.getComponent(cc.Sprite).spriteFrame = this['sf_color'+data.color];

        if(data.isNew){
            data.isNew = false;
            this.mask.active = true;
            this.mask.runAction(cc.sequence([
                cc.delayTime(0.4+idx*0.03),
                cc.fadeOut(0.5),
                cc.fadeIn(0.5),
                cc.fadeOut(0.5),
            ]));
        }
    }
});


