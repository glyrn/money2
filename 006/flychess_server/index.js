const crypto = require('crypto');
const os = require('os');
const https = require('https');
const fs = require('fs');
const _ = require('lodash');
//本地调试
var isDebug = false;
var ioParam = {path:'/fxq_socket.io'};
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
        ready_count:-1,
        play_count:0,
        base_score:100,
        play_index:0,
        cur_posId:0,
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
          finish_chess:{0:0,1:0,2:0,3:0},
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
  getPosIdByUid:function(uid){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj.uid == uid) {
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
      if (desk.cur_posId >= desk.ready_count) {
        desk.cur_posId = 0;
      }
      this.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS", desk.deskId, {posId: desk.cur_posId});
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
  deprecateGame:function(desk){

    console.log("发送弃局！")
    this.broadCastRoom("GAME_OVER", desk.deskId, {invalid:1,winer: -1, score_list: []});
    desk.state = 0;
    desk.hadDeprecateGame = false;
    desk.deprecate_time = 0;

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
        game_id:6,
        score_list:desk.score_list,
      });
            
  },
  // 定时任务
  gameSchedule:function(){
    let self = this;
    for (let i = 0; i < this.desks.length; i++) {
      var desk = this.desks[i];
      //检测弃局
      if(desk.state == 0 && desk.deprecate_time > 0){

        desk.deprecate_time--;
        if(desk.deprecate_time > 0){
          // console.log(desk.deprecate_time)
        }else{ //时间到

          if(!desk.hadDeprecateGame){
              desk.hadDeprecateGame = true;

            this.deprecateGame(desk);
          }
        }
      }
    }
  },
  checkDisconnect:function(){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {

        var userObj = this.desks[i].positions[j];

        if(userObj.disconnectTime > 0 && Math.floor(new Date().getTime() / 1000) - userObj.disconnectTime >= (isDebug ? 180:180)){
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
            this.desks[i].name = '';
            this.desks[i].state = 0;
            this.desks[i].play_index = 0;
            this.desks[i].play_mode = -1;
            this.desks[i].ready_count = -1;
          }
            // this.broadCastRoom("GAME_OVER", desk.deskId, {invalid:1,winer: -1, score_list: []});
            // this.broadCastRoom("MESSAGE",desk.deskId,"中途有人逃跑本局成绩作废");
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
            this.desks[i].play_mode = -1;
          }

          let desk = this.desks[i];
          // this.broadCastRoom("GAME_OVER", desk.deskId, {invalid:1,winer: -1, score_list: []});
            // this.broadCastRoom("MESSAGE",desk.deskId,"中途有人逃跑本局成绩作废");
          this.deprecateGame(desk);

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
        userObj.finish_chess = {0:0,1:0,2:0,3:0};
        //清空断线重连信息
        userObj.recover_disconnect_data = [];
      }
      desk.name = '';
      desk.state = 0;
      desk.play_index = 0;
      desk.ready_count = -1;
      desk.ob_socket_map = {};
    }
    return deskId;
  },
  checkObUser:function(socket,roomObj,obj){
    if(obj.ob_uid){
        
        //预先保存观众socket
        roomObj.ob_socket_map[socket.id] = {socket:socket,uid:null};

        //推送其中一个在线玩家的数据
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
          if(userObj.uid > 0 && userObj.disconnectTime == null){
            
            //保存观众socket + uid
            roomObj.ob_socket_map[socket.id] = {socket:socket,uid:userObj.uid};

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
      if(userObj.uid == obj.uid){

        userObj.disconnectTime = null;
        userObj.socket = socket; //重连上
        this.clients[obj.uid] = socket;

        //重连恢复
        socket.emit("SET_RECOVER_STATUS",{isRecover:true});
        console.log("断线重连：");
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

    function setHeartbeat(){
      io.sockets.emit('ping',{beat:1});
    }
    setInterval(setHeartbeat,5000)

    function checkDisconnect(){
      self.checkDisconnect()
    }
    setInterval(checkDisconnect,5000)

    function gameSchedule(){
      self.gameSchedule();
    }
    setInterval(gameSchedule,1000);

    const self = this;
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
          
            room.play_mode = obj.play_mode;
            room.ready_count = obj.ready_count;
            room.play_count = obj.play_count;
            room.deprecate_time = 30;
            room.hadDeprecateGame = false;

            for (let i = 0; i < room.positions.length; i++) {
              userObj = room.positions[i];
              if (userObj.uid == 0) {
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
                play_mode:room.play_mode,
                ready_count:room.ready_count,
                play_count:room.play_count,
                playerData:playerData,
                server_time:getTimeStamp(),
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
        if(desk){
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
            //不要炸弹了
            // for (let i = 0; i < 6; i++) {
            //   bomb_idxs[self.getRandomNumForRange(51)] = 1;
            // }
            desk.play_index++;
            if(desk.play_index > desk.play_count){
              desk.play_index -= desk.play_count;
            }
            //重置成绩
            if(desk.play_index == 1){
              desk.score_list = [];
            }

            self.broadCastRoom("GAME_START",self.getDeskId(socket),{posId:desk.cur_posId,bomb_idxs:bomb_idxs});
          }
        }
      });

      socket.on('disconnect', function(){

        for (let i = 0; i < self.desks.length; i++) {
          // 不要清空观众socket
          // delete self.desks[i].ob_socket_map[socket.id];

          for (let j = 0; j < self.desks[i].positions.length; j++) {

            var userObj = self.desks[i].positions[j];

            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id) {

              //下一个玩家
              if(self.desks[i].cur_posId == userObj.posId){
                //重置点数
                self.desks[i].cur_dice_num = 5;
                self.broadCastRoom("MAKE_DICE_NUM_SUCCESS",self.desks[i].deskId,{num:5,posId:userObj.posId});

                self.makeNextPlayerDice(self.desks[i]);
              }

              //通知其他人 该玩家掉线了
              self.broadCastRoom("CONNECT_STATE",self.desks[i].deskId,{state:0,posId:userObj.posId},userObj.uid);

              console.log('用户 ' + userObj.name + " " + userObj.uid + ' 断线');
              //记录掉线时间
              delete self.clients[userObj.uid];
              userObj.socket = null;
              userObj.disconnectTime = Math.floor(new Date().getTime() / 1000);

              return;
            }
          }
        }
      });
      socket.on('MAKE_DICE_NUM', function(){
        var posId = self.getPosId(socket);
        var num = self.getRandomNumForRange(5)+1;
        var desk = self.getDesk(socket);
        if(desk && desk.state == 1){
          desk.cur_dice_num = num;
          self.broadCastRoom("MAKE_DICE_NUM_SUCCESS",self.getDeskId(socket),{num:num,posId:posId});
        }
      });
      socket.on('PLAY_MOVE_STEP',function(data){
        data.posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        if(desk){
            self.broadCastRoom("PLAY_MOVE_STEP_SUCCESS",desk.deskId,data);  
        }
      });
      socket.on('FINISH_CHESS',function(data){
        var desk = self.getDesk(socket);
        if(desk){
          var posId = data.posId;
          desk.positions[posId].finish_chess[data.idx] = 1;
          self.broadCastRoom("FINISH_CHESS_SUCCESS",desk.deskId,data);

          if(self.checkOver(desk.deskId,posId) && desk.state == 1){
            desk.state = 2; //游戏结束
            var score_list = {};
            var ycscore_list = [];
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
                ycscore_list.push({uid:desk.positions[i].uid,name:desk.positions[i].name,score:score,is_win:posId == i?1:0,avatorUrl:desk.positions[i].avatorUrl});
              }
            }
            self.broadCastRoom("GAME_OVER",desk.deskId,{winer:posId,score_list:score_list});
            if(!desk.score_list) desk.score_list = [];
            desk.score_list.push({play_index:desk.play_index,score_list:ycscore_list});

            if(desk.play_index == desk.play_count){
              self.sendYcGameOver({
                room_id:desk.name,
                game_id:6,
                score_list:desk.score_list
              });
            }
          }
        }
      });
      socket.on('NEXT_PLAYER_DICE',function(){
        var desk = self.getDesk(socket);
        if(desk){
          self.makeNextPlayerDice(desk);

          //如果下一个是掉线ing 则继续跳下一个
          var nextUserObj = self.getPositionByPosId(desk, desk.cur_posId);
          if (nextUserObj && nextUserObj.disconnectTime > 0) {
            self.makeNextPlayerDice(desk);
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
gameServer.init();

app.get('/fxq/quit',function(req,res){
  const uid = req.query.uid;
  var deskId = gameServer.clearRoomByUid(uid);
  console.log("清空房间:"+deskId);
  res.send({state:0,msg:"退出成功1",uid:uid});
})

app.get("/fxq/debug",function(req,res){

  const uid = req.query.uid;
  const num = req.query.num;
  const room = req.query.room;
  var posId = gameServer.getPosIdByUid(uid)
  var desk = gameServer.getDeskByName(room);
  if(desk && desk.state == 1){
    desk.cur_dice_num = num;
    gameServer.broadCastRoom("MAKE_DICE_NUM_SUCCESS",desk.deskId,{num:num,posId:posId});
  }

  res.send({state:0,msg:"调试完成"});
})