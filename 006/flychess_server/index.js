const os = require('os');
//本地调试
var isDebug = false;
var ioParam = {path:'/fxq_socket.io'};
if(getCurrentIP().indexOf("192.168") != -1){
  ioParam = null;
  isDebug = true;
}
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,ioParam);
app.use(express.static(`${__dirname}/../flychess_client`));
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
          finish_chess:{0:0,1:0,2:0,3:0},
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
    userObj.socket.emit(event,saveData);
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
  makeNextPlayerDice:function(desk) {
    //游戏中
    if (desk.state == 1) {
      if (desk.cur_dice_num != 6) {
        desk.cur_posId++;
      }
      var count = 0;
      for (let i = 0; i < desk.positions.length; i++) {
        if (desk.positions[i].state == 2) { //游戏中
          count++;
        }
      }
      if (desk.cur_posId >= count) {
        desk.cur_posId = 0;
      }
      this.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS", desk.deskId, {posId: desk.cur_posId});

      //如果下一个是掉线ing 则继续跳下一个
      var nextUserObj = this.getPositionByPosId(desk, desk.cur_posId);
      if (nextUserObj.disconnectTime > 0) {
        this.makeNextPlayerDice(desk);
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
            this.desks[i].play_mode = -1;
            this.desks[i].ready_count = -1;
          }else{
            this.broadCastRoom("GAME_OVER", this.desks[i].deskId, {invalid:1,winer: -1, score_list: []});
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
          socket.emit("SET_RECOVER_STATUS",{isRecover:true});
          for (let k = 0; k < userObj.recover_disconnect_data.length; k++) {
            var emitObj = userObj.recover_disconnect_data[k];
            socket.emit(emitObj.event,emitObj.data);
          }
          socket.emit("SET_RECOVER_STATUS",{isRecover:false});
          return true;
        }
      }
    }
    return false;
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
            console.log(obj.name, '进入房间', room.name, room.deskId);

            var flag = false;
            //检测是否重连玩家
            if(self.checkRecover(socket,obj)){
              //推送恢复数据
              return;
            }
            var userObj = null;
            for (let i = 0; i < room.positions.length; i++) {
              userObj = room.positions[i];
              if (userObj.state == 0) {
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
                room.play_mode = obj.play_mode;
                room.ready_count = obj.ready_count;
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
              self.socketEmit(userObj,"LOGIN_SUCCESS",{
                roomId:room.name,
                posId:obj.posId,
                play_mode:room.play_mode,
                ready_count:room.ready_count,
                play_count:room.play_count,
                playerData:playerData,
              });
              self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)

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

        if(desk.ready_count == ready_count){
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
          for (let j = 0; j < self.desks[i].positions.length; j++) {

            var userObj = self.desks[i].positions[j];

            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id) {

              console.log('用户 ' + userObj.name + " " + userObj.uid + ' 断线');
              //记录掉线时间
              delete self.clients[userObj.uid];
              userObj.socket = null;
              userObj.disconnectTime = Math.floor(new Date().getTime() / 1000);
            }
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
        self.makeNextPlayerDice(desk);
      })
    });

    http.listen(9006, function(){
      console.log('listening on :9006');
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