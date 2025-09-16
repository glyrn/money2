
const gameMgr = function(){

    var that = {};
    var _socketMgr = null;
    var _eventMgr = null;
    var _validateMgr = null

    that.setSocketMgr = function(socketMgr){
        _socketMgr = socketMgr
    }
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    }
    that.setValidateMgr = function(validateMgr){
        _validateMgr = validateMgr
    }

    that.posId =  '';//座位号
    that.cards = [];
    that.play_count = 0; //局数
    that.score_list = [];
    that.lossBeatNums = 0; //丢失心跳次数

        //房间状态
    that.roomState = {
        state: 0,//0准备状态  1打牌状态 2结束状态
        timeout: 30,
        gametime_remain:0,
    };

    //座位状态
    that.playerData = {
        left: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        },
        top: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        },
        right: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        },
        self: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        }
    };
    that.reset = function(){
        that.playerData = {
            left: {
                uid:0,
                state: 0,//0没人，1未准备 2准备
                cards: [],
                name: '',
                avatarUrl:'',
                score:500,
                score_offset:0,
                target_timer_value:0,
            },
            top: {
                uid:0,
                state: 0,//0没人，1未准备 2准备
                cards: [],
                name: '',
                avatarUrl:'',
                score:500,
                score_offset:0,
                target_timer_value:0,
            },
            right: {
                uid:0,
                state: 0,//0没人，1未准备 2准备
                cards: [],
                name: '',
                avatarUrl:'',
                score:500,
                score_offset:0,
                target_timer_value:0,
            },
            self: {
                uid:0,
                state: 0,//0没人，1未准备 2准备
                cards: [],
                name: '',
                avatarUrl:'',
                score:500,
                score_offset:0,
                target_timer_value:0,
            }
        };
    }
    that.checkBeat = function(){
        if(that._checkBeatId) clearInterval(that._checkBeatId);
        that._checkBeatId = setInterval(() => {
            that.lossBeatNums++;
            if(that.lossBeatNums >= 3){
                _eventMgr.fire('MESSAGE','游戏已断线！');
            }
        }, 5000);
    }

    that.updateHouseStatus = function (deskId, posId, state) {
        var pos = that.getPos(deskId, posId);
        if (pos) {
            pos.state = state;
        }
    }

    that.getPlayerData = function (posId) {
        return this.playerData[this.getPlayerDataKey(posId)];
    }
    that.setPlayerData = function(posId,data){
        this.playerData[this.getPlayerDataKey(posId)] = data;
    }
    that.reset = function(){
        that.playerData = {
        left: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        },
        top: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        },
        right: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        },
        self: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            name: '',
            avatarUrl:'',
            score:500,
            score_offset:0,
            target_timer_value:0,
        }
    }
    }
    that.getPlayerDataKey = function(targetPosId,selfPosId=null){
        if(selfPosId == null){
            selfPosId = this.playerData.self.posId ?? 0;
        }
        var map = {
            '0':{
                '0':'self',
                '1':"left",
                '2':"top",
                '3':'right',
            },
            '1':{
                '1':'self',
                '0':"right",
                '2':'left',
                '3':'top'
            },
            '2':{
                '2':'self',
                '0':'top',
                '1':'right',
                '3':'left',
            },
            '3':{
                '3':'self',
                '0':'left',
                '1':'top',
                '2':'right',
            }
        }
        return map[selfPosId.toString()][targetPosId.toString()];
    }


    that.resetRoomStatus = function () {
        that.posId = '';
        that.deskId = '';
        that.posState.self.state = 0;
        that.roomState.state = 0;
    }

    that.getSelectdCards = function(){
        return that.posState.self.cards.filter(function (card) {
            return card.selected;
        });
    }

    that.getCardIndex = function (pos, card) {
        var cards = this.posState[pos].cards;
        for (var i = 0, len = cards.length; i < len; i++) {
            var item = cards[i];
            if (card.value === item.value && card.type === item.type) {
                return i;
            }
        }
        return -1;
    }

    that.initCards = function (cards) {
        cards.forEach(function (cardGroup, index) {
            cardGroup.cards.forEach(function (card) {
                card.selected = false;
            });
            var posId = cardGroup.id;
            var redirection = that.getDirectionByPosId(posId);
            that.posState[redirection].cards = cardGroup.cards;
        });
    }

    // that.updateCtxInfo = function (socket,data) {
    //     var ctx = data;
    //     ctx.ctxPos = that.getDirectionByPosId(ctx.ctxPos);
    //     that.roomState.ctxPos = ctx.ctxPos;
    //     that.roomState.ctxScore = ctx.ctxScore;
    //     that.roomState.timeout = ctx.timeout;

    //     if (ctx.calledScores) {
    //         for (var key in ctx.calledScores) {
    //             if (ctx.calledScores.hasOwnProperty(key)) {
    //                 var posId = Number(key);
    //                 var direct = that.getDirectionByPosId(posId);
    //                 that.posState[direct].callScore = ctx.calledScores[key];

    //             }
    //         }
    //     }
    //     that.startTimer();
    // }

    // that.autoPlayCards = function () {
    //     if (that.roomState.ctxPos === 'self') {
    //         var len = that.posState.self.cards.length;
    //         var cards = that.roomState.ctxCard.ctxPos === 'self' ? [that.posState.self.cards[len-1]] : [];
    //         _socketMgr.getSocket().emit('PLAY_CARD', cards);
    //     }
    // }

    that.removeCards = function (pos, cards) {
        cards.forEach(function (card) {
            var index = that.getCardIndex(pos, card);
            if (index !== -1) {
                that.posState[pos].cards.splice(index, 1);
            }
        })
    }

    that.playCards = function () {
        if (that.roomState.state !== 2) {
            return;
        }
        if (that.roomState.ctxPos !== 'self') {
            return //layer.msg('未到出牌时间');
        }

        var cards = that.getSelectdCards();
        var ret;
        var card_values = cards.map(function(card){
            return card.value;
        })
        if(that.isLaizi == 0){
            ret = _validateMgr.validate_base(card_values);
        }else{
            var laizi_values = that.posState.laizi.cards.map(function(card){
                return card.value;
            })
            ret = _validateMgr.validate_laizi(card_values,laizi_values);
        }

        if (!ret.status) {

            _eventMgr.fire('PLAY_CARD_ERROR','你的牌不符合规则');
            return console.log('你的牌不符合规则');
        }

        _socketMgr.getSocket().emit('PLAY_CARD', cards);
    }

    return that;
}

export default gameMgr