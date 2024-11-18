import globalData from "../../globalData";

cc.Class({
    extends: cc.Component,
    name:"PlayerNode",
    properties: {
        player_ready:cc.Node,
        nickname_label:cc.Label,
        card_prefab:cc.Prefab,
        masterIcon:cc.Node,
        lab_pass:cc.Node,
        clock_node:cc.Node,

        lab_timer:cc.Label,
        img_avatar:cc.Sprite,
        lab_score:cc.Label,
        lab_ratio:cc.Label,
        plane_ratio:cc.Node,
    },

    onLoad () {

        //手牌
        this._cardNodeList = []

        for(var i=0;i<20;i++){
            var card_node = cc.instantiate(this.card_prefab);
            card_node.parent = this.node.parent
            card_node.active = false;
            this._cardNodeList[i] = card_node;
        }

        //出牌
        this._cardOutList = []

        for(var i=0;i<20;i++){
            var card_node = cc.instantiate(this.card_prefab);
            card_node.parent = this.node.parent
            card_node.active = false;
            this._cardOutList[i] = card_node;
        }

        // 指左侧卡牌锚点到右侧相邻卡牌边缘的距离
        this.CARD_DISTANCE = 24;
    },
    cleanPass(){
        this.lab_pass.active = false;
    },
    onSelectCardEnd(hasTouchCard){
        for (let card of this._cardNodeList){
            let ctrl = card.getComponent("Card");
            if(hasTouchCard){
                if (ctrl.touched){
                    ctrl.selected = !ctrl.selected;
                }
            }else{
                ctrl.selected = false;
            }
            ctrl.touched = false;
        }
    },

    selectLastOne(playerData){

        var last_card = playerData.cards[playerData.cards.length-1];
        if(last_card){
            playerData.cards.forEach(card=>{
                card.selected = false;
            });
            last_card.selected = true;
            for (let i = 0; i < playerData.cards.length; i++) {
                this._cardNodeList[i].getComponent('Card').renderSelectCard()
            }
        }
    },
    selectTips(playerData,isShowTips){

        if(globalData.gameMgr.roomState.ctxCard.key > 0){

            for (let i = 1; i <= 13; i++) {
                var find_count = 0;
                var is_find = false;
                var select_card_list = [];
                for (let j = playerData.cards.length-1; j>=0 ; j--) {
                    var card = playerData.cards[j];
                    if(!is_find) {
                        // 3带1
                        if(globalData.gameMgr.roomState.ctxCard.type == 'AAAB'){

                            if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                                find_count++;
                                select_card_list.push(card);

                                if (find_count == globalData.gameMgr.roomState.ctxCard.len-1) {
                                    var singleCard;
                                    playerData.cards.forEach(card=>{

                                        select_card_list.forEach(_card=>{
                                            if(card.value != _card.value){
                                                singleCard = card;
                                            }
                                        })
                                    })
                                    if(singleCard){
                                        select_card_list.push(singleCard);
                                        is_find = true;
                                    }
                                }
                            }
                        //多张
                        }else if(globalData.gameMgr.roomState.ctxCard.type == 'A' ||
                                globalData.gameMgr.roomState.ctxCard.type == 'AA' ||
                                globalData.gameMgr.roomState.ctxCard.type == 'AAA' ||
                                globalData.gameMgr.roomState.ctxCard.type == 'AAAA'){

                            if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                                find_count++;
                                select_card_list.push(card);

                                if (find_count == globalData.gameMgr.roomState.ctxCard.len) {
                                    is_find = true;
                                }
                            }
                        }
                    }
                }

                if(is_find){
                    playerData.cards.forEach(card=>{
                        card.selected = false;
                    });
                    select_card_list.forEach(card=>{
                        card.selected = true;
                    });
                    for (let i = 0; i < playerData.cards.length; i++) {
                        this._cardNodeList[i].getComponent('Card').renderSelectCard()
                    }
                    return true;

                }else if(globalData.gameMgr.roomState.ctxCard.ctxPos === 'self'){ //没有pass
                    this.selectLastOne(playerData);
                    return true;
                }
            }
        }else{ // 刚开始
            this.selectLastOne(playerData);
            return true;
        }

        if(isShowTips){
            globalData.eventlister.fire('MESSAGE','不知道打啥好~');
        }
        return false;
    },

    checkSelectCard(beginPos, endPos, isBegin){

        var list = this._getActiveCardNodeList();
        const len = list.length;
        if (isBegin){
            for (let i=len-1; i>=0; i--){
                let card = list[i];
                if (card.getBoundingBox().contains(beginPos)){
                    card.getComponent('Card').touched = true;
                    return true;
                }
            }
        } else {
            let w = Math.max(1, Math.abs(beginPos.x - endPos.x));
            let h = Math.max(1, Math.abs(beginPos.y - endPos.y));
            let x = Math.min(beginPos.x, endPos.x);
            let y = Math.min(beginPos.y, endPos.y);
            let touchRect = cc.rect(x, y, w, h);

            for (let i=len-1; i>=0; i--){
                let card = list[i];
                if (card.getBoundingBox().contains(touchRect)){
                    card.getComponent('Card').touched = true;
                    return true;
                }
            }
        }
        return false;
    },
    checkSelectCardReverse(beginPos, endPos){
        let p1 = beginPos.x < endPos.x ? beginPos : endPos;
        let w = Math.abs(beginPos.x - endPos.x);
        let h = Math.abs(beginPos.y - endPos.y);
        let rect = cc.rect(p1.x, p1.y, w, h);

        var list = this._getActiveCardNodeList();
        const len = list.length;
        for (let i=len-1; i>=0; i--){
            let card = list[i];
            if (!cc.Intersection.rectRect(card.getBoundingBox(), rect)){
                card.getComponent('Card').touched = false;
            } else {
                // 在矩形框内但是被旁边但牌压着也不算选中
                // 最后一张（最上面但）需要特殊处理
                if (p1.x - card.x >= this.CARD_DISTANCE && i != len - 1){
                    card.getComponent('Card').touched = false;
                }
            }
        }
    },
    checkMissSelectCard(){
        var list = this._getActiveCardNodeList();
        const len = list.length;
        var leftIdx = -1;
        var rightIdx = -1;

        for (let i = 0; i < len; i++) {
            let card = list[i];
            if(card.getComponent('Card').touched && leftIdx ==-1){
                leftIdx = i;
            }
            if(card.getComponent('Card').touched){
                rightIdx = i;
            }
        }
        for (let i = 0; i < len; i++) {
            if(i>=leftIdx && i<=rightIdx){
                list[i].getComponent('Card').touched = true;
            }
        }
    },
    _getActiveCardNodeList(){
        var list = [];
        for (let i = 0; i < this._cardNodeList.length; i++) {
            if(this._cardNodeList[i].active){
                list.push(this._cardNodeList[i]);
            }
        }
        return list;
    },
    render(playerData,roomState){

        this.node.position = cc.v2(0,0)
        this.node.active = playerData.state > 0;
        // 准备状态
        this.player_ready.active = playerData.state === 2 && (roomState.state === 0 || roomState.state === 3);

        this.nickname_label.string = playerData.name;
        this.lab_score.string = playerData.score + '分';
        this.lab_ratio.string = playerData.ratio + '倍';
        if(this._avatarUrl != playerData.avatarUrl && playerData.avatarUrl != null && playerData.avatarUrl != '')
        {
            var that = this;
            var avatorUrl;
            if(window.defines.serverUrl == 'localhost:8001'){
                avatorUrl = this._avatarUrl;
            }else{
                avatorUrl = 'http://42.51.37.98:8001/avator/'+playerData.uid+'.jpg'
            }
            cc.loader.load(avatorUrl, function(err,img){
                if(!err){
                    that._avatarUrl = playerData.avatarUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }

        this.masterIcon.active = playerData.isDizhu;
        this.lab_pass.active = playerData.isPass;
        this.plane_ratio.active = this.flag == 'self';

        this.renderClock(roomState);
    },

    renderClock(roomState){
        if(this.flag == roomState.ctxPos && this.flag != 'self'){
            this.clock_node.active = true;
            this.lab_timer.string = roomState.timeout;
        }else {
            this.clock_node.active = false;
        }
    },
    renderCard(flag,playerData,roomState) {

        let active;
        let base_pos = cc.find('card_pos',this.node.parent).position;
        let base_out_pos = cc.find('card_out_pos',this.node.parent).position;
        this.flag = flag;

        //手牌
        for(var i=0;i<this._cardNodeList.length;i++){
            this._cardNodeList[i].active = false;
        }

        let total_width = playerData.cards.length * 48;
        let total_height = playerData.cards.length * 20;
        for (let i = 0; i < playerData.cards.length; i++) {

            let card = playerData.cards[i];

            if(flag == 'self'){
                this._cardNodeList[i].position = cc.v2(i * 48+base_pos.x - total_width/2,base_pos.y)
            }else{
                this._cardNodeList[i].position = cc.v2(base_pos.x,base_pos.y + total_height/2 - i*20)
            }

            if(flag == "self")
            {
                active = !(roomState.state === 3 && playerData.state === 2);
                this._cardNodeList[i].getComponent('Card').render(flag,card,playerData.isPass);
            }else{
                active = true;
                this._cardNodeList[i].getComponent('Card').render(flag,roomState.state === 3 ? card : {value:0,type:0});
            }
            this._cardNodeList[i].active = active;
        }
        //-------------------------------------------------------------

        //出牌
        for(var i=0;i<this._cardOutList.length;i++){
            this._cardOutList[i].active = false;
        }

        for (let i = 0; i < playerData.ctxCards.length; i++) {
            let card = playerData.ctxCards[i];

            let gap = 30;
            this._cardOutList[i].position = cc.v2(i * gap+base_out_pos.x,0+base_out_pos.y)
            this._cardOutList[i].active = !playerData.isPass;
            this._cardOutList[i].getComponent('Card').render('none',card);
        }
    },
});
