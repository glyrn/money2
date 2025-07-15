
import globalData from "../../globalData";

cc.Class({
    extends: cc.Component,
    properties: {
        card: cc.Prefab,
        _hand_cards:[],
        tips_index:0,
        sp_clock_color1:cc.SpriteFrame,
        sp_clock_color2:cc.SpriteFrame,
        sp_clock_color3:cc.SpriteFrame,
        sp_clock_color4:cc.SpriteFrame,
        anim_pos:cc.Animation,
    },
    name: "Player",
    update:function(){

        var now = Date.parse(new Date()) / 1000;
        var timer_value = this._data.target_timer_value - now;
        if(this._data && timer_value >= 0){

            this.clock.getComponent(cc.ProgressBar).progress = (30 - timer_value) / 30;
            this.clock.getChildByName('label').getComponent(cc.Label).string = timer_value;
            this.clock.getComponent(cc.Sprite).spriteFrame = this['sp_clock_color'+globalData.gameMgr.cur_out_color];

            if(timer_value == 0){
                this._data.target_timer_value = 0;
            }
        }
    },
    render:function(data,flag){

        this.avator = this.node.getChildByName('avator').getComponent("Avator");
        this.clock = this.node.getChildByName('clock');
        // this.panel_wait_choice = this.clock.getChildByName('panel_wait_choice').getComponent("PlaneColor");

        this.tips_index = 0;

        if(data && data.uid > 0) {

            this.node.active = true;
            this._data = data;
            this._flag = flag;
            this.avator.render(data);

            if(data.cards)
            {
                data.cards.sort(function(a,b){
                    if(a.type && b.type) {
                        if (a.type < b.type) {
                            return -1
                        } else if (a.type === b.type) {
                            if (a.color == b.color) {
                                return parseInt(a.value) - parseInt(b.value);
                            } else {
                                return a.color - b.color;
                            }
                        } else {
                            return 1;
                        }
                    }else{
                        return 0;
                    }
                });

                for (let i = 0; i < this._hand_cards.length; i++) {
                    this._hand_cards[i].node.active = false;
                }



                for (let i = 0; i < data.cards.length; i++) {


                    var card;
                    var basePos = cc.find("card_pos",this.node).position;

                    if(this._hand_cards[i]){
                        card = this._hand_cards[i];
                    }else{
                        var node = cc.instantiate(this.card);
                        node.parent = this.node.getChildByName("card_container");
                        card = node.getComponent("Card");
                        this._hand_cards.push(card);
                    }

                    card.node.active = true;
                    if(this._flag == 'self'){
                        var gap = 55;
                        var offsetY = i > 10 ? -40:0;
                        var offsetX = i > 10 ? -gap * 11 : 0;
                        card.node.position = cc.v2(basePos.x + i * gap + offsetX,basePos.y + offsetY);
                    }else if (this._flag == 'left'){
                        var gap = i > 12 ? 15:30;
                        card.node.position = cc.v2(basePos.x ,basePos.y + 105 - i * gap);
                    }else if (this._flag == 'top'){
                        var gap = i > 12 ? 15:30;
                        card.node.position = cc.v2(basePos.x + i * gap,basePos.y);
                    }else if (this._flag == 'right'){
                        var gap = i > 12 ? 15:30;
                        card.node.position = cc.v2(basePos.x , basePos.y + 105 - i * gap);
                    }

                    if(data.cards[i] == 0){//旁观者不能看牌
                        //牌背
                    }else{
                        if(this._flag == 'self' && !globalData.gameMgr.is_ob) { //围观不能看牌
                            card.setTouchEnable(true);
                            card.setPlayer(this);
                            card.render(data.cards[i]);
                        }
                    }
                }
                
                if(globalData.gameMgr.cur_out_posId == data.posId){
                    if(globalData.gameMgr.cur_out_value == "turn")
                    {
                        this.anim_pos.play("anim_small_turn");
                    }else if(globalData.gameMgr.cur_out_value == "stop")
                    {
                        this.anim_pos.play("anim_small_stop");
                    }
                }

                var isShowUno = data.cards.length == 1;
                if(isShowUno && data.posId == globalData.gameMgr.playerData.turn){
                    this.anim_pos.play("anim_uno");
                    cc.playEffect("sound/uno",false,1);
                }
            }

            if(data.posId == globalData.gameMgr.playerData.turn &&
                globalData.gameMgr.roomState.state == 1  &&
                data.posId != globalData.gameMgr.playerData.self.posId){
                this.clock.active = true;
                // this.panel_wait_choice.playAnim(true);
            }else{
                this.clock.active = false;
            }

        
        }else{
            this.node.active = false;
            for (let i = 0; i < this._hand_cards.length; i++) {
                this._hand_cards[i].node.active = false;
            }
        }
    },
    selectCardAnim:function(color,cb){
        // this.panel_wait_choice.selectCardAnim(color,cb);
    },
    selectTips:function(last_card,only_check){
        // console.log("selectTips",only_check);
        // console.log(last_card);
        if(!last_card) return ;
        globalData.eventlister.fire('HIDE_SELECT_COLOR');

        var findObj = {};
        if(last_card.value == 'plus4' || last_card.value == 'plus2'){
            if(last_card.mark){
                findObj.type = 1;
            }else{
                findObj.type = 2;
            }
        }else{
            findObj.type = 1;
        }
        var isFind = false;
        var card;
        var tips_cards = [];
        if(findObj.type == 2){
            if(last_card.value == 'plus4'){
                for (let i = 0; i < this._data.cards.length ; i++) {
                    if(this._data.cards[i].value == 'plus4'){
                        isFind = true;
                        card = this._hand_cards[i];
                        // break;
                        tips_cards.push(card);
                    }
                }
            }else if(last_card.value == 'plus2'){
                for (let i = 0; i < this._data.cards.length ; i++) {
                    if(this._data.cards[i].value == 'plus4' || this._data.cards[i].value == 'plus2'){
                        isFind = true;
                        card = this._hand_cards[i];
                        // break;
                        tips_cards.push(card);
                    }
                }
            }
        }else if(findObj.type == 1){
                var _isExist = function(check){
                    for (const _k in tips_cards) {
                        if(tips_cards[_k] && 
                            tips_cards[_k].value == check.value &&
                            tips_cards[_k].color == check.color &&
                            tips_cards[_k].type == check.type){
                            return true;
                        }
                    }
                    return false;
                }
            //找+4 或者万能牌
                for (let i = 0; i < this._data.cards.length ; i++) {
                    if(this._data.cards[i].value == 'color' || this._data.cards[i].value == 'plus4'){
                        isFind = true;
                        card = this._hand_cards[i];
                        tips_cards.push(card);
                    }
                }

            //找+2
                for (let i = 0; i < this._data.cards.length; i++) {
                    if (this._data.cards[i].color == last_card.color && this._data.cards[i].value == 'plus2') {
                        isFind = true;
                        card = this._hand_cards[i];
                        tips_cards.push(card);
                    }
                }
            //找功能牌
                for (let i = 0; i < this._data.cards.length; i++) {
                    if ((this._data.cards[i].value == last_card.value || this._data.cards[i].color == last_card.color) && this._data.cards[i].value != 'plus2' && this._data.cards[i].type == 2) {
                        isFind = true;
                        card = this._hand_cards[i];
                        tips_cards.push(card);
                    }
                }
                //找颜色牌
                for (let i = this._data.cards.length-1; i >= 0; i--) {
                    if (!_isExist(this._data.cards[i]) && this._data.cards[i].color == last_card.color && this._data.cards[i].type == 1) {
                        isFind = true;
                        card = this._hand_cards[i];
                        tips_cards.push(card);
                    }
                }


                //找数字牌
                for (let i = this._data.cards.length-1; i >= 0; i--) {

                    if(!_isExist(this._data.cards[i]) && this._data.cards[i].value == last_card.value && this._data.cards[i].type == 1){
                        isFind = true;
                        card = this._hand_cards[i];
                        tips_cards.push(card);
                    }
                }

                tips_cards.sort(function(a,b){
                    if(a.type && b.type){
                        if(a.type == 1 && b.type == 1){
                            return b.value - a.value;
                        }
                    }
                    return 0;
                });
        }
        if(only_check){
            return isFind;
        }
        if(isFind){
            var tip_card = tips_cards[this.tips_index];

            if(tip_card._data.value == 'color' || tip_card._data.value == 'plus4'){
                globalData.eventlister.fire('SHOW_SELECT_COLOR');
            }
            this.resetCard(tip_card);
            tip_card._data.selected = true;
            tip_card.updatePos();

            if(tips_cards.length - 1 > this.tips_index){
                this.tips_index++;
            }else{
                this.tips_index = 0;
            }
        }else{
            globalData.eventlister.fire('MESSAGE','无牌可出，摸牌跳过');
        }
        console.log(isFind,tips_cards)
        return isFind;
    },
    resetCard:function(except){
        for (let i = 0; i < this._hand_cards.length; i++) {
            if(this._hand_cards[i] != except){
                this._hand_cards[i].resetPos();
            }
        }
    },
    reset:function(){
        for (let i = 0; i < this._hand_cards.length; i++) {
            this._hand_cards[i].node.destroy();
        }
        this._hand_cards = [];
    },
    playCard:function(){

        var hasSelect = false;
        if(this._data && this._data.cards){
            for (let i = 0; i < this._data.cards.length; i++) {
                var card = this._data.cards[i];
                //选中的牌
                if(card.selected){
                    hasSelect = true;
                    //选颜色
                    if(card.value == 'color' || card.value == 'plus4'){
                        card.color = globalData.gameMgr.playerData.curSelectColor;
                    }
                    globalData.socketMgr.playCard(card);
                }
            }
            if(!hasSelect){
                globalData.eventlister.fire('MESSAGE', '请选中你要出的牌');
            }
        }
    }
});