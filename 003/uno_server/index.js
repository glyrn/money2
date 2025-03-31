const os = require('os');
//本地调试
var isDebug = false;
var ioParam = {path:'/uno_socket.io'};
if(getCurrentIP().indexOf("192.168") != -1){
  ioParam = null;
  isDebug = true;
}
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,ioParam);
app.use(express.static(`${__dirname}/../uno_client`));
// 设置跨域头部
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

function GameServer() {

  this.desks = this.createDeskList(50);
  this.clients = {};
}
function getCurrentIP() {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const info of iface) {
      if (info.family === 'IPv4' && !info.internal) {
        return info.address;
      }
    }
  }
  return null;
}
const proto = {

  time:function (){
    return (new Date()).toLocaleDateString()+" "+(new Date()).toLocaleTimeString();
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
        ready_count:-1,
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
          ob_socket_map:{},
          recover_disconnect_data:[],
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
  getPositionByPosId(desk, posId) {
    if(desk) {
      for (let i = 0, len = desk.positions.length; i < len; i++) {
        let position = desk.positions[i];
        if (position.posId == posId) {
          return position;
        }
      }
    }
    return null;
  },
  getNextPosId:function(desk,curPosId){
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
  socketEmit:function(userObj,event,data){
    var saveData = data;
    if(data instanceof Object){//深复制data
      saveData = JSON.parse(JSON.stringify(data));
    }
    for (const ob_uid in userObj.ob_socket_map) {
      userObj.ob_socket_map[ob_uid].emit(event,saveData);
    }
    userObj.recover_disconnect_data.push({event:event,data:saveData});
    if(userObj.socket){
      userObj.socket.emit(event,saveData);
    }
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
      var roomObj = this.desks[i];
      if(roomObj.deskId == roomId){
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
          if(userObj.socket){
            if(except){
              if(userObj.uid != except){
                this.socketEmit(userObj,event,data);
              }
            }else{
              this.socketEmit(userObj,event,data);
            }
          }
        }
      }
    }
  },
  makePass:function(desk,curPosId){

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

    var userObj = desk.positions[curPosId];
    var nextPosId = this.getNextPosId(desk,curPosId);
    var plus_cards = [];
    for (let i = 0; i < plusNum; i++) {
      var card = desk.cards.shift();
      plus_cards.push(card);
      userObj.cards.push(card);
    }

    console.log("玩家["+userObj.name+"] 摸牌 ",plus_cards,' 手牌：',userObj.cards.length);
    this.socketEmit(userObj,"PLAY_PASS_SUCCESS",{plus_cards:plus_cards});
    this.broadCastRoom("PLUS_CARD",desk.deskId,{plus_num:plusNum,posId:curPosId,nextPosId:nextPosId});
  },
  checkDisconnect:function(){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {

        var userObj = this.desks[i].positions[j];

        if(userObj.disconnectTime > 0 && Math.floor(new Date().getTime() / 1000) - userObj.disconnectTime >= (isDebug ? 10:180)){
          console.log('用户 '+userObj.name+" "+userObj.uid+' 已确认断线，清除数据');
          userObj.uid = 0;
          userObj.state = 0;
          userObj.name = '';
          userObj.avatorUrl = '';
          userObj.score = 0;
          userObj.disconnectTime = null;
          //清空断线重连信息
          userObj.recover_disconnect_data = [];

          this.broadCastRoom("MESSAGE",this.desks[i].deskId,'玩家'+userObj.name+'已掉线',userObj.uid);
          this.broadCastRoom("SIT_CHANGE",this.desks[i].deskId,{target:null,posId:userObj.posId},userObj.uid);

          //检查是否全部掉线 是的话要重置房间
          var isClean = true;
          for (let k = 0; k < this.desks[i].positions.length; k++) {
            if(this.desks[i].positions[k].uid > 0 ){
              isClean = false;
            }
          }
          if(isClean){
            this.desks[i].name = '';
            this.desks[i].state = 0;
            this.desks[i].play_index = 0;
            this.desks[i].ready_count = -1;
          }else{
            this.broadCastRoom("GAME_OVER", this.desks[i].deskId, {invalid:1,winer: -1, score_list: [],cards_list:[]});
          }
        }
      }
    }
  },
  //切换房间
  checkChangeRoom:function(curRoomId,uid){
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      for (let j = 0; j < roomObj.positions.length; j++) {
        var userObj = roomObj.positions[j];
        //房间号不同 要退出原来房间
        if(userObj.uid == uid && roomObj.deskId != curRoomId){

          console.log('用户 '+userObj.name+" "+userObj.uid+' 退出原来房间');
          userObj.uid = 0;
          userObj.state = 0;
          userObj.name = '';
          userObj.avatorUrl = '';
          userObj.score = 0;
          userObj.disconnectTime = null;
          //清空断线重连信息
          userObj.recover_disconnect_data = [];

          this.broadCastRoom("MESSAGE",roomObj.deskId,'玩家'+userObj.name+'已掉线',userObj.uid);
          this.broadCastRoom("SIT_CHANGE",roomObj.deskId,{target:null},userObj.uid);

          var isClean = true;
          for (let k = 0; k < this.desks[i].positions.length; k++) {
            if(this.desks[i].positions[k].uid > 0 ){
              isClean = false;
            }
          }
          if(isClean){
            this.desks[i].name = '';
            this.desks[i].state = 0;
            this.desks[i].play_index = 0;
            this.desks[i].ready_count = -1;
          }
        }
      }
    }
  },
  checkRecover:function(socket,obj){

    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      for (let j = 0; j < roomObj.positions.length; j++) {
        var userObj = roomObj.positions[j];
        if(userObj.uid == 0) continue;
        // 断线重连、旁观
        if(userObj.uid == obj.uid || userObj.uid == obj.ob_uid ){
          if(userObj.uid == obj.uid){ //断线重连
            userObj.disconnectTime = null;
            userObj.socket = socket; //重连上
            this.clients[obj.uid] = socket;
          }else if(userObj.uid == obj.ob_uid) { //旁观
            userObj.ob_socket_map[obj.uid] = socket;
          }
          //重连恢复
          for (let k = 0; k < userObj.recover_disconnect_data.length; k++) {
            var emitObj = userObj.recover_disconnect_data[k];
            socket.emit(emitObj.event,emitObj.data);
          }
          return true;
        }
      }
    }
    return false;
  },
  init:function () {

    const self = this;

    function setHeartbeat() {
      setTimeout(setHeartbeat, 5000);
      io.sockets.emit('ping', {beat: 1});
    }
    setTimeout(setHeartbeat, 5000);

    function checkDisconnect(){
      setTimeout(checkDisconnect, 5000);
      self.checkDisconnect()
    }
    setTimeout(checkDisconnect, 5000);

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
            //检查是否换房间
            self.checkChangeRoom(room.deskId,obj.uid);
            //检测是否重连玩家
            if(self.checkRecover(socket,obj)){
              //推送恢复数据
              return;
            }
            var userObj = null;
            for (let i = 0; i < room.positions.length; i++) {
              userObj = room.positions[i];
              if(userObj.state == 0){
                userObj.uid = obj.uid;
                userObj.state = 1;
                userObj.name = obj.name;
                userObj.avatorUrl = obj.avatorUrl;
                userObj.score = obj.score;
                userObj.socket = socket;
                obj.posId = userObj.posId;
                obj.state = 1;
                flag = true;
                break;
              }
            }
            if(flag){// 坐下成功

              self.clients[obj.uid] = socket;

              if(room.ready_count == -1){
                room.game_time = obj.game_time ?? 4;
                room.ready_count = obj.ready_count;
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

              self.socketEmit(userObj,"LOGIN_SUCCESS",{
                roomId:room.name,
                posId:obj.posId,
                ready_count:room.ready_count,
                playerData:playerData,
              });
              self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)

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
              nextPosId = self.getNextPosId(desk,self.getNextPosId(desk,curPosId));
          }else if(obj.value == 'turn'){
              desk.direct = desk.direct == 1 ? 0 : 1;
              nextPosId = self.getNextPosId(desk,curPosId);
          }else{
              nextPosId = self.getNextPosId(desk,curPosId);
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
          }else{
            //轮到的玩家刚好掉线
            var nextUserObj = self.getPositionByPosId(desk,nextPosId);
            if(nextUserObj.disconnectTime > 0){
              self.makePass(desk,nextPosId);
            }
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
        var curPosId = self.getPosId(socket);
        self.makePass(desk,curPosId);
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

        if(desk.ready_count == 2 && ready_count == 2 ||
            desk.ready_count == 4 && ready_count == 4 ){
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
            self.socketEmit(userObj,'GAME_START',{score_list:score_list,cards:userObj.cards,top:top,turn:desk.cur_posId});
          }
        }
      });

      socket.on('disconnect', function(){

        for (let i = 0; i < self.desks.length; i++) {
          for (let j = 0; j < self.desks[i].positions.length; j++) {

            var userObj = self.desks[i].positions[j];

            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id){

              console.log('用户 '+userObj.name+" "+userObj.uid+' 断线');
              //记录掉线时间
              delete self.clients[userObj.uid];
              userObj.socket = null;
              userObj.disconnectTime = Math.floor(new Date().getTime() / 1000);
              // 刚好轮到的时候掉线 自动pass处理
              if(self.desks[i].cur_posId == userObj.posId){
                self.makePass(self.desks[i],userObj.posId);
              }
            }
          }
        }
      });
    });

    http.listen(9003, function(){
      console.log('listening on :9003');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()

app.get('/quit',function(req,res){
  const uid = req.query.uid;
  res.send({state:0,msg:"退出成功",uid:uid});
  //踢出房间
  gameServer.checkChangeRoom(-1,uid);
})