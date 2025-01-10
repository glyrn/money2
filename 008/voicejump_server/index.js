const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,{path:'/voice_socket.io'});
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
  gameOver:function(desk){
    var score_list = [];
    for (let j = 0; j < desk.positions.length; j++) {
      var userObj = desk.positions[j];
      score_list.push({posId:j,score:userObj.gain_score,name:userObj.name});
    }
    score_list.sort((a, b) => b.score - a.score);

    for (let i = 0; i < desk.positions.length; i++) {
      desk.positions[i].state = 1;
    }
    this.broadCastRoom("GAME_OVER",desk.deskId,score_list);
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

          var refresh_list = [];
          for (let j = 0; j < desk.positions.length; j++) {
            desk.positions[j].gain_score = 0;
            desk.positions[j].refreshData = {game_type:'normal',speedX:300,posId:j};
            refresh_list.push(desk.positions[j].refreshData);
          }

          self.broadCastRoom("REFRESH_DATA",self.getDeskId(socket),refresh_list);
        }
      });

      socket.on("BIRD_RISE",function(data){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        if(desk.positions[posId].refreshData.game_type != "fall"){
          self.broadCastRoom("BIRD_RISE_SUCCESS",self.getDeskId(socket),{type:data.type,posId:posId});
        }
      });

      socket.on("FALL_OVER",function(){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        desk.positions[posId].refreshData.game_type = 'fall';
        desk.positions[posId].refreshData.speedX = 0;
        self.broadCastRoom("FALL_OVER_SUCCESS",self.getDeskId(socket),posId);
        self.broadCastRoom("REFRESH_DATA",self.getDeskId(socket),[desk.positions[posId].refreshData]);

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

      socket.on("PAUSE_OVER",function(data){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        desk.positions[posId].refreshData.game_type = 'pause';
        desk.positions[posId].refreshData.speedX = 0;
        if(desk.positions[posId].pause_over_timer){
          clearInterval(desk.positions[posId].pause_over_timer);
          desk.positions[posId].pause_over_timer = null;
        }
        desk.positions[posId].pause_over_timer = setTimeout(function(){
          //恢复飞行
          if(desk.positions[posId].refreshData.game_type == 'pause') {
            desk.positions[posId].refreshData.game_type = 'normal';
            desk.positions[posId].refreshData.speedX = 300;
            self.broadCastRoom("REFRESH_DATA", self.getDeskId(socket), [desk.positions[posId].refreshData]);
          }
        },1500)
        self.broadCastRoom("PAUSE_OVER_SUCCESS",self.getDeskId(socket),{posId:posId});
        self.broadCastRoom("REFRESH_DATA",self.getDeskId(socket),[desk.positions[posId].refreshData]);
      })

      socket.on("GAIN_SCORE",function(data){
        const desk = self.getDesk(socket);
        var posId = self.getPosId(socket);
        desk.positions[posId].gain_score = data;

        self.broadCastRoom("GAIN_SCORE_SUCCESS",self.getDeskId(socket),{posId:posId,gain_score:data});

        if(data >= 100){
          self.gameOver(desk);
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

    http.listen(9007, function(){
      console.log('listening on :9007');
    });
  }

}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()
