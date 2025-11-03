import globalData from "../../globalData";

cc.Class({
    extends: cc.Component,
    name:"PlayerNode",
    properties: {
        // player_ready:cc.Node,
        nickname_label:cc.Label,
        card_prefab:cc.Prefab,
        masterIcon:cc.Node,
        lab_pass:cc.Node,
        // clock_node:cc.Node,
        img_avatar:cc.Sprite,
        lab_score:cc.Label,
        lab_ratio:cc.Label,
        // plane_ratio:cc.Node,
        img_net_lost:cc.Node,
        node_timer:cc.Node,
        img_avator_light:cc.Sprite,
        lab_timer:cc.Label,
        sp_flag_number0:cc.SpriteFrame,
        sp_flag_number1:cc.SpriteFrame,
        sp_flag_number2:cc.SpriteFrame,
        sp_flag_number3:cc.SpriteFrame,
        flag_number:cc.Sprite,
        lab_card_len:cc.Label;
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

        console.log("上一手：",globalData.gameMgr.roomState.ctxCard);

        if(globalData.gameMgr.roomState.ctxCard.key > 0){

            //获取当前癞子
            var curLaiziCards = [];
            //获取当前最大值牌
            var curNormalMaxCard = 0;
            let laiziCards = globalData.gameMgr.posState.laizi.cards;
            playerData.cards.forEach(_card=>{
                for(var laizi_card_key in laiziCards){
                    if(laiziCards[laizi_card_key].value == _card.value){
                        curLaiziCards.push(_card);
                    }
                }
                if(_card.value > curNormalMaxCard){
                    curNormalMaxCard = _card.value;
                }
            });

            for (let i = 1; i <= 13; i++) {
                var find_count = 0;
                var is_find = false;
                var select_card_list = [];
                for (let j = playerData.cards.length-1; j>=0 ; j--) {
                    var card = playerData.cards[j];
                    if(!is_find) {
                        // 3带1
                        if(globalData.gameMgr.roomState.ctxCard.type == 'AAAB' && globalData.gameMgr.roomState.ctxCard.len == 4) {

                            if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                                find_count++;
                                select_card_list.push(card);

                                if (find_count == 3 || find_count + curLaiziCards.length >= 3) {
                                    //补上癞子
                                    for(var __i=0;__i< 3 - find_count;__i++){
                                        select_card_list.push(curLaiziCards[__i])
                                    }

                                    var singleCard;
                                    playerData.cards.forEach(card => {
                                        select_card_list.forEach(_card => {
                                            if (card.value != _card.value) {
                                                singleCard = card;
                                            }
                                        })
                                    })
                                    if (singleCard) {
                                        select_card_list.push(singleCard);
                                        is_find = true;
                                    }
                                }
                            }else{
                                //纯3癞子
                                if(is_find == false && curLaiziCards.length >=3){
                                    for(var __i=0;__i< 3 - find_count;__i++){
                                        select_card_list.push(curLaiziCards[__i])
                                    }

                                    var singleCard;
                                    playerData.cards.forEach(card => {
                                        select_card_list.forEach(_card => {
                                            if (card.value != _card.value) {
                                                singleCard = card;
                                            }
                                        })
                                    })
                                    if (singleCard) {
                                        select_card_list.push(singleCard);
                                        is_find = true;
                                    }
                                }
                            }
                        // 3带2 
                        }else if(globalData.gameMgr.roomState.ctxCard.type == 'AAABB' && globalData.gameMgr.roomState.ctxCard.len == 5) {
                            //尝试3带2
                            if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                                find_count++;
                                select_card_list.push(card);
                                console.log("尝试3带2",find_count,card)
                                if (find_count == 3 || find_count + curLaiziCards.length >= 3) {
                                    //补上癞子
                                    for(var __i=0;__i< 3 - find_count;__i++){
                                        select_card_list.push(curLaiziCards[__i])
                                    }

                                    var checkCards = [];
                                    playerData.cards.forEach(__card => {
                                        //跳过AAA牌
                                        var isSkipCard = false;
                                        select_card_list.forEach(_card => {
                                            if (_card.value == __card.value) {
                                                isSkipCard = true;
                                            }
                                        });
                                        if (!isSkipCard) {
                                            checkCards.push(__card);
                                        }
                                    })
                                    var elementsCount = {};
                                    checkCards.forEach(_card => {
                                        var element = elementsCount[_card.value];
                                        if (element) {
                                            element.push(_card);
                                        } else {
                                            element = [_card];
                                        }
                                        elementsCount[_card.value] = element;
                                    });
                                    
                                    for (const k in elementsCount) {
                                        var element = elementsCount[k];
                                        //跳过AAA牌
                                        if (element.length > 1 && element[0].value != card.value) {
                                            for (let l = 0; l < 2; l++) {
                                                select_card_list.push(element[l]);
                                            }
                                            is_find = true;
                                            break;
                                        }
                                    }

                                }
                            }else{
                                //纯3癞子
                                if(is_find == false && curLaiziCards.length >=3){
                                    select_card_list = [];
                                    for(var __i=0;__i< 3;__i++){
                                        select_card_list.push(curLaiziCards[__i])
                                    }

                                    var checkCards = [];
                                    playerData.cards.forEach(__card => {
                                        //跳过AAA牌
                                        var isSkipCard = false;
                                        select_card_list.forEach(_card => {
                                            if (_card.value == __card.value) {
                                                isSkipCard = true;
                                            }
                                        });
                                        if (!isSkipCard) {
                                            checkCards.push(__card);
                                        }
                                    })
                                    var elementsCount = {};
                                    checkCards.forEach(_card => {
                                        var element = elementsCount[_card.value];
                                        if (element) {
                                            element.push(_card);
                                        } else {
                                            element = [_card];
                                        }
                                        elementsCount[_card.value] = element;
                                    });
                                    
                                    for (const k in elementsCount) {
                                        var element = elementsCount[k];
                                        //跳过AAA牌
                                        if (element.length > 1 && element[0].value != card.value) {
                                            for (let l = 0; l < 2; l++) {
                                                select_card_list.push(element[l]);
                                            }
                                            is_find = true;
                                            break;
                                        }
                                    }
                                }
                            }
                            // 4带2
                        }else if (globalData.gameMgr.roomState.ctxCard.type == 'AAAABC' && globalData.gameMgr.roomState.ctxCard.len == 6) {

                            if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                                find_count++;
                                select_card_list.push(card);

                                if (find_count == 4) {
                                    var twoCards = [];

                                    for(let i=playerData.cards.length-1;i>=0;i--){
                                        var card = playerData.cards[i];
                                        //与备选中的牌不同 可以添加
                                        var isCanAdd = false;
                                        select_card_list.forEach(_card => {
                                            if (card.value != _card.value) {
                                                isCanAdd = true;
                                            }
                                        })
                                        if(twoCards.length < 2 && isCanAdd){
                                            twoCards.push(card);
                                        }
                                    }
                                    if (twoCards.length == 2) {
                                        select_card_list.push(twoCards[0]);
                                        select_card_list.push(twoCards[1]);
                                        is_find = true;
                                    }
                                }
                            }
                        
                            
                       //顺子
                    }else if(globalData.gameMgr.roomState.ctxCard.type == "ABCDE" ||
                             globalData.gameMgr.roomState.ctxCard.type == 'AABBCC'
                    ){
                        console.log("检查顺子")
                        function findCardByValue(value){
                            var ret = null;
                            playerData.cards.forEach(_card => {
                                if(_card.value == value){
                                    ret = _card;
                                }
                            });
                            return ret;
                        }
                        function findTwoCardByValue(value){
                            var ret = [];
                            playerData.cards.forEach(_card => {
                                if(_card.value == value){
                                    ret.push(_card);
                                }
                            });
                            return ret;
                        }
                        //获取当前癞子
                        var curLaiziCards = [];
                        let laiziCards = globalData.gameMgr.posState.laizi.cards;
                        playerData.cards.forEach(_card=>{
                            for(var laizi_card_key in laiziCards){
                                if(laiziCards[laizi_card_key].value == _card.value){
                                    curLaiziCards.push(_card);
                                }
                            }
                        });
                        //单顺子
                        if(globalData.gameMgr.roomState.ctxCard.type == "ABCDE"){
                            if(card.value > globalData.gameMgr.roomState.ctxCard.key){
                                for (let k = 0; k < globalData.gameMgr.roomState.ctxCard.len; k++) {
                                    //单顺子
                                    var tcard = findCardByValue(parseInt(card.value)+k)
                                    if(tcard && tcard.value != 15 && tcard.value != 16 && tcard.value != 17){
                                        select_card_list.push(tcard);
                                    }
                                }
                            }
                        //双顺子
                        }else if(globalData.gameMgr.roomState.ctxCard.type == 'AABBCC'){
                            let len = globalData.gameMgr.roomState.ctxCard.len / 2;
                            if(card.value > globalData.gameMgr.roomState.ctxCard.key){
                                for (let k = 0; k < len; k++) {
                                    //找对
                                    var _twoCards = findTwoCardByValue(parseInt(card.value)+k);
                                    if(_twoCards[0]) select_card_list.push(_twoCards[0]);
                                    if(_twoCards[1]) select_card_list.push(_twoCards[1]);
                                }
                            }
                        }
                        if(select_card_list.length == globalData.gameMgr.roomState.ctxCard.len){
                            is_find = true;
                            break;
                        }else{
                            //获取未使用的癞子
                            let remainLaiziCards = [];
                            curLaiziCards.forEach(function(__card){
                                var isExist = false;
                                select_card_list.forEach(function(_card){
                                    if(_card.value == __card.value){
                                        isExist = true;
                                    }
                                })
                                if(isExist==false){
                                    remainLaiziCards.push(__card);
                                }
                            })

                            //最多找补量
                            var head_gap_len = 14 - curNormalMaxCard;
                            console.log("head_gap_len:",head_gap_len)
                            //尝试找癞子补
                            if(select_card_list.length + remainLaiziCards.length >= globalData.gameMgr.roomState.ctxCard.len)
                            {
                                let len = globalData.gameMgr.roomState.ctxCard.len - select_card_list.length;
                                if(len <= head_gap_len && len > 0){
                                    is_find = true;
                                    for (var _i = 0; _i < len; _i++) {
                                        select_card_list.push(remainLaiziCards[_i]);
                                    }
                                }
                                
                            }else{
                                select_card_list = [];
                            }
                        }
                    //纯多张
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
            
            //顺子和3带2 尝试找AAAA(炸弹)
            var select_card_list = [];
            if((globalData.gameMgr.roomState.ctxCard.type == "ABCDE" || 
                globalData.gameMgr.roomState.ctxCard.type == 'AAAB' || 
                globalData.gameMgr.roomState.ctxCard.type == 'AAABB' || 
                globalData.gameMgr.roomState.ctxCard.type == 'AAABBB' || 
                globalData.gameMgr.roomState.ctxCard.type == 'AABBCC' || 
                globalData.gameMgr.roomState.ctxCard.type == 'A' ||
                globalData.gameMgr.roomState.ctxCard.type == 'AA' ||
                globalData.gameMgr.roomState.ctxCard.type == 'AAA' ||
                globalData.gameMgr.roomState.ctxCard.type == 'AAAA'
            ) && is_find == false){
                console.log("尝试找AAAA炸弹：");

                let laiziCards = globalData.gameMgr.posState.laizi.cards;

                var check_card_map = {};
                playerData.cards.forEach(_card=>{
                    if(_card.value <= 15){
                        if(!check_card_map[_card.value]){
                            check_card_map[_card.value] = 0;
                        }
                        check_card_map[_card.value]++;
                    }
                });

                let ctxCards = globalData.gameMgr.posState[globalData.gameMgr.roomState.ctxCard.ctxPos].ctxCards;
                let ctxHasLaizi = false;
                let ctxLaiziNum = 0;
                ctxCards.forEach(_card=>{
                    for(var laizi_card_key in laiziCards){
                        if(laiziCards[laizi_card_key].value == _card.value){
                            ctxHasLaizi = true;
                            ctxLaiziNum++;
                        }
                    }
                });
                let isAllLaizi = ctxLaiziNum == ctxCards.length;

                //对手出炸弹 判断是否AAAA硬炸
                if(globalData.gameMgr.roomState.ctxCard.type == 'AAAA'){
                    //是硬炸
                    if(ctxHasLaizi == false){
                        for (const value in check_card_map) {
                            if(check_card_map[value] == 4 && value > globalData.gameMgr.roomState.ctxCard.key){
                                is_find = true;

                                playerData.cards.forEach(_card=>{
                                    if(_card.value == value){
                                        select_card_list.push(_card);
                                    }
                                });
                                return true;
                            }
                        }
                    }
                //不是炸弹的其他类型，A AA AAA 连对 顺子等等
                }else{
                    for (const value in check_card_map) {
                        if(check_card_map[value] == 4 && value > globalData.gameMgr.roomState.ctxCard.key){
                            is_find = true;

                            playerData.cards.forEach(_card=>{
                                if(_card.value == value){
                                    select_card_list.push(_card);
                                }
                            });
                            break;
                        }
                    }
                }

                //尝试找软炸弹
                if(is_find == false){
                    console.log("尝试找软炸弹：");

                    select_card_list = [];
                    var hasAAA = false;
                    var hasLaizi = false;
                    var curLaiziCards = [];
                    
                    let check_match_len = globalData.gameMgr.roomState.ctxCard.len;
                    var isOffset = true;
                    //飞机类型 A AA AAA 
                    if(globalData.gameMgr.roomState.ctxCard.type == 'AAABBB' && check_match_len == 6 ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AAAB' && check_match_len == 8 ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AAABBB' && check_match_len == 9 ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AAABB' && check_match_len == 10 || 
                        globalData.gameMgr.roomState.ctxCard.type == 'AAABB' && check_match_len == 12 ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AAAB' && check_match_len == 12 ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AAABB' && check_match_len == 15 ||
                        globalData.gameMgr.roomState.ctxCard.type == 'A' ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AA' ||
                        globalData.gameMgr.roomState.ctxCard.type == 'AAA'
                    )
                    {
                        check_match_len = 4;
                        isOffset = false;
                    }
                    playerData.cards.forEach(_card=>{
                        for(var laizi_card_key in laiziCards){
                            if(laiziCards[laizi_card_key].value == _card.value){
                                hasLaizi = true;
                                curLaiziCards.push(_card);
                                //剔除癞子 只算普通AAA
                                delete check_card_map[_card.value];
                            }
                        }
                    });
                    //如果对手是纯癞子或硬炸弹 那么尝试找+1的软炸
                    let offset = (isAllLaizi || ctxHasLaizi == false) && isOffset ? 1:0;
                    for (const value in check_card_map) {
                        console.log("检查AAA：",value , globalData.gameMgr.roomState.ctxCard.key)

                        if((!isAllLaizi && value > Math.ceil(globalData.gameMgr.roomState.ctxCard.key)) || isAllLaizi ||
                            globalData.gameMgr.roomState.ctxCard.type == 'A' ||
                            globalData.gameMgr.roomState.ctxCard.type == 'AA' || 
                            globalData.gameMgr.roomState.ctxCard.type == 'AAA'){
                            hasAAA = true;
                            //癞子+AAA的数量 等于 出牌数量
                            if(hasAAA && hasLaizi && curLaiziCards.length + check_card_map[value] >= check_match_len + offset){
                                playerData.cards.forEach(_card=>{
                                    if(_card.value == value){
                                        select_card_list.push(_card);
                                    }
                                });
                                for(var i=0;i<check_match_len - check_card_map[value] + offset;i++){
                                    select_card_list.push(curLaiziCards[i]);
                                }
                                is_find = true;
                                break;
                            }
                        }
                    }
                    //最后试下找自己的纯软炸
                    if(is_find == false && curLaiziCards.length >= check_match_len){
                        for (let i = 0; i < check_match_len; i++) {
                            select_card_list.push(curLaiziCards[i]);
                        }
                        is_find = true;
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
                }
            }
           
            // 都找不到就找一下王炸
            var select_card_list = [];
            playerData.cards.forEach(card=>{
                if (card.value == 16 || card.value == 17){
                    select_card_list.push(card);
                }
            })
            if(select_card_list.length == 2){
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
        this.node.active = playerData.state > 0;
        // 准备状态
        // this.player_ready.active = playerData.state === 2 && (roomState.state === 0 || roomState.state === 3);

        var that = this;

        this.nickname_label.string = globalData.utils.subStringResult(playerData.name,7);
        this.lab_score.string = playerData.score + '分';
        this.lab_ratio.string = this.flag == 'self' ? playerData.ratio + '倍' : "";
        if(this._avatarUrl != playerData.avatarUrl && playerData.avatarUrl != null && playerData.avatarUrl != '')
        {
            // var avatorUrl;
            // if(window.defines.serverUrl == 'localhost:8001'){
            //     avatorUrl = this._avatarUrl;
            // }else{
            //     avatorUrl = 'http://42.51.37.98:8001/avator/'+playerData.uid+'.jpg'
            // }

            const exts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.svg'];
            const ext = playerData.avatarUrl.slice(playerData.avatarUrl.lastIndexOf('.'));
            const is_image = exts.includes(ext.toLowerCase());
            var url = is_image ? playerData.avatarUrl : playerData.avatarUrl + '?aa=aa.jpg';
            
            cc.loader.load(url, function(err,img){
                if(!err){
                    that._avatarUrl = playerData.avatarUrl;
                    that.img_avatar.spriteFrame = new cc.SpriteFrame(img);
                }
            });
        }

        this.masterIcon.active = playerData.isDizhu;
        if(playerData.callScore >= 0 && roomState.state == 1){
            this.flag_number.node.active = true;
            this.flag_number.spriteFrame = this['sp_flag_number'+playerData.callScore];
        }else{
            this.flag_number.node.active = false;
        }
        
        this.lab_pass.active = playerData.isPass;
        // this.plane_ratio.active = this.flag == 'self';
        this.img_net_lost.active = playerData.connect_state == 0;

        this.renderClock(roomState);
    },

    renderClock(roomState){
        var now = Date.parse(new Date()) / 1000;
        if(this.flag == roomState.ctxPos){
            this.node_timer.active = true;
            var time_value = Math.max(0,roomState.server_time + roomState.timeout - now);
            this.lab_timer.string = time_value;
            this.img_avator_light.fillRange = - (time_value/roomState.timeout);
        }else {
            this.node_timer.active = false;
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

        let total_width = playerData.cards.length * 56;
        // let total_height = playerData.cards.length * 16;
        for (let i = 0; i < playerData.cards.length; i++) {

            let card = playerData.cards[i];

            if(flag == 'self'){
                this._cardNodeList[i].setContentSize(148,200);
                this._cardNodeList[i].setRotation(0);
                this._cardNodeList[i].position = cc.v2( 28 + i * 56+base_pos.x - total_width/2,base_pos.y)
            }else if(flag == 'left'){
                this._cardNodeList[i].setContentSize(148*0.5,200*0.5);
                // this._cardNodeList[i].setRotation(90);
                this._cardNodeList[i].position = cc.v2(base_pos.x,base_pos.y /*- total_height/2 + i*16*/)
            }else if(flag == 'right'){
                this._cardNodeList[i].setContentSize(148*0.5,200*0.5);
                // this._cardNodeList[i].setRotation(90);
                this._cardNodeList[i].position = cc.v2(base_pos.x,base_pos.y /*+ total_height/2 - i*16*/)
            }

            if(flag == "self")
            {
                active = !(roomState.state === 3 && playerData.state === 2);
                //旁观者不能看自身牌
                if(globalData.gameMgr.is_ob){
                    this._cardNodeList[i].getComponent('Card').render(flag,{value:0,type:0},playerData.isPass);
                }else{
                    this._cardNodeList[i].getComponent('Card').render(flag,card,playerData.isPass);
                }
            }else{
                active = true;
                this._cardNodeList[i].getComponent('Card').render(flag,roomState.state === 3 ? card : {value:0,type:0});
            }
            this._cardNodeList[i].active = active;
        }
        //-------------------------------------------------------------

        //出牌
        let gap = 42;
        let total_out_width = playerData.ctxCards.length * gap;
        for(var i=0;i<this._cardOutList.length;i++){
            this._cardOutList[i].active = false;
        }
        
        for (let i = 0; i < playerData.ctxCards.length; i++) {
            let card = playerData.ctxCards[i];

            this._cardOutList[i].position = cc.v2(21 + i * gap+base_out_pos.x - total_out_width /2,0+base_out_pos.y)
            this._cardOutList[i].active = !playerData.isPass;
            this._cardOutList[i].getComponent('Card').render('none',card);
        }
    },
    //检测是否有特效牌型
    checkEffectCardAnim(playerData){

        //轮到自己
        if(globalData.gameMgr.roomState.ctxPos === 'self'){
       
            var select_cards = [];
            for (let i = 0; i < playerData.cards.length; i++) {
                if(playerData.cards[i].selected){
                    select_cards.push(playerData.cards[i])
                }
            }
            globalData.socketMgr.checkPlayCard(select_cards);
        }
    },
});
