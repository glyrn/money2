const crypto = require('crypto');
const os = require('os');
const https = require('https');
const fs = require('fs');
const _ = require('lodash');
//本地调试
var ioParam = {path:'/zgxq_socket.io'};
var isDebug = false;
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

function GameServer() {

  this.desks = this.createDeskList(150);
  this.clients = {};

  this.onlineUser = {}
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
    return (new Date()).toLocaleTimeString();
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
        play_mode:-1,
        play_count:0,
        base_score:100,
        play_index:0,
      }
      for (let j = 0; j < 2; j++) {
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
    // if(data instanceof Object){//深复制data
    //   saveData = JSON.parse(JSON.stringify(data));
    // }
    saveData = _.cloneDeep(data);
    for (const ob_uid in userObj.ob_socket_map) {
      userObj.ob_socket_map[ob_uid].emit(event,saveData);
    }
    userObj.recover_disconnect_data.push({event:event,data:saveData});
    userObj.socket.emit(event,saveData);
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
          this.broadCastRoom("SIT_CHANGE",this.desks[i].deskId,{target:null},userObj.uid);

          //检查是否全部掉线 是的话要重置房间
          var isClean = true;
          var winerPosId = 0;
          for (let k = 0; k < this.desks[i].positions.length; k++) {
            if(this.desks[i].positions[k].uid > 0 ){
              isClean = false;
              winerPosId = this.desks[i].positions[k].posId;
            }
          }
          if(isClean){
            this.desks[i].name = '';
            this.desks[i].state = 0;
            this.desks[i].play_index = 0;
            this.desks[i].play_mode = -1;
          }else{
            // 还剩一个
            this.broadCastRoom('GAME_OVER',this.desks[i].deskId,{winer:winerPosId,score:0});
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
            this.desks[i].play_mode = -1;
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
          //广播其他所有人 该玩家上线了
          this.broadCastRoom("CONNECT_STATE",roomObj.deskId,{state:1,posId:userObj.posId},userObj.uid);
          return true;
        }
      }
    }
    //是观众
    if(obj.ob_uid){
      console.log("观众："+obj.uid+" 等待玩家:"+obj.ob_uid)
      return true;
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

    const self = this;
    io.on('connection', function(socket){

      console.log('有客户端接入，时间： %s', self.time());

      socket.on('LOGIN',function(obj){

          var room = self.getDeskByName(obj.room);
          if(room) {
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

              console.log(obj.name, '进入房间', room.name,room.deskId,obj.posId);

              self.clients[obj.uid] = socket;

              room.play_mode = obj.play_mode;
              room.play_count = obj.play_count;

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

              self.socketEmit(userObj,"LOGIN_SUCCESS",{
                roomId:room.name,
                play_mode:room.play_mode,
                play_count:room.play_count,
                self:obj,
                target:target,
              });

              self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj},obj.uid);
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
          if(room){
            room.turn = 0;
            self.broadCastRoom("GAME_START",self.getDeskId(socket),room.turn);

            room.play_index++;
            if(room.play_index > room.play_count){
              room.play_index -= room.play_count;
            }
            //重置成绩
            if(room.play_index == 1){
              room.score_list = [];
            }
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

              //通知其他人 该玩家掉线了
              self.broadCastRoom("CONNECT_STATE",self.desks[i].deskId,{state:0,posId:userObj.posId},userObj.uid);
              return;
            }
          }
        }
      });
      socket.on('PLAY_CHESS', function(data){
        var desk = self.getDesk(socket);
        if(desk){
          self.broadCastRoom("PLAY_CHESS_SUCCESS",desk.deskId,data);
        }
      });

      socket.on("RETRACK_CHESS_RSP",function(option){

        var room = self.getDesk(socket);
        if(room){
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
        }
      })
      socket.on("RETRACK_CHESS",function(){

        var room = self.getDesk(socket);
        if(room){
          var uid = self.getUid(socket);
          if(room.play_mode == 1) { //人人对战
            for (let i = 0; i < room.positions.length; i++) {
              if (room.positions[i].state > 0 && room.positions[i].uid != uid) {
                var room_target = room.positions[i];
                if(room_target.socket){
                  self.socketEmit(room_target,'RETRACK_CHESS_REQ');
                }
              }
            }
          }
        }
      });

      socket.on('REQ_GAME_OVER',function(data){
        var room = self.getDesk(socket);
        if(room){
          var score_list = [];
          for (let i = 0; i < room.positions.length; i++) {
            room.positions[i].state = 1;
            var score = 0;
            var is_win = 0;
            //胜利得10分
            if(data.winer == room.positions[i].posId){
              score = 10;
              is_win = 1;
            }else{
              score = 0;
              is_win = 0;
            }
            score_list.push({
              uid:room.positions[i].uid,
              name:room.positions[i].name,
              avatorUrl:room.positions[i].avatorUrl,
              score:score,
              is_win:is_win
            })
          }
          if(!room.score_list) room.score_list = [];
          room.score_list.push({play_index:room.play_index,score_list:score_list})
          
          if(room.play_index == room.play_count){
            //发送给云村数据
            this.sendYcGameOver({
              room_id:room.name,
              game_id:5,
              score_list:room.score_list
            });
          }
        }
      })

    });

    http.listen(game_port, function(){
      console.log('listening on :'+game_port);
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()

app.get('/zgxq/quit',function(req,res){
  const uid = req.query.uid;
  res.send({state:0,msg:"退出成功",uid:uid});
  //踢出房间
  gameServer.checkChangeRoom(-1,uid);
})