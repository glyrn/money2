const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http);
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
                  play_count:room.play_count,
                  playerData:playerData,
                });
                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)
              }
              // try {
              //   var path = `${__dirname}/../gobang_client/avator/${obj.uid}.jpg`;
              //   if(!fs.existsSync(path)) {
              //     //下载头像
              //     request(obj.avatorUrl).pipe(fs.createWriteStream(path)).on('close', next);
              //   }else{
                  next();
              //   }
              // }catch (e){
              //   console.log('下载头像失败：'+obj.avatorUrl);
              //   console.log(e.message);
              //   next();
              // }

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

        if(desk.play_mode == 1 && ready_count == 2 ||
            desk.play_mode == 2 && ready_count == 4 ){
          desk.ready_count = ready_count;
          desk.state = 1;//开始游戏
          isStartGame = true;
        }

        self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),prepare_posId);
        if(isStartGame)
        {
          self.broadCastRoom("GAME_START",self.getDeskId(socket),{level:1});

          if(desk.handleLoopTimer){
            clearInterval(desk.handleLoopTimer);
            desk.handleLoopTimer = null;
          }
          desk.mapInfo = {x:0,last_x:0};
          desk.handleLoopTimer=setInterval(()=>{
            desk.mapInfo.last_x = desk.mapInfo.x;
            desk.mapInfo.x = desk.mapInfo.last_x - 200;
            desk.mapInfo.duration = 2;
            self.broadCastRoom("REFRESH_MAP",self.getDeskId(socket),{mapInfo:desk.mapInfo});
          }, desk.mapInfo.duration * 1000);
        }
      });

      socket.on("BIRD_RISE",function(){

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

    http.listen(8001, function(){
      console.log('listening on :8001');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
