
const gameMgr = function(){

    var that = {};
    var _socketMgr = null;
    var _eventMgr = null;
    // var _validateMgr = null

    that.setSocketMgr = function(socketMgr){
        _socketMgr = socketMgr
    }
    that.setEventlister = function(eventMgr){
        _eventMgr = eventMgr
    }
    // that.setValidateMgr = function(validateMgr){
    //     _validateMgr = validateMgr
    // }

    that.where = 0;//0登录界面 1大厅 2房间,
    that.posId =  '';//座位号
    that.deskId= '';//桌号
    that.deskName = '';//桌子名
    that.desks= [];
    that.client= '';
    that.cards = [];
    that.isLaizi = 0;//是否癞子玩法
    that.base_score = 1;//底分
    that.play_index = 0;
    that.play_count = 0; //局数
    that.score_list = [];
    that.lossBeatNums = 0; //丢失心跳次数

        //房间状态
    that.roomState= {
            state: 0,//0准备状态 1叫分状态 2打牌状态 3结束状态
            ctxPos: '', //当前该哪个座位谁出牌或叫分 left right or self
            ctxCard: { //上家玩家的牌型
                len: 0,
                key: '',
                type: '',
                ctxPos: ''
            },
            ctxScore: [],
            timeout: 15,
        };

    //座位状态
    that.posState = {
        top: {
            cards: []
        },
        laizi:{
            cards: []
        },
        left: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            ctxCards: [],
            isPass: false,
            isDizhu: false,
            callScore: -1,
            name: '游客',
            avatarUrl:'',
            score:500,
            ratio:0,
        },
        right: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            ctxCards: [],
            isPass: false,
            isDizhu: false,
            callScore: -1,
            name: '游客',
            avatarUrl:'',
            score:500,
            ratio:0,
        },
        self: {
            uid:0,
            state: 0,//0没人，1未准备 2准备
            cards: [],
            ctxCards: [],
            isPass: false,
            isDizhu: false,
            callScore: -1,
            name: '',
            avatarUrl:'',
            score:500,
            ratio:0,
        }
    };
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

    that.getPos = function (deskId, posId) {
        var desk = that.getDesk(deskId);
        if (desk) {
            for (var i = 0, len = desk.positions.length; i < len; i++) {
                var pos = desk.positions[i];
                if (pos.posId === posId) {
                    return pos;
                }
            }
        }
        return null;
    }

    that.getDesk = function (deskId) {
        for (var i = 0, len = that.desks.length; i < len; i++) {
            var desk = that.desks[i];
            if (desk.deskId === deskId) {
                return desk;
            }
        }
        return null;
    }

    that.getDirectionByPosId = function(posId) {
        var mapping = {
            0: {
                0: 'self',
                1: 'right',
                2: 'left',
                3: 'top',
            },
            1: {
                1: 'self',
                2: 'right',
                0: 'left',
                3: 'top',
            },
            2: {
                2: 'self',
                0: 'right',
                1: 'left',
                3: 'top',
            }
        }
        if(!that.posId){
            that.posId = 0;
        }
        return mapping[that.posId][posId];
    }

    that.updatePosStatus = function (posId, state, name,avatarUrl,score,uid) {
        var direct = that.getDirectionByPosId(posId);
        if(that.posState[direct]){
            that.posState[direct].state = state;
            if (name) {
                that.posState[direct].name = name;
            }
            if(avatarUrl){
                that.posState[direct].avatarUrl = avatarUrl;
            }
            if(score){
                that.posState[direct].score = score;
            }
            if(uid){
                that.posState[direct].uid = uid;
            }
            that.posState[direct].isDizhu = false;
            that.startTimer(false);
        }
    }

    that.startTimer = function () {
        // if(that._timer) clearInterval(that._timer);
        // let timerFunc = function () {
        //     //游戏中
        //     if(that.roomState.state == 1 || that.roomState.state == 2) {
        //         var now = Date.parse(new Date()) / 1000;
        //         _eventMgr.fire("UPDATE_TIMER");
        //         _eventMgr.fire("UPDATE_TIMER1");

        //         if (that.roomState.server_time + that.roomState.timeout - now <= 0) {
        //             clearInterval(that._timer);
        //             if (that.roomState.state == 2 && that.roomState.ctxPos === 'self') {
        //                 _eventMgr.fire('auto_play_card')
        //             }else if(that.roomState.state == 1 && that.roomState.ctxPos === 'self'){
        //                 //不抢
        //                 _socketMgr.call_score(0);
        //             }
        //         }
        //     }
        // }
        // that._timer = setInterval(timerFunc, 1000);
        // timerFunc();
        // return that._timer;
    }

    that.resetRoomStatus = function () {
        that.where = 1;
        that.posId = '';
        that.deskId = '';
        that.posState.self.state = 0;
        that.roomState.state = 0;
        that.posState.left.callScore = -1;
        that.posState.right.callScore = -1;
        that.posState.self.callScore = -1;
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

    that.callScore = function (socket,score) {
        that.posState.self.callScore = score;
        that.roomState.ctxPos = '';
        socket.emit('CALL_SCORE', { score: score });
    }

    that.updateCtxInfo = function (socket,data) {
        var ctx = data;
        ctx.ctxPos = that.getDirectionByPosId(ctx.ctxPos);
        that.roomState.ctxPos = ctx.ctxPos;
        that.roomState.ctxScore = ctx.ctxScore;
        that.roomState.timeout = ctx.timeout;
        that.roomState.server_time = data.server_time;

        if (ctx.calledScores) {
            for (var key in ctx.calledScores) {
                if (ctx.calledScores.hasOwnProperty(key)) {
                    var posId = Number(key);
                    var direct = that.getDirectionByPosId(posId);
                    that.posState[direct].callScore = ctx.calledScores[key];

                }
            }
        }
        that.startTimer();
    }

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
        //上一家出牌是自己  轮到自己不能pass
        console.log("playCards:"+cards.length);
        if(cards.length == 0){
            _eventMgr.fire('MESSAGE','轮到你出牌了');
            return;
        }
        _socketMgr.playCards(cards);
    }

    return that;
}

export default gameMgr