const fs = require('fs');
const request = require('request')
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http);
app.use(express.static(`${__dirname}/../uno_client`));
app.use(express.static(`${__dirname}/../uno_client/avator`));
// 设置跨域头部
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

app.get('/', function (req, res) {
  res.sendFile(`${__dirname}/index.html`);
});
function GameServer() {

  this.desks = this.createDeskList(50);
  this.clients = {};

  this.onlineUser = {}
}
const proto = {

  time:function (){
    return (new Date()).toLocaleTimeString();
  },
//获取 0-num范围的随机整数
  getRandomNumForRange:function(num) {
    return Math.round(Math.random() * num);
  },
  //创建牌
  createCards:function(){
    const shuffle = function (arr) {
      var result = [], random;
      while(arr.length>0){
        random = Math.floor(Math.random() * arr.length);
        result.push(arr[random])
        arr.splice(random, 1)
      }
      return result;
    };

    const cards = [];
    for (let c = 1; c <= 4; c++) {
      for (let j = 0; j < 2; j++) {
        for (let i = 1; i <= 9; i++) {
          cards.push({type:1,value:i,color:c})
        }
      }
      cards.push({type:1,value:0,color:c})
      cards.push({type:2,value:'stop',color:c});
      cards.push({type:2,value:'stop',color:c});
      cards.push({type:2,value:'turn',color:c});
      cards.push({type:2,value:'turn',color:c});
      cards.push({type:2,value:'plus2',color:c});
      cards.push({type:2,value:'plus2',color:c});
    }
    for (let i = 0; i < 4; i++) {
      cards.push({type:2,value:'plus4',color:0});
      cards.push({type:2,value:'color',color:0});
    }
    return shuffle(cards);
  },
  //查找数字牌
  getNumberCard:function(cards){

    const _while = function (cards) {
      const card = cards.shift();
      if (card.type === 2) {
        cards.push(card);
        return _while(cards);
      } else {
        return card;
      }
    };
    return _while(cards);
  },
  createDeskList:function(n) {
    n = n || 50;
    const ret = [];
    for (let i = 1; i <= n; i++) {
      const desk = {
        name:'',
        deskId: i,
        state: 0,
        positions: [],
        play_mode:-1,
        play_count:0,
        base_score:100,
        play_index:1,
        cur_posId:0,
      }
      for (let j = 0; j < 4; j++) {
        desk.positions.push({
          uid:0,
          posId: j,
          state: 0,
          name: '',
          avatorUrl: '',
          score:0,
          socket:null,
        })
      }
      ret.push(desk);
    }
    return ret;
  },

  checkUserLogin(uid) {
    return this.clients[uid];
  },
  getDeskId:function(socket){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj.socket && userObj.socket.id == socket.id) {
          return this.desks[i].deskId;
        }
      }
    }
  },
  getDesk:function(socket){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj.socket && userObj.socket.id == socket.id) {
          return this.desks[i];
        }
      }
    }
  },
  getDeskById:function(roomId){
    for (let i = 0; i < this.desks.length; i++) {
      if(this.desks[i].deskId == roomId){
        return this.desks[i];
      }
    }
  },
  getUid:function(socket){
    for (const uid in this.clients) {
      if(this.clients[uid] && this.clients[uid].id == socket.id){
        return uid;
      }
    }
  },
  getPosId:function(socket){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj.socket && userObj.socket.id == socket.id) {
          return userObj.posId;
        }
      }
    }
  },
  getNextPosId:function(socket,curPosId){
    var desk = this.getDesk(socket)
    var nextPosId;
    if(desk.direct == 1){ //顺时针方向
      if(curPosId + 1 >= desk.ready_count){
        nextPosId = 0;
      }else{
        nextPosId = curPosId + 1;
      }
    }else if(desk.direct == 0){ //逆时针
      if(curPosId - 1 >= 0){
        nextPosId = curPosId - 1;
      }else{
        nextPosId = desk.ready_count - 1;
      }
    }
    return nextPosId;
  },
  getDeskByName:function(deskName) {
    let findDesk;
    for (let i = 0, len = this.desks.length; i < len; i++) {
      let desk = this.desks[i];
      if (desk.name == deskName) {
        findDesk = desk;
      }
    }
    if(findDesk == null){
      for (let i = 0, len = this.desks.length; i < len; i++) {
        let desk = this.desks[i];
        //找到空桌
        if(desk.name == '' && desk.positions[0].state == 0 && desk.positions[1].state == 0 ){
          desk.name = deskName;
          findDesk = desk;
          break;
        }
      }
    }
    return findDesk;
  },
  //判断游戏结束
  checkTimeGameOver:function(){

    for (let _i = 0, len = this.desks.length; _i < len; _i++) {
      var desk = this.desks[_i];
      if(desk.state == 1) {
        // 时间到或者没牌了
        if (Date.parse(new Date()) / 1000 - desk.start_time > desk.game_time * 60 || desk.cards.length <= 0) {
          //重置状态
          for (let i = 0; i < desk.positions.length; i++) {
            desk.positions[i].state = 1;
          }
          desk.state = 0;

          var winer = 0;
          //超过游戏时间 算手牌少的人赢
          let min = desk.positions[0].cards.length;

          for (let i = 0; i < desk.ready_count; i++) {
            if (desk.positions[i].cards.length < min) {
              min = desk.positions[i].cards.length;
              winer = i;
            }
          }


          var score_list = [];
          var cards_list = [];
          //计算每局得分
          var score_total = 0;
          for (let i = 0; i < desk.ready_count; i++) {
            if (winer != i) {
              var score = 0;
              for (let j = 0; j < desk.positions[i].cards.length; j++) {
                var card = desk.positions[i].cards[j];
                if (card.type == 1) {
                  score += parseInt(card.value);
                } else if (card.type == 2) {
                  if (card.value == 'stop' || card.value == 'turn' || card.value == 'plus2') {
                    score += 20;
                  } else if (card.value == 'plus4' || card.value == 'color') {
                    score += 50;
                  }
                }
              }
              cards_list[i] = desk.positions[i].cards;
              score_list[i] = score;
              score_total += score;
            }
          }
          score_list[winer] = score_total;

          this.broadCastRoom("GAME_OVER", desk.deskId, {winer: winer, score_list: score_list,cards_list:cards_list});
        }
      }
    }
  },
  broadCastRoom:function(event,roomId,data,except){
    for (let i = 0; i < this.desks.length; i++) {
      if(this.desks[i].deskId == roomId){
        for (let j = 0; j < this.desks[i].positions.length; j++) {
          if(this.desks[i].positions[j].socket){
            if(except){
              if(this.desks[i].positions[j].uid != except){
                this.desks[i].positions[j].socket.emit(event,data);
              }
            }else{
              this.desks[i].positions[j].socket.emit(event,data);
            }
          }
        }
      }
    }
  },
  init:function () {

    const self = this;

    function setHeartbeat() {
      setTimeout(setHeartbeat, 5000);
      io.sockets.emit('ping', {beat: 1});
    }
    setTimeout(setHeartbeat, 5000);
    setInterval(function(){
      self.checkTimeGameOver();
    },1000);

    io.on('connection', function(socket){

      console.log('有客户端接入，时间： %s', self.time());

      socket.on('LOGIN',function(obj){
          var room = self.getDeskByName(obj.room);
          if(room) {
            console.log(obj.name, '进入房间', room.name,room.deskId);

            var flag = false;

            for (let i = 0; i < room.positions.length; i++) {
              if(room.positions[i].state == 0){
                room.positions[i].uid = obj.uid;
                room.positions[i].state = 1;
                room.positions[i].name = obj.name;
                room.positions[i].avatorUrl = obj.avatorUrl;
                room.positions[i].score = obj.score;
                room.positions[i].socket = socket;
                obj.posId = room.positions[i].posId;
                obj.state = 1;
                flag = true;
                break;
              }
            }
            if(flag){// 坐下成功

              if(self.checkUserLogin(obj.uid)){
                socket.emit("MESSAGE",'玩家'+obj.name+'已登录');
                return;
              }

              var next = function(){
                self.clients[obj.uid] = socket;

                if(room.play_mode == -1){
                  room.game_time = obj.game_time ?? 4;
                  room.play_mode = obj.play_mode;
                  room.specific_score = obj.specific_score ?? 1000;
                }

                var playerData = [];
                for (let i = 0; i < room.positions.length; i++) {
                  if(room.positions[i].state > 0){
                    playerData[room.positions[i].posId] = {
                      uid: room.positions[i].uid,
                      state: room.positions[i].state,
                      name: room.positions[i].name,
                      avatorUrl: room.positions[i].avatorUrl,
                      score: room.positions[i].score,
                      posId: room.positions[i].posId,
                    };
                  }
                }

                socket.emit("LOGIN_SUCCESS",{
                  roomId:room.name,
                  posId:obj.posId,
                  play_mode:room.play_mode,
                  playerData:playerData,
                });
                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)
              }

              try {
                var path = `${__dirname}/../uno_client/avator/${obj.uid}.jpg`;
                if(!fs.existsSync(path)){
                  //下载头像
                  request(obj.avatorUrl).pipe(fs.createWriteStream(path)).on('close',next);
                }else{
                  next();
                }
              }catch (e){
                console.log('下载头像失败：'+obj.avatorUrl);
                console.log(e.message)
                next();
              }

            }else{
              socket.emit("MESSAGE",'房间已满员');
            }
          }
      })
      socket.on("PLAY_CARD",function(obj){

        const desk = self.getDesk(socket);
        var curPosId = self.getPosId(socket);
        console.log("玩家["+desk.positions[self.getPosId(socket)].name+"] 出牌 ",obj);

        var last_card = desk.out_cards[desk.out_cards.length - 1];
        console.log("最近一张牌 ",last_card);
        var isOk = false;

        if(desk.positions[curPosId].cards.length == 1 && obj.type == 2){  //最后一张不能出功能牌
          isOk = false;
        }else {
          //数字牌
          if (last_card.type == 1) {
            if (obj.color == last_card.color || obj.value == last_card.value || obj.value == 'color' || obj.value == 'plus4') {
              isOk = true;
            }
            //功能牌
          } else if (last_card.type == 2) {

              if (last_card.value == 'plus2') {
                if (last_card.mark) {
                  if (obj.color == last_card.color || obj.value == last_card.value || obj.value == 'color' || obj.value == 'plus4') {
                    isOk = true;
                  }
                } else {
                  if (obj.value == 'plus2' || obj.value == 'plus4') {
                    isOk = true;
                  }
                }

              } else if (last_card.value == 'plus4') {
                if (last_card.mark) {
                  if (obj.color == last_card.color || obj.value == 'color' || obj.value == 'plus4') {
                    isOk = true;
                  }
                } else {
                  if (obj.value == 'plus4') {
                    isOk = true;
                  }
                }
              } else if (last_card.value == 'stop' || last_card.value == 'turn' || last_card.value == 'color') {
                if (obj.color == last_card.color || obj.value == last_card.value || obj.value == 'color' || obj.value == 'plus4') {
                  isOk = true;
                }
              }
            }
        }

        if(isOk){

          var nextPosId;

          if(obj.value == 'stop'){
              nextPosId = self.getNextPosId(socket,self.getNextPosId(socket,curPosId));
          }else if(obj.value == 'turn'){
              desk.direct = desk.direct == 1 ? 0 : 1;
              nextPosId = self.getNextPosId(socket,curPosId);
          }else{
              nextPosId = self.getNextPosId(socket,curPosId);
          }
          desk.out_cards.push(obj);
          var new_cards = [];
          var is_del = false;
          for (let i = 0; i < desk.positions[curPosId].cards.length; i++) {
            var _card = desk.positions[curPosId].cards[i];
            if( !is_del && ((_card.value == obj.value && _card.color == obj.color) ||
                (_card.value == obj.value && _card.value == 'color') ||
                (_card.value == obj.value && _card.value == 'plus4')))
            {
              is_del = true;
              continue;
            }else{
              new_cards.push(_card);
            }
          }
          desk.positions[curPosId].cards = new_cards;
          self.broadCastRoom("PLAY_CARD_SUCCESS",desk.deskId,{card:obj,posId:curPosId,nextPosId:nextPosId})

          console.log("已经游玩了："+(Date.parse(new Date()) / 1000 - desk.start_time) +"秒");
          console.log("玩家["+desk.positions[self.getPosId(socket)].name+"] 手牌：",desk.positions[curPosId].cards);
          //判断游戏结束
          if(desk.positions[curPosId].cards.length <= 0)
          {
            //重置状态
            for (let i = 0; i < desk.positions.length ; i++) {
              desk.positions[i].state = 1;
            }
            desk.state = 0;

            var winer = curPosId;

            var score_list = [];
            var cards_list = [];
            //计算每局得分
            var score_total = 0;
            for (let i = 0; i < desk.ready_count; i++) {
              if(winer != i){
                var score = 0;
                for (let j = 0; j < desk.positions[i].cards.length; j++) {
                  var card = desk.positions[i].cards[j];
                  if(card.type == 1){
                    score += parseInt(card.value);
                  }else if(card.type == 2){
                    if(card.value == 'stop' || card.value == 'turn' || card.value == 'plus2'){
                      score += 20;
                    }else if(card.value == 'plus4' || card.value == 'color'){
                      score += 50;
                    }
                  }
                }
                cards_list[i] = desk.positions[i].cards;
                score_list[i] = score;
                score_total += score;
              }
            }
            score_list[winer] = score_total;

            self.broadCastRoom("GAME_OVER",desk.deskId,{winer:winer,score_list:score_list,cards_list:cards_list});
          }
        }else{
          socket.emit("MESSAGE",'不能出这张牌~');
        }
      })

      socket.on("PLAY_PASS",function(){
        const desk = self.getDesk(socket);
        if(desk.state != 1){
          return;
        }

        var plusNum = 0;
        var last_card = desk.out_cards[desk.out_cards.length - 1];
        if(last_card.value == 'plus2' || last_card.value == 'plus4'){

          for (let i = desk.out_cards.length - 1; i >= 0; i--) {
            var v = desk.out_cards[i];
            if(v.value == 'plus2' ){
              if(!v.mark){
                plusNum += 2;
                v.mark = true;
              }
            }else if (v.value == 'plus4'){
              if(!v.mark){
                plusNum += 4;
                v.mark = true;
              }
            }else{
              break;
            }
          }
          if(plusNum == 0){
            plusNum = 1;
          }
        }else{
          plusNum = 1;
        }
        var curPosId = self.getPosId(socket);
        var nextPosId = self.getNextPosId(socket,curPosId);
        var plus_cards = [];
        for (let i = 0; i < plusNum; i++) {
          var card = desk.cards.shift();
          plus_cards.push(card);
          desk.positions[curPosId].cards.push(card);
        }

        console.log("玩家["+desk.positions[curPosId].name+"] 摸牌 ",plus_cards,' 手牌：',desk.positions[curPosId].cards.length);
        socket.emit("PLAY_PASS_SUCCESS",{plus_cards:plus_cards});
        self.broadCastRoom("PLUS_CARD",desk.deskId,{plus_num:plusNum,posId:curPosId,nextPosId:nextPosId});
      });

      socket.on("PREPARE",function(){

        var isStartGame = false;
        var ready_count = 0;
        const desk = self.getDesk(socket);
        for (let j = 0; j < desk.positions.length; j++) {
          const userObj = desk.positions[j];
          if(userObj.state == 1 && userObj.socket && userObj.socket.id == socket.id){
            desk.positions[j].state = 2;
          }
          if(desk.positions[j].state == 2){
            ready_count++;
          }
        }

        if(desk.play_mode == 1 && ready_count == 2 ||
            desk.play_mode == 2 && ready_count == 4 ){
          desk.ready_count = ready_count;
          desk.state = 1;//开始游戏
          isStartGame = true;
        }

        self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),self.getPosId(socket));
        if(isStartGame)
        {
          desk.direct = 1;//顺时针方向
          desk.cards = self.createCards();
          desk.cur_posId = self.getRandomNumForRange(ready_count-1);
          desk.out_cards = [];
          desk.start_time = Date.parse(new Date()) / 1000;
          const top = self.getNumberCard(desk.cards);
          desk.out_cards.push(top);
          //分数初始化
          var score_list = {};
          for (let i = 0; i < ready_count; i++) {
            const userObj = desk.positions[i];
            score_list[userObj.posId] = userObj.score;
          }
          for (let i = 0; i < ready_count; i++) {
              const userObj = desk.positions[i];
              userObj.cards = [];
              for (let k = 0; k < 7; k++) {
                userObj.cards.push(desk.cards.shift());
              }
              userObj.socket.emit('GAME_START',{score_list:score_list,cards:userObj.cards,top:top,turn:desk.cur_posId});
          }
        }
      });

      socket.on('disconnect', function(){

        for (let i = 0; i < self.desks.length; i++) {
          var isClean = true;
          for (let j = 0; j < self.desks[i].positions.length; j++) {

            var userObj = self.desks[i].positions[j];

            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id){

              console.log('用户 '+userObj.name+" "+userObj.uid+' 断线');

              self.desks[i].positions[j].state = 0;
              self.desks[i].positions[j].name = '';
              self.desks[i].positions[j].avatorUrl = '';
              self.desks[i].positions[j].score = 0;
              self.desks[i].positions[j].socket = null;
              self.desks[i].positions[j].cards = [];
              delete self.clients[userObj.uid];
              self.desks[i].positions[j].uid = 0;

              self.desks[i].state = 0;

              self.broadCastRoom("MESSAGE",self.desks[i].deskId,'玩家'+userObj.name+'已掉线',userObj.uid);
              self.broadCastRoom("SIT_CHANGE",self.desks[i].deskId,{target:null,posId:userObj.posId},userObj.uid);
            }
            if(self.desks[i].positions[j].state != 0){
              isClean = false;
            }
          }
          if(isClean){
            self.desks[i].name = '';
            self.desks[i].state = 0;
            self.desks[i].play_index = 1;
            self.desks[i].play_mode = -1;

          }
        }
      });

    });

    http.listen(8005, function(){
      console.log('listening on :8005');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
