const fs = require('fs');
const request = require('request')
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,{path:'/fxq_socket.io'});
app.use(express.static(`${__dirname}/../flychess_client`));
app.use(express.static(`${__dirname}/../flychess_client/avator`));
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
          finish_chess:{0:0,1:0,2:0,3:0},
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

  checkOver:function(roomId,posId){
    var desk = this.getDeskById(roomId);
    var finish_count = 0;

    var win_num;
    if(desk.play_mode == 1 || desk.play_mode == 0){
      win_num = 4;
    }else if(desk.play_mode == 2){
      win_num = 1;
    }
    for (let i = 0; i < 4; i++) {
      if(desk.positions[posId].finish_chess[i] == 1){
        finish_count++;
      }
    }

    return finish_count == win_num;
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
                  room.play_mode = obj.play_mode;
                  room.play_count = obj.play_count;
                }

                var playerData = {};
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
                  play_count:room.play_count,
                  playerData:playerData,
                });
                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)
              }

              try {
                var path = `${__dirname}/../flychess_client/avator/${obj.uid}.jpg`;
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

      socket.on("PREPARE",function(){

        var isStartGame = false;
        var ready_count = 0;
        var desk = self.getDesk(socket);
        for (let j = 0; j < desk.positions.length; j++) {
          var userObj = desk.positions[j];
          if(userObj.state == 1 && userObj.socket && userObj.socket.id == socket.id){
            desk.positions[j].state = 2;
          }
          if(desk.positions[j].state == 2){
            ready_count++;
          }
        }

        if(desk.play_mode == 0 && ready_count == 4 ||
            desk.play_mode == 1 && ready_count == 4 ||
            desk.play_mode == 2 && ready_count == 2){
          desk.state = 1;//开始游戏
          isStartGame = true;
        }

        self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),self.getPosId(socket));
        if(isStartGame)
        {

          desk.cur_posId = self.getRandomNumForRange(ready_count-1);
          var bomb_idxs = {};
          for (let i = 0; i < 6; i++) {
            bomb_idxs[self.getRandomNumForRange(51)] = 1;
          }
          self.broadCastRoom("GAME_START",self.getDeskId(socket),{posId:desk.cur_posId,bomb_idxs:bomb_idxs});
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
              self.desks[i].positions[j].finish_chess = {0:0,1:0,2:0,3:0};
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
      socket.on('MAKE_DICE_NUM', function(){
        var posId = self.getPosId(socket);
        var num = self.getRandomNumForRange(5)+1;
        var desk = self.getDesk(socket);
        if(desk.state == 1){
          desk.cur_dice_num = num;
          self.broadCastRoom("MAKE_DICE_NUM_SUCCESS",self.getDeskId(socket),{num:num,posId:posId});
        }
      });
      socket.on('PLAY_MOVE_STEP',function(data){
        data.posId = self.getPosId(socket);
        self.broadCastRoom("PLAY_MOVE_STEP_SUCCESS",self.getDeskId(socket),data);
      });
      socket.on('FINISH_CHESS',function(data){
        var desk = self.getDesk(socket);
        var posId = data.posId;
        desk.positions[posId].finish_chess[data.idx] = 1;

        if(self.checkOver(desk.deskId,posId) && desk.state == 1){
          desk.state = 2; //游戏结束
          var score_list = {};
          for (let i = 0; i < desk.positions.length; i++) {
            if(desk.positions[i].state == 2){
              var score = 0;
              for (const k in desk.positions[i].finish_chess) {
                 if(desk.positions[i].finish_chess[k] == 1){
                   score += 10;
                 }
              }
              score_list[desk.positions[i].posId] = score;
              desk.positions[i].state = 1;
              desk.positions[i].finish_chess = {0:0,1:0,2:0,3:0};
            }
          }
          self.broadCastRoom("GAME_OVER",desk.deskId,{winer:posId,score_list:score_list});
        }
      });
      socket.on('NEXT_PLAYER_DICE',function(){
        var desk = self.getDesk(socket);
        if(desk.cur_dice_num != 6){
          desk.cur_posId++;
        }
        var count = 0;
        for (let i = 0; i < desk.positions.length; i++) {
          if(desk.positions[i].state == 2){ //游戏中
            count++;
          }
        }
        if(desk.cur_posId >= count){
          desk.cur_posId = 0;
        }
        self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{posId:desk.cur_posId});
      })
    });

    http.listen(8003, function(){
      console.log('listening on :8003');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
