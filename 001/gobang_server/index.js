const os = require('os');
//本地调试
var ioParam = {path:'/wzq_socket.io'};
var isDebug = false;
if(getCurrentIP().indexOf("192.168") != -1){
  ioParam = null;
  isDebug = true;
}
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,ioParam);
app.use(express.static(`${__dirname}/../gobang_client`));
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
        play_index:0,
        chequer:[],
      }
      for(var y = 0;y<15;y++) {
        for (var x = 0; x < 15; x++) {
          desk.chequer.push({tag:y*15+x,state:-1,idx:-1}); //state -1 没棋子  1 白色棋  0黑色棋
        }
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
  checkOver:function(roomId,tag,posId){
    var checkState = posId == 0 ? 1 : 0;
    var chequer = this.getDeskById(roomId).chequer;
    var x0 = tag % 15;
    var y0 = parseInt(tag / 15);
    //判断横向
    var fiveCount = 0;
    for(var x = 0;x < 15;x++){

      if((chequer[y0*15+x].state == checkState)){
        fiveCount++;
        if(fiveCount==5){
          this.gameOver(roomId,tag,posId)
          return true;
        }
      }else{
        fiveCount=0;
      }
    }
    //判断纵向
    fiveCount = 0;
    for(var y = 0;y < 15;y++){
      if(chequer[y*15+x0].state == checkState){
        fiveCount++;
        if(fiveCount==5){
          this.gameOver(roomId,tag,posId)
          return true;
        }
      }else{
        fiveCount=0;
      }
    }
    //判断右上斜向
    var f = y0 - x0;
    fiveCount = 0;
    for(var x = 0;x < 15;x++){
      if(f+x < 0 || f+x > 14){
        continue;
      }
      if(chequer[(f+x)*15+x].state == checkState){
        fiveCount++;
        if(fiveCount==5){
          this.gameOver(roomId,tag,posId)
          return true;
        }
      }else{
        fiveCount=0;
      }
    }
    //判断右下斜向
    f = y0 + x0;
    fiveCount = 0;
    for(var x = 0;x < 15;x++){
      if(f-x < 0 || f-x > 14){
        continue;
      }
      if(chequer[(f-x)*15+x].state == checkState){
        fiveCount++;
        if(fiveCount==5){
          this.gameOver(roomId,tag,posId)
          return true;
        }
      }else{
        fiveCount=0;
      }
    }
  },
  gameOver:function(roomId,tag,posId){
    // console.log('胜利',roomId,tag,posId);
    const desk = this.getDeskById(roomId);
    desk.state = 0;
    if(desk.play_mode == 1) { // 人人对战
      for (let i = 0; i < desk.positions.length; i++) {
        desk.positions[i].state = 1;
      }
    }
    for (let i = 0; i < desk.chequer.length; i++) {
      desk.chequer[i].state = -1;
    }
    this.broadCastRoom('GAME_OVER',desk.deskId,{winer:posId,score:10});
  },

  broadCastRoom:function(event,roomId,data,except){
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      if(roomObj.deskId == roomId){
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
          //在线 或 断线中
          if(userObj.socket || userObj.disconnectTime > 0){
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
              for (let k = 0; k < this.desks[i].chequer.length; k++) {
                this.desks[i].chequer[k].state = -1;
                this.desks[i].chequer[k].idx = -1;
              }
              this.desks[i].name = '';
              this.desks[i].state = 0;
              this.desks[i].play_index = 0;
              this.desks[i].play_mode = -1;
          }else{
            for (let k = 0; k < this.desks[i].chequer.length; k++) {
              this.desks[i].chequer[k].state = -1;
              this.desks[i].chequer[k].idx = -1;
            }
            // 还剩一个
            this.broadCastRoom('GAME_OVER',this.desks[i].deskId,{winer:winerPosId,score:10});
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
            for (let k = 0; k < this.desks[i].chequer.length; k++) {
              this.desks[i].chequer[k].state = -1;
              this.desks[i].chequer[k].idx = -1;
            }
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

    io.on('connection', socket => {
      socket.on('pong', function(data){
      });

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

              if(self.checkUserLogin(obj.uid)){
                self.socketEmit(userObj,"MESSAGE",'玩家'+obj.name+'已登录');
                return;
              }

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

              self.socketEmit(userObj,"LOGIN_SUCCESS",{
                roomId:room.name,
                play_mode:room.play_mode,
                play_count:room.play_count,
                self:obj,
                target:target,
              });

              self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj},obj.uid)

            }else{
              socket.emit("MESSAGE",'房间已满员');
            }
          }
      })

      socket.on("PREPARE",function(){
        var roomObj = self.getDesk(socket);
        var isStartGame = false;
        var ready_count = 0;
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
          if(userObj.state == 1 && userObj.socket && userObj.socket.id == socket.id){
            roomObj.positions[j].state = 2;
          }
          if(roomObj.positions[j].state == 2){
            ready_count++;
          }
        }
        if(roomObj.play_mode == 0 && ready_count == 1){ //人机
          roomObj.state = 1;//开始游戏
          isStartGame = true;
        }else if(roomObj.play_mode == 1 && ready_count == 2){ //人人
          roomObj.state = 1;//开始游戏
          isStartGame = true;
        }
        self.broadCastRoom("PREPARE_SUCCESS",roomObj.deskId,self.getUid(socket));
        if(isStartGame)
        {
          roomObj.play_index++;
          if(roomObj.play_index > roomObj.play_count){
            roomObj.play_index -= roomObj.play_count;
          }
          self.broadCastRoom("GAME_START",self.getDeskId(socket),1);
        }
      });

      socket.on('disconnect', function(){

        for (let i = 0; i < self.desks.length; i++) {
          for (let j = 0; j < self.desks[i].positions.length; j++) {
            var userObj = self.desks[i].positions[j];

            //待删旁观uid
            var del_ob_uid = [];
            for (const ob_uid in userObj.ob_socket_map) {
                if(userObj.ob_socket_map[ob_uid].id == socket.id){
                  del_ob_uid.push(ob_uid);
                }
            }
            for (let k = 0; k < del_ob_uid.length; k++) {
                delete userObj.ob_socket_map[del_ob_uid[k]];
            }
            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id){

              console.log('用户 '+userObj.name+" "+userObj.uid+' 断线');
              //记录掉线时间
              delete self.clients[userObj.uid];
              userObj.socket = null;
              userObj.disconnectTime = Math.floor(new Date().getTime() / 1000);
            }
          }
        }
      });
      socket.on('PLAY_CHESS', function(tag){
        var desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        var count_chess_state = 0;
        for (let i = 0; i < desk.chequer.length; i++) {
          if(desk.chequer[i].state != -1){
            count_chess_state++;
          }
        }
        var isOk = false;
        for (let i = 0; i <  desk.chequer.length; i++) {
          if(desk.chequer[i].tag == tag && desk.chequer[i].state == -1){
            if(posId == 0){
              desk.chequer[i].state = 1; //1白色 0黑色
            }else{
              desk.chequer[i].state = 0; //1白色 0黑色
            }
            desk.chequer[i].idx = count_chess_state;
            var day = new Date().toLocaleDateString()
            var time = new Date().toLocaleTimeString('chinese', { hour12: false })
            desk.chequer[i].day_time = day + " "+time;
            isOk = true;
          }
        }
        if(!isOk){
          self.socketEmit(desk.positions[posId],'MESSAGE','该位置已有棋！');
        }else{
          self.broadCastRoom("PLAY_CHESS_SUCCESS",desk.deskId,{posId:posId,tag:tag});
          self.checkOver(desk.deskId,tag,posId);
        }
      });

      socket.on("RETRACK_CHESS_RSP",function(option){

        var room = self.getDesk(socket);
        var uid = self.getUid(socket);

        if(option == 1){ //同意悔棋

          var target_posId_state;
          var target_posId;
          for (let i = 0; i < room.positions.length; i++) {
            if (room.positions[i].state > 0 && room.positions[i].uid != uid) {
              var room_target = room.positions[i];
              target_posId = room_target.posId;
              if(room_target.posId == 0){
                target_posId_state = 1;
              }else{
                target_posId_state = 0;
              }
            }
          }

          var target_max_idx = -1;

          for (let i = 0; i < room.chequer.length; i++) {
            if(target_posId_state == room.chequer[i].state){ //找到对方的棋子
              target_max_idx = Math.max(target_max_idx,room.chequer[i].idx);
            }
          }

          var del_list = [];
          for (let i = 0; i < room.chequer.length; i++) {
            if(room.chequer[i].idx >= target_max_idx){
              del_list.push(room.chequer[i].tag);
              room.chequer[i].idx = -1;
              room.chequer[i].state = -1;
            }
          }
          var now_idx = target_max_idx - 1;
          var now_tag = -1;
          for (let i = 0; i < room.chequer.length; i++) {
            if(room.chequer[i].idx == now_idx){
              now_tag = room.chequer[i].tag;
            }
          }
          self.broadCastRoom("RETRACK_CHESS_RSP_SUCCESS",room.deskId,{del_list:del_list,posId:target_posId,now_tag:now_tag});
        }else{
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
                self.socketEmit(room_target,'RETRACK_CHESS_REQ')
              }
            }
          }
        }
      });
    });

    http.listen(9001, function(){
      console.log('listening on :9001');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
