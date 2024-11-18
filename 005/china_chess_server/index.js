const fs = require('fs');
const request = require('request')
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http);
app.use(express.static(`${__dirname}/../china_chess_client`));
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
      }
      for (let j = 0; j < 2; j++) {
        desk.positions.push({
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

    function setHeartbeat() {
      setTimeout(setHeartbeat, 5000);
      io.sockets.emit('ping', {beat: 1});
    }
    setTimeout(setHeartbeat, 5000);

    const self = this;
    io.on('connection', function(socket){

      console.log('有客户端接入，时间： %s', self.time());

      socket.on('LOGIN',function(obj){

          var room = self.getDeskByName(obj.room);
          if(room) {

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

              console.log(obj.name, '进入房间', room.name,room.deskId,obj.posId);

              if(self.checkUserLogin(obj.uid)){
                socket.emit("MESSAGE",'玩家'+obj.name+'已登录');
                return;
              }

              var next = function(){
                self.clients[obj.uid] = socket;

                if(room.play_mode == -1){
                  room.play_mode = obj.play_mode;
                  room.play_count = obj.play_count;
                }

                var target = null;
                if(room.play_mode == 1){ //人人对战
                  for (let i = 0; i < room.positions.length; i++) {
                    if(room.positions[i].state > 0 && room.positions[i].uid != obj.uid){
                      var room_target = room.positions[i];
                      target = {
                        uid : room_target.uid,
                        name : room_target.name,
                        avatorUrl : room_target.avatorUrl,
                        score : room_target.score,
                        posId: room_target.posId,
                        state : room_target.state,
                      }
                    }
                  }
                }

                socket.emit("LOGIN_SUCCESS",{
                  roomId:room.name,
                  play_mode:room.play_mode,
                  play_count:room.play_count,
                  self:obj,
                  target:target,
                });

                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj},obj.uid)
              }
              try {
                //下载头像
                var path = `${__dirname}/../china_chess_client/avator/${obj.uid}.jpg`;
                if(!fs.existsSync(path)){
                  request(obj.avatorUrl).pipe(fs.createWriteStream(path)).on('close',next);
                }else{
                  next();
                }
              }catch (e){
                console.log('下载头像失败：'+obj.avatorUrl);
                console.log(e.message)
                next()
              }

            }else{
              socket.emit("MESSAGE",'房间已满员');
            }
          }
      })

      socket.on("PREPARE",function(){

        var isStartGame = false;
        for (let i = 0; i < self.desks.length; i++) {
          var ready_count = 0;

          for (let j = 0; j < self.desks[i].positions.length; j++) {
            var userObj = self.desks[i].positions[j];
            if(userObj.state == 1 && userObj.socket && userObj.socket.id == socket.id){
              self.desks[i].positions[j].state = 2;
            }
            if(self.desks[i].positions[j].state == 2){
              ready_count++;
            }
          }

          if(self.desks[i].play_mode == 0 && ready_count == 1){ //人机
            self.desks[i].state = 1;//开始游戏
            isStartGame = true;
          }else if(self.desks[i].play_mode == 1 && ready_count == 2){ //人人
            self.desks[i].state = 1;//开始游戏
            isStartGame = true;
          }
        }

        self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),self.getUid(socket));
        if(isStartGame)
        {
          var room = self.getDesk(socket);
          room.turn = 0;
          self.broadCastRoom("GAME_START",self.getDeskId(socket),room.turn);
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

              delete self.clients[userObj.uid];

              self.desks[i].state = 0;

              self.broadCastRoom("MESSAGE",self.desks[i].deskId,'玩家'+userObj.name+'已掉线',userObj.uid);
              self.broadCastRoom("SIT_CHANGE",self.desks[i].deskId,{target:null},userObj.uid);
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
      socket.on('PLAY_CHESS', function(data){
        var desk = self.getDesk(socket);
        self.broadCastRoom("PLAY_CHESS_SUCCESS",desk.deskId,data);
      });

      socket.on("RETRACK_CHESS_RSP",function(option){

        var room = self.getDesk(socket);
        var uid = self.getUid(socket);

        var turn;
        if(option == 1){ //同意悔棋
          for (let i = 0; i < room.positions.length; i++) {
            if (room.positions[i].state > 0 && room.positions[i].uid != uid) {
              var room_target = room.positions[i];
              turn = room_target.posId;
            }
          }
          self.broadCastRoom("RETRACK_CHESS_RSP_SUCCESS",room.deskId,{turn:turn,agree:true});
        }else{
          self.broadCastRoom("RETRACK_CHESS_RSP_SUCCESS",room.deskId,{agree:false});
          self.broadCastRoom("MESSAGE",room.deskId,"对方不同意悔棋~",uid);
        }
      })
      socket.on("RETRACK_CHESS",function(){

        var room = self.getDesk(socket);
        var uid = self.getUid(socket);
        if(room.play_mode == 1) { //人人对战
          for (let i = 0; i < room.positions.length; i++) {
            if (room.positions[i].state > 0 && room.positions[i].uid != uid) {
              var room_target = room.positions[i];
              if(room_target.socket){
                room_target.socket.emit('RETRACK_CHESS_REQ');
              }
            }
          }
        }
      });

      socket.on('REQ_GAME_OVER',function(){
        var room = self.getDesk(socket);
        for (let i = 0; i < room.positions.length; i++) {
          room.positions[i].state = 1;
        }
      })

    });

    http.listen(8004, function(){
      console.log('listening on :8004');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
