const os = require('os');
//本地调试
var ioParam = {path:'/voice_socket.io'};
if(getCurrentIP().indexOf("192.168") != -1){
  ioParam = null;
}
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,ioParam);
app.use(express.static(`${__dirname}/../voicejump_client`));
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
        chequer:[],
      }
      for(var y = 0;y<15;y++) {
        for (var x = 0; x < 15; x++) {
          desk.chequer.push({tag:y*15+x,state:-1,idx:-1}); //state -1 没棋子  1 白色棋  0黑色棋
        }
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
  checkTimeGameOver:function(){
    for (let _i = 0, len = this.desks.length; _i < len; _i++) {
      var desk = this.desks[_i];
      if(desk.state == 1) {
        if (Date.parse(new Date()) / 1000 - desk.start_time > 5 * 60){ //最多玩5分钟
          this.gameOver(desk);
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
  gameOver:function(desk){
    var score_list = [];
    for (let j = 0; j < desk.positions.length; j++) {
      var userObj = desk.positions[j];
      if(userObj.uid > 0) {
        score_list.push({posId: j, score: userObj.gain_score, name: userObj.name});
      }
    }
    score_list.sort((a, b) => b.score - a.score);

    for (let i = 0; i < desk.positions.length; i++) {
      desk.positions[i].state = 1;
    }
    desk.state = 0;
    this.broadCastRoom("GAME_OVER",desk.deskId,score_list);
  },
  checkDisconnect:function(){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {

        var userObj = this.desks[i].positions[j];

        if(userObj.disconnectTime > 0 && Math.floor(new Date().getTime() / 1000) - userObj.disconnectTime >= 180){
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

    setInterval(function(){
      self.checkTimeGameOver();
    },1000);

    const self = this;
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

              if(self.checkUserLogin(obj.uid)){
                socket.emit("MESSAGE",'玩家'+obj.name+'已登录');
                return;
              }

                self.clients[obj.uid] = socket;

                if(room.play_mode == -1){
                  room.play_mode = obj.play_mode;
                  room.play_count = obj.play_count;
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
                  play_mode:room.play_mode,
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
        const desk = self.getDesk(socket);
        var prepare_posId = null;
        for (let j = 0; j < desk.positions.length; j++) {
          const userObj = desk.positions[j];
          if(userObj.state == 1 && userObj.socket && userObj.socket.id == socket.id){
            desk.positions[j].state = 2;
            prepare_posId = userObj.posId;
          }
          if(desk.positions[j].state == 2){
            ready_count++;
          }
        }

        if(desk.play_mode == 1 && ready_count == 1 ||
            desk.play_mode == 2 && ready_count == 2 ||
            desk.play_mode == 3 && ready_count == 3 ||
            desk.play_mode == 4 && ready_count == 4 ){
          desk.ready_count = ready_count;
          desk.state = 1;//开始游戏
          isStartGame = true;
        }

        self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),prepare_posId);
        if(isStartGame)
        {
          desk.start_time = Date.parse(new Date()) / 1000;
          self.broadCastRoom("GAME_START",self.getDeskId(socket),{level:1});
          for (let j = 0; j < desk.positions.length; j++) {
            desk.positions[j].gain_score = 0;
            desk.positions[j].refreshData = {game_type:'normal',posId:j};
          }
        }
      });

      socket.on("BIRD_MOVE",function(data){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        if(desk.positions[posId].refreshData.game_type != "fall"){
          self.broadCastRoom("BIRD_MOVE_SUCCESS",self.getDeskId(socket),{type:data.type,posId:posId,cur_x:data.cur_x,cur_y:data.cur_y});
        }
      });

      socket.on("FALL_OVER",function(){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        desk.positions[posId].refreshData.game_type = 'fall';
        self.broadCastRoom("FALL_OVER_SUCCESS",self.getDeskId(socket),posId);

        var fall_num = 0;
        var player_num = 0;
        for (let i = 0; i < desk.positions.length; i++) {
          if(desk.positions[i].uid > 0){
            if(desk.positions[i].refreshData.game_type == 'fall'){
              fall_num ++ ;
            }
            player_num ++;
          }
        }
        //全部掉落
        if(fall_num == player_num){
          self.gameOver(desk);
        }
      });


      socket.on("GAIN_SCORE",function(data){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        desk.positions[posId].gain_score = data;

        self.broadCastRoom("GAIN_SCORE_SUCCESS",self.getDeskId(socket),{posId:posId,gain_score:data});
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
            }
          }
        }
      });
    });

    http.listen(9007, function(){
      console.log('listening on :9007');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
