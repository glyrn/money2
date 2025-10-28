const crypto = require('crypto');
const os = require('os');
const https = require('https');
const fs = require('fs');
const _ = require('lodash');

//本地调试
var isDebug = false;
var ioParam = {path:'/uno_socket.io'};
if(getCurrentIP().indexOf("192.168") != -1){
  ioParam = null;
  isDebug = true;
}
const gameCfg = JSON.parse(fs.readFileSync('gameCfg.json', 'utf8'));

const yc_domain = gameCfg['yc_domain'];//www.fsyctech.com';  
const game_port = gameCfg['game_port'];
console.log("结算域名："+yc_domain)

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

  this.desks = this.createDeskList(150);
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

function getTimeStamp(){
   return Math.floor(new Date().getTime() / 1000);
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
          // debug 
          // cards.push({type:1,value:i,color:1})
        }
      }
      //debug

      // cards.push({type:1,value:0,color:1})
      // cards.push({type:2,value:'stop',color:1});
      // cards.push({type:2,value:'stop',color:1});
      // cards.push({type:2,value:'turn',color:1});
      // cards.push({type:2,value:'turn',color:1});
      // cards.push({type:2,value:'plus2',color:1});
      // cards.push({type:2,value:'plus2',color:1});

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
    n = n || 150;
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
        out_cards:[],
        ob_socket_map:{},
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
  getDeskByUid:function(uid){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj && userObj.uid == uid) {
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
    var saveData = _.cloneDeep(data);

    var roomObj = this.getDeskByUid(userObj.uid);
    //下发观众数据
    for (const socket_id in roomObj.ob_socket_map) {
      //观众比玩家提前进游戏 随机观看一个玩家即可
      if(roomObj.ob_socket_map[socket_id].uid == null){
        roomObj.ob_socket_map[socket_id].uid = userObj.uid;
        roomObj.ob_socket_map[socket_id].socket.emit(event,saveData);
      }else if(roomObj.ob_socket_map[socket_id].uid == userObj.uid){
        roomObj.ob_socket_map[socket_id].socket.emit(event,saveData);
      }
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
        if (getTimeStamp() - desk.start_time > desk.game_time * 60 || desk.cards.length <= 0) {
          //重置状态
          for (let i = 0; i < desk.positions.length; i++) {
            desk.positions[i].state = 1;
          }
          desk.state = 0;
          desk.deprecate_time = 30;
          desk.hadDeprecateGame = false;

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
          var ycscore_list = [];
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

              ycscore_list.push({uid:desk.positions[i].uid,name:desk.positions[i].name,score:score,is_win:0,avatorUrl:desk.positions[i].avatorUrl})
            }
          }
          score_list[winer] = score_total;
          ycscore_list.push({uid:desk.positions[winer].uid,name:desk.positions[winer].name,score:score_total,is_win:1,avatorUrl:desk.positions[winer].avatorUrl})
          ycscore_list.sort((a, b) => {
            return b.score - a.score;
          });
          console.log("GAME_OVER超时")
          this.broadCastRoom("GAME_OVER", desk.deskId, {winer: winer, score_list: score_list,cards_list:cards_list});
          if(!desk.score_list) desk.score_list = [];
          desk.score_list.push({play_index:desk.play_index,score_list:ycscore_list});

          //超时直接结束游戏
          this.sendYcGameOver({
            room_id:desk.name,
            game_id:3,
            score_list:desk.score_list
          });
          desk.play_index = 1;

        }
      }
    }
  },
  broadCastRoom:function(event,roomId,data,except){
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      if(roomObj.deskId == roomId){
        let userObjNum = 0;
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
          if(userObj.uid > 0) userObjNum++;
          if(except){
            if(userObj.uid != except){
              this.socketEmit(userObj,event,data);
            }
          }else{
            this.socketEmit(userObj,event,data);
          }
        }
        if(userObjNum == 0){
          //下发给观众数据
          for (const socket_id in roomObj.ob_socket_map) {
            if(roomObj.ob_socket_map[socket_id].socket){
              roomObj.ob_socket_map[socket_id].socket.emit(event,data);
            }
          }
        }
      }
    }
  },

  gameSchedule:function(){
    let self = this;
    for (let i = 0; i < this.desks.length; i++) {
      var desk = this.desks[i];
      //开始游戏
      if(desk.state == 1){

        if(desk.time_out > 0){
          desk.time_out--;
        }else{ //时间到

          if(!desk.hadExecutePlayCard){
              desk.hadExecutePlayCard = true;

              this.makePass(desk,desk.cur_posId);
          }
        }
      //检测弃局
      }else if(desk.state == 0 && desk.deprecate_time > 0){

        desk.deprecate_time--;
        if(desk.deprecate_time > 0){
          console.log(desk.deprecate_time)
        }else{ //时间到

          if(!desk.hadDeprecateGame){
              desk.hadDeprecateGame = true;

            this.deprecateGame(desk);
          }
        }
      }
    }
  },
  //作废本局
  deprecateGame:function(desk){
    console.log("弃局!!")
    this.broadCastRoom("GAME_OVER", desk.deskId, {invalid:1,winer: -1, score_list: [],cards_list:[]});
    // this.broadCastRoom("MESSAGE",desk.deskId,'中途有人逃跑本局成绩作废');

    desk.state = 0;
    desk.deprecate_time = 0;
    desk.hadDeprecateGame = false;

    var ycscore_list = [];
    for (let i = 0; i < desk.positions.length; i++) {
      desk.positions[i].state = 1;
      if(desk.positions[i].uid >0) {
        ycscore_list.push({
          uid: desk.positions[i].uid,
          name: desk.positions[i].name,
          score: desk.positions[i].gain_score,
          is_win: 0,
          avatorUrl:desk.positions[i].avatorUrl,
        })
      }
    }
    if(!desk.score_list) desk.score_list = [];
    desk.score_list.push({play_index:desk.play_index,score_list:ycscore_list});
    this.sendYcGameOver({
      room_id:desk.name,
      game_id:3,
      score_list:desk.score_list,
    });
  },
  makePass:function(desk,curPosId){
    console.log("makePass")
    var plusNum = 0;
    var last_card = desk.out_cards[desk.out_cards.length - 1];
    if(!last_card) return;
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
    desk.cur_posId = nextPosId;
    var plus_cards = [];
    for (let i = 0; i < plusNum; i++) {
      var card = desk.cards.shift();
      if(!card) return; // 没有牌了 要退出
      plus_cards.push(card);
      console.log(userObj.name,"[[增加手牌]]",card)
      userObj.cards.push(card);
      // console.log(userObj.name,"手牌：",userObj.cards,userObj.cards.length);
    }

    // console.log("玩家["+userObj.name+"] 摸牌 ",plus_cards,' 手牌：',userObj.cards.length);
    this.socketEmit(userObj,"PLAY_PASS_SUCCESS",{plus_cards:plus_cards});
    desk.hadExecutePlayCard = false;
    desk.time_out = 30;
    this.broadCastRoom("PLUS_CARD",desk.deskId,{plus_num:plusNum,posId:curPosId,nextPosId:nextPosId,server_time:getTimeStamp()});

  },
  checkDisconnect:function(){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {

        var userObj = this.desks[i].positions[j];

        if(userObj.disconnectTime > 0 && getTimeStamp() - userObj.disconnectTime >= (isDebug ? 180:180)){
          console.log('用户 '+userObj.name+" "+userObj.uid+' 已确认断线，清除数据');
          let name = userObj.name;
          userObj.uid = 0;
          userObj.state = 0;
          userObj.name = '';
          userObj.avatorUrl = '';
          userObj.score = 0;
          userObj.disconnectTime = null;
          //清空断线重连信息
          userObj.recover_disconnect_data = [];
          userObj.delayPass = null;

          this.broadCastRoom("MESSAGE",this.desks[i].deskId,'玩家'+name+'已掉线',userObj.uid);
          this.broadCastRoom("SIT_CHANGE",this.desks[i].deskId,{target:null,posId:userObj.posId},userObj.uid);

          //检查是否全部掉线 是的话要重置房间
          var isClean = true;
          var desk = this.desks[i];
          for (let k = 0; k < this.desks[i].positions.length; k++) {
            if(this.desks[i].positions[k].uid > 0 ){
              isClean = false;
            }
          }
          if(isClean){
            desk.name = '';
            desk.state = 0;
            desk.play_index = 1;
            desk.ready_count = -1;
          }

          this.deprecateGame(desk);
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
          let name = userObj.name;
          console.log('用户 '+name+" "+userObj.uid+' 退出原来房间');
          userObj.uid = 0;
          userObj.state = 0;
          userObj.name = '';
          userObj.avatorUrl = '';
          userObj.score = 0;
          userObj.disconnectTime = null;
          //清空断线重连信息
          userObj.recover_disconnect_data = [];

          this.broadCastRoom("MESSAGE",roomObj.deskId,'玩家'+name+'已掉线',userObj.uid);
          this.broadCastRoom("SIT_CHANGE",roomObj.deskId,{target:null,posId:userObj.posId},userObj.uid);

          var isClean = true;
          for (let k = 0; k < this.desks[i].positions.length; k++) {
            if(this.desks[i].positions[k].uid > 0 ){
              isClean = false;
            }
          }
          if(isClean){
            this.desks[i].name = '';
            this.desks[i].state = 0;
            this.desks[i].play_index = 1;
            this.desks[i].ready_count = -1;
          }

          let desk = this.desks[i];
          this.deprecateGame(desk);

        }
      }
    }
  },
  clearRoomByUid:function(uid){
    var deskId = 0;
    var isFind = false;
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      for (const socket_id in roomObj.ob_socket_map) {
        //观众找到自己 观众要离开
        if(roomObj.ob_socket_map[socket_id].ouid == uid){
          let userObjNum = 0;
          for (let j = 0; j < roomObj.positions.length; j++) {
            var userObj = roomObj.positions[j];
            if(userObj.uid > 0) userObjNum++;
          }
          //空房间 要顺便清一下房间内的玩家信息
          if(userObjNum == 0 && isFind == false){
            isFind = true;
            deskId = roomObj.deskId;
          }
        }
      }
      for (let j = 0; j < roomObj.positions.length; j++) {
        var userObj = roomObj.positions[j];
        if(userObj.uid == uid){
          deskId = roomObj.deskId;
        }
      }
    }
    var desk = this.getDeskById(deskId);
    if(desk){
      for (let k = 0; k < desk.positions.length; k++) {
        var userObj = desk.positions[k];
        userObj.uid = 0;
        userObj.state = 0;
        userObj.name = '';
        userObj.avatorUrl = '';
        userObj.score = 0;
        userObj.disconnectTime = null;
        //清空断线重连信息
        userObj.recover_disconnect_data = [];
      }
      desk.name = '';
      desk.state = 0;
      desk.deprecate_time = 0;
      desk.play_index = 0;
      desk.ready_count = -1;
      desk.ob_socket_map = {};
      desk.hadDeprecateGame = false;
    }
    return deskId;
  },
  checkObUser:function(socket,roomObj,obj){
    if(obj.ob_uid){
        
        //预先保存观众socket
        roomObj.ob_socket_map[socket.id] = {socket:socket,ouid:obj.uid,uid:null};

        //推送其中一个在线玩家的数据
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
          if(userObj.uid > 0 && userObj.disconnectTime == null){
            
            //保存观众socket + uid
            roomObj.ob_socket_map[socket.id] = {socket:socket,ouid:obj.uid,uid:userObj.uid};

            for (let k = 0; k < userObj.recover_disconnect_data.length; k++) {
              var emitObj = userObj.recover_disconnect_data[k];
              socket.emit(emitObj.event,emitObj.data);
            }
            break;
          }
        }
        return true;
    }
    return false;
  },
  checkRecover:function(socket,roomObj,obj){

    for (let j = 0; j < roomObj.positions.length; j++) {
      var userObj = roomObj.positions[j];
      if(userObj.uid == 0) continue;
      // 断线重连
      if(userObj.uid == obj.uid ){

        userObj.disconnectTime = null;
        userObj.socket = socket; //重连上
        this.clients[obj.uid] = socket;

        //重连恢复
        console.log("断线重连")
        socket.emit("SET_RECOVER_STATUS",{isRecover:true});
        for (let k = 0; k < userObj.recover_disconnect_data.length; k++) {
          var emitObj = userObj.recover_disconnect_data[k];
          socket.emit(emitObj.event,emitObj.data);
        }
        socket.emit("SET_RECOVER_STATUS",{isRecover:false});
        //广播其他所有人 该玩家上线了
        this.broadCastRoom("CONNECT_STATE",roomObj.deskId,{state:1,posId:userObj.posId},userObj.uid);
        return true;
      }
    }
    return false;
  },
  //发送给云村数据
  sendYcGameOver:function(data){
    function md5(text) {
      return crypto.createHash('md5').update(text).digest('hex');
    }

    const postData = JSON.stringify({
      data:JSON.stringify(data),
      sign:md5(JSON.stringify(data)+"6498612990a59aefb6ad6aa1ca5f7bbb"),
    });
    console.log(postData)
    const options = {
      hostname: yc_domain,
      port: 443,
      path: '/client/alchemy/callback/gameOver',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    console.log("通知云村游戏结束，统计成绩");
    const req = https.request(options, (res) => {
      res.on('data', (chunk) => {
        console.log(`响应: ${chunk}`);
      });
    });
    req.on('error', (e) => {
      console.error(`请求遇到问题: ${e.message}`);
    });

    req.write(postData);
    req.end();
  },
  init:function () {

    const self = this;

    function setHeartbeat(){
      io.sockets.emit('ping',{beat:1});
    }
    setInterval(setHeartbeat,5000)

    function checkDisconnect(){
      self.checkDisconnect()
    }
    setInterval(checkDisconnect,5000)

    setInterval(function(){
      self.checkTimeGameOver();
    },1000);

    function gameSchedule(){
      self.gameSchedule();
    }
    setInterval(gameSchedule,1000);

    io.on('connection', function(socket){
      socket.on('pong', function(data){
      });

      console.log('有客户端接入，时间： %s', self.time());

      socket.on('LOGIN',function(obj){
          var room = self.getDeskByName(obj.room);
          if(room) {
            console.log(obj.name, '进入房间', room.name,room.deskId);
            console.log("启动参数:",obj.name,obj.lanuch_url);

            var flag = false;
            //检查是否换房间
            self.checkChangeRoom(room.deskId,obj.uid);
            //检测是否重连玩家
            if(self.checkRecover(socket,room,obj)){
              //推送恢复数据
              return;
            }
            //检测是否观众
            if(self.checkObUser(socket,room,obj)){
              //观众进入也要启动弃局倒计时
              room.deprecate_time = 30;
              room.hadDeprecateGame = false;
              return;
            }
            var userObj = null;

            room.game_time = obj.game_time ?? 4;
            room.ready_count = obj.ready_count;
            room.specific_score = obj.specific_score ?? 1000;
            room.deprecate_time = 30;
            room.hadDeprecateGame = false;

            for (let i = 0; i < room.positions.length; i++) {
              userObj = room.positions[i];
              if(userObj.uid == 0){
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

              var playerData = [];
              for (let i = 0; i < room.positions.length; i++) {
                if(room.positions[i].uid > 0){
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
                server_time:getTimeStamp(),
              });
              self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)

            }else{
              socket.emit("MESSAGE",'房间已满员');
            }
          }
      })
      socket.on("PLAY_CARD",function(obj){

        const desk = self.getDesk(socket);
        if(desk){
          var curPosId = self.getPosId(socket);
          // console.log("玩家["+desk.positions[self.getPosId(socket)].name+"] 出牌 ",obj);

          var last_card = desk.out_cards[desk.out_cards.length - 1];
          var isOk = false;

          if(desk.positions[curPosId].cards.length == 1 && obj.type == 2){  //最后一张不能出功能牌
            //补摸一张
            var card = desk.cards.shift();
            console.log("补摸ing",card);
            desk.positions[curPosId].cards.push(card);
            // console.log(desk.positions[curPosId].name,"手牌：", desk.positions[curPosId].cards, desk.positions[curPosId].cards.length);
            self.broadCastRoom("PLUS_CARD_ONLY",desk.deskId,{plus_num:1,card:card,posId:curPosId});
            isOk = true;
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
            desk.cur_posId = nextPosId;
            // console.log("obj:",obj);
            // console.log("手牌:",desk.positions[curPosId].cards,desk.positions[curPosId].cards.length);
            desk.out_cards.push(obj);
            var new_cards = [];
            var has_skip = false;
            for (let i = 0; i < desk.positions[curPosId].cards.length; i++) {
              var _card = desk.positions[curPosId].cards[i];
              if(_card.value == "color" && obj.value == 'color' && !has_skip){
                has_skip = true;
                  continue;
              }
              if(_card.value == "plus4" && obj.value == 'plus4' && !has_skip){
                has_skip = true;
                  continue;
              }
              if(((_card.value == obj.value && _card.type == obj.type && _card.color == obj.color)) && !has_skip )
              {
                has_skip = true;
                continue;
              }
              new_cards.push(_card);
            }
            desk.positions[curPosId].cards = new_cards;
            self.broadCastRoom("PLAY_CARD_SUCCESS",desk.deskId,{card:obj,posId:curPosId,nextPosId:nextPosId,server_time:getTimeStamp()})
            desk.hadExecutePlayCard = false;
            desk.time_out = 30;
            console.log("已经游玩了："+(getTimeStamp() - desk.start_time) +"秒");
            // console.log("玩家["+desk.positions[self.getPosId(socket)].name+"] 手牌：",desk.positions[curPosId].cards);
            //判断游戏结束
             console.log(desk.positions[curPosId].name,"剩余牌数：",desk.positions[curPosId].cards.length);
            //debug 
            if(desk.positions[curPosId].cards.length <= 0 || obj.value == 'plus4')
            {
              //重置状态
              for (let i = 0; i < desk.positions.length ; i++) {
                desk.positions[i].state = 1;
              }
              desk.state = 0;
              desk.deprecate_time = 30;
              desk.hadDeprecateGame = false;

              var winer = curPosId;

              var score_list = [];
              var ycscore_list = [];
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
                  score_list[i] = -score;
                  score_total += score;

                  ycscore_list.push({uid:desk.positions[i].uid,name:desk.positions[i].name,score:-score,is_win:0,avatorUrl:desk.positions[i].avatorUrl})
                }
              }
              score_list[winer] = score_total;
              ycscore_list.push({uid:desk.positions[winer].uid,name:desk.positions[winer].name,score:score_total,is_win:1,avatorUrl:desk.positions[winer].avatorUrl})
              ycscore_list.sort((a, b) => {
                return b.score - a.score;
              });

              console.log("游戏结束GAME_OVER")
              
              if(!desk.score_list) desk.score_list = [];
              desk.score_list.push({play_index:desk.play_index,score_list:ycscore_list})
              //找出是否有人累计超过特定分数
              var is_over_specific_score = false;
              var score_map = {};
              for (let i = 0; i < desk.positions.length ; i++) {
                score_map[desk.positions[i].uid] = parseInt(desk.positions[i].score);
              }
              
              for (let i = 0; i < desk.score_list.length; i++) {
                var ycscore_list = desk.score_list[i];
                for (let j = 0; j < ycscore_list.length; j++) {
                  
                  score_map[ycscore_list[j].uid] += parseInt(ycscore_list[j].score);
                  console.log(ycscore_list[j].uid,score_map[ycscore_list[j].uid])
                }
              }
              console.log(ycscore_list)
              console.log(score_map);
              for (const key in score_map) {
                if(score_map[key] >= desk.specific_score){
                  is_over_specific_score = true;
                }
              }

              self.broadCastRoom("GAME_OVER",desk.deskId,{winer:winer,score_list:score_list,cards_list:cards_list,is_quit:is_over_specific_score});
              
              
              console.log("是否超过指定分数？",is_over_specific_score,desk.specific_score);
              if(is_over_specific_score >= desk.specific_score){
                self.sendYcGameOver({
                  room_id:desk.name,
                  game_id:3,
                  score_list:desk.score_list
                });
                desk.play_index = 1;
              }else{
                desk.play_index++;
              }
            }
          }else{
            socket.emit("MESSAGE",'不能出这张牌~');
          }
        }
      })

      socket.on("PLAY_PASS",function(){
        const desk = self.getDesk(socket);
        if(desk){
          if(desk.state != 1){
            return;
          }
          var curPosId = self.getPosId(socket);
          self.makePass(desk,curPosId);
        }
      });

      socket.on("PREPARE",function(){

        var isStartGame = false;
        var ready_count = 0;
        const desk = self.getDesk(socket);
        if(desk){
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
              desk.ready_count == 3 && ready_count == 3 ||
              desk.ready_count == 4 && ready_count == 4 ){
            desk.ready_count = ready_count;
           
            isStartGame = true;
          }

          self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),{posId:self.getPosId(socket),server_time:getTimeStamp()});
          if(isStartGame && desk.state == 0)
          {
            desk.state = 1;//开始游戏
            desk.direct = 1;//顺时针方向
            desk.cards = self.createCards();
            desk.cur_posId = self.getRandomNumForRange(ready_count-1);
            desk.out_cards = [];
            desk.start_time = getTimeStamp();
            const top = self.getNumberCard(desk.cards);
            desk.out_cards.push(top);

            if(desk.play_index == 1){
                desk.score_list = [];
            }
            
            //分数初始化
            var score_list = {};
            for (let i = 0; i < ready_count; i++) {
              const userObj = desk.positions[i];
              score_list[userObj.posId] = userObj.score;
            }
            for (let i = 0; i < ready_count; i++) {
                const userObj = desk.positions[i];
                userObj.cards = [];
                //debug
                for (let k = 0; k < 7; k++) {
                  userObj.cards.push(desk.cards.shift());
                }
              self.socketEmit(userObj,'GAME_START',{score_list:score_list,cards:userObj.cards,top:top,turn:desk.cur_posId,server_time:desk.start_time});
            }
          }
        }
      });

      socket.on('disconnect', function(){

        for (let i = 0; i < self.desks.length; i++) {
          // 不要清空观众socket
          // delete self.desks[i].ob_socket_map[socket.id];

          for (let j = 0; j < self.desks[i].positions.length; j++) {

            var userObj = self.desks[i].positions[j];

            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id){

              console.log('用户 '+userObj.name+" "+userObj.uid+' 断线');

              //记录掉线时间
              delete self.clients[userObj.uid];
              userObj.socket = null;
              userObj.disconnectTime = getTimeStamp();
              
              //通知其他人 该玩家掉线了
              self.broadCastRoom("CONNECT_STATE",self.desks[i].deskId,{state:0,posId:userObj.posId},userObj.uid);
              return;
            }
          }
        }
      });
    });

    http.listen(game_port, function(){
      console.log('listening on :'+game_port);
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init();

app.get('/uno/quit',function(req,res){
  const uid = req.query.uid;
  var deskId = gameServer.clearRoomByUid(uid);
  console.log("清空房间:"+deskId);
  res.send({state:0,msg:"退出成功",uid:uid});
})