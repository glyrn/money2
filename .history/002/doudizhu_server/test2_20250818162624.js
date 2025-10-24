function selectTips(playerData){

    console.log("上一手：",globalData.gameMgr.roomState.ctxCard);

    if(globalData.gameMgr.roomState.ctxCard.key > 0){

        for (let i = 1; i <= 13; i++) {
            var find_count = 0;
            var is_find = false;
            var select_card_list = [];
            for (let j = playerData.cards.length-1; j>=0 ; j--) {
                var card = playerData.cards[j];
                if(!is_find) {
                    // 3带1
                    if(globalData.gameMgr.roomState.ctxCard.type == 'AAAB') {

                        if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                            find_count++;
                            select_card_list.push(card);

                            if (find_count == 3) {
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
                    }else if(globalData.gameMgr.roomState.ctxCard.type == 'AAABB' ) {
                        //尝试3带2
                        if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                            find_count++;
                            select_card_list.push(card);
                            console.log("尝试3带2",find_count,card)
                            if (find_count == 3) {
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
                    }else if (globalData.gameMgr.roomState.ctxCard.type == 'AAAABC') {

                        if (card.value == globalData.gameMgr.roomState.ctxCard.key + i) {
                            find_count++;
                            select_card_list.push(card);

                            if (find_count == 4) {
                                var twoCards = [];

                                for(let i=playerData.cards.length-1;i>=0;i--){
                                    var __card = playerData.cards[i];
                                    //与备选中的牌不同 可以添加
                                    var isCanAdd = false;
                                    select_card_list.forEach(_card => {
                                        if (__card.value != _card.value) {
                                            isCanAdd = true;
                                        }
                                    })
                                    if(twoCards.length < 2 && isCanAdd){
                                        twoCards.push(__card);
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

                            //尝试找癞子补
                            if(select_card_list.length + remainLaiziCards.length >= globalData.gameMgr.roomState.ctxCard.len)
                            {
                                is_find = true;
                                let len = globalData.gameMgr.roomState.ctxCard.len - select_card_list.length;
                                for (var _i = 0; _i < len; _i++) {
                                    select_card_list.push(remainLaiziCards[_i]);
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
                console.log(select_card_list)
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
                //飞机类型 A AA AAA 
                if(globalData.gameMgr.roomState.ctxCard.type == 'AAAB' && globalData.gameMgr.roomState.ctxCard.len == 8 ||
                    globalData.gameMgr.roomState.ctxCard.type == 'AAABB' && globalData.gameMgr.roomState.ctxCard.len == 10 || 
                    globalData.gameMgr.roomState.ctxCard.type == 'AAABBB' && globalData.gameMgr.roomState.ctxCard.len == 6 ||
                    globalData.gameMgr.roomState.ctxCard.type == 'A' ||
                    globalData.gameMgr.roomState.ctxCard.type == 'AA' ||
                    globalData.gameMgr.roomState.ctxCard.type == 'AAA'
                )
                {
                    check_match_len = 4;
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
                let offset = isAllLaizi || ctxHasLaizi == false ? 1:0;
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
            }

            if(is_find){
                console.log(select_card_list);
                return true;
            }
        }

    }else{ // 刚开始
        return true;
    }

    return false;
}


let globalData = {
    gameMgr:{
        roomState:{
            // ctxCard:{
            //     type:"ABCDE",
            //     key:3, //34567
            //     len:5,
            // },
            ctxCard:{
                type:"AAA",
                key:13, //4455667788
                len:3,
                ctxPos:'left'
            }
            // ctxCard:{
            //     type:"AA",
            //     key:16, //4455667788
            //     len:2,
            //     ctxPos:'left'
            // }
        },
        posState:{
            laizi:{
                cards:[
                    {value:5},
                    // {value:4}
                ]
            },
            left:{
                ctxCards:[
                    {value:13},
                    {value:13},
                    {value:13},
                    // {value:3},
                    {value:13},
                ]
            }
        }
    }
};

let playerData = {
    cards:[{value:14},{value:14},{value:14},{value:5},{value:3}]
    // cards:[{value:3},{value:5},{value:4},{value:4},{value:4},{value:12},{value:12}]
    // cards:[{value:3},{value:6},{value:3},{value:7},{value:7},{value:3},{value:12},{value:4},{value:4},{value:12},{value:12}]
}

let isFind = selectTips(playerData);
console.log("找到可行方案：",isFind)