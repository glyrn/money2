const crypto = require('crypto');
const os = require('os');
const https = require('https');
const fs = require('fs');
const _ = require('lodash');
//本地调试
var isDebug = false;
var ioParam = {path:'/voice_socket.io'};
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
        ready_count:-1,
        play_count:0,
        base_score:100,
        play_index:0,
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
    var winer = score_list[0].posId;
    var ycscore_list = [];
    for (let i = 0; i < desk.positions.length; i++) {
      desk.positions[i].state = 1;
      if(desk.positions[i].uid >0) {
        ycscore_list.push({
          uid: desk.positions[i].uid,
          name: desk.positions[i].name,
          score: desk.positions[i].gain_score,
          is_win: winer == i ? 1 : 0,
          avatorUrl:desk.positions[i].avatorUrl,
        })
      }
    }
    desk.state = 0;
    this.broadCastRoom("GAME_OVER",desk.deskId,score_list);
    if(!desk.score_list) desk.score_list = [];
    desk.score_list.push({play_index:desk.play_index,score_list:ycscore_list});
    if(desk.play_index == desk.play_count){
      this.sendYcGameOver({
        room_id:desk.name,
        game_id:8,
        score_list:desk.score_list,
      });
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
            this.desks[i].ready_count = -1;
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
          this.broadCastRoom("SIT_CHANGE",roomObj.deskId,{target:null,posId:userObj.posId},userObj.uid);

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
          }
        }
      }
    }
  },
  clearRoomByUid:function(uid){
    var deskId = 0;
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
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
      desk.play_index = 0;
      desk.ready_count = -1;
    }
    return deskId;
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
          console.log("恢复数据：")
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

    setInterval(function(){
      self.checkTimeGameOver();
    },1000);

    const self = this;
    io.on('connection', function(socket){

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
              console.log(obj.name+"使用重连数据进入房间");
              //推送恢复数据
              return;
            }
            console.log(obj.name+"尝试进入房间");
            var userObj = null;

            room.ready_count = obj.ready_count;
            room.play_count = obj.play_count;

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

                var playerData = {};
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
                  play_count:room.play_count,
                  playerData:playerData,
                });
                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)

            }else{
              var uids = "";
              for (let i = 0; i < room.positions.length; i++) {
                uids += room.positions[i].uid +",";
              }
              socket.emit("MESSAGE",'房间已满员 '+room.name+" "+uids);
            }
          }
      })

      socket.on("PREPARE",function(){

        var isStartGame = false;
        var ready_count = 0;
        const desk = self.getDesk(socket);
        if(desk){
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

          if(desk.ready_count == ready_count ){
            desk.state = 1;//开始游戏
            isStartGame = true;
          }

          self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),prepare_posId);
          if(isStartGame)
          {
            desk.play_index++;
            if(desk.play_index > desk.play_count){
              desk.play_index -= desk.play_count;
            }
            //重置成绩
            if(desk.play_index == 1){
              desk.score_list = [];
            }
            
            desk.start_time = Date.parse(new Date()) / 1000;
            self.broadCastRoom("GAME_START",self.getDeskId(socket),{level:1,start_time:parseInt(desk.start_time)});
            for (let j = 0; j < desk.positions.length; j++) {
              desk.positions[j].gain_score = 0;
              desk.positions[j].refreshData = {game_type:'normal',posId:j};
            }
          }
        }
      });

      socket.on("BIRD_MOVE",function(data){
        const desk = self.getDesk(socket);
        if(desk){
          var posId = self.getPosId(socket);
          if(desk.positions[posId] && desk.positions[posId].refreshData && desk.positions[posId].refreshData.game_type != "fall"){
            self.broadCastRoom("BIRD_MOVE_SUCCESS",self.getDeskId(socket),{type:data.type,posId:posId,cur_x:data.cur_x,cur_y:data.cur_y});
          }
        }
      });

      socket.on("FALL_OVER",function(data){
        const desk = self.getDesk(socket);
        if(desk){
          var posId = self.getPosId(socket);
          desk.positions[posId].refreshData.game_type = 'fall';
          self.broadCastRoom("FALL_OVER_SUCCESS",self.getDeskId(socket),{type:4,posId:posId,x:data.cur_x,y:data.cur_y});

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
        }
      });


      socket.on("GAIN_SCORE",function(data){
        const desk = self.getDesk(socket);
        if(desk){
          var posId = self.getPosId(socket);
          desk.positions[posId].gain_score = data;

          self.broadCastRoom("GAIN_SCORE_SUCCESS",self.getDeskId(socket),{posId:posId,gain_score:data});
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
    });

    http.listen(game_port, function(){
      console.log('listening on 0702 :'+game_port);
    });
  }
}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()

app.get('/voice/quit',function(req,res){
  const uid = req.query.uid;
  var deskId = gameServer.clearRoomByUid(uid);
  console.log("清空房间:"+deskId);
  res.send({state:0,msg:"退出成功",uid:uid});
})