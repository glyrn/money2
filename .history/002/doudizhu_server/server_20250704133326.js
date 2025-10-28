const crypto = require('crypto');
const os = require('os');
const https = require('https');
const fs = require('fs');
//本地调试
var ioParam = {path:'/hlddz_socket.io'};
var isDebug = false;
if(getCurrentIP().indexOf("192.168") != -1){
  ioParam = null;
  isDebug = true;
}
const gameCfg = JSON.parse(fs.readFileSync('gameCfg.json', 'utf8'));

const yc_domain = gameCfg['yc_domain'];//www.fsyctech.com';
const game_port = gameCfg['game_port'];

const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,ioParam);
app.use(express.static(`${__dirname}/../doudizhu_client`));
// 设置跨域头部
app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Methods","PUT,POST,GET,DELETE,OPTIONS");
  res.header("X-Powered-By",' 3.2.1')
  res.header("Content-Type", "application/json;charset=utf-8");
  next();
});

const Game = require('./game.js');
function createDeskList(n) {
  n = n || 150;
  const ret = [];
  for (let i = 1; i <= n; i++) {
    const desk = {
      name:'',
      deskId: i,
      state: 0,
      positions: [],
      islaizi : 0,
      play_count:0,
      base_score:100,
      play_index:1
    }
    for (let j = 0; j < 3; j++) {
      desk.positions.push({
        uid:0,
        posId: j,
        state: 0,
        name: '',
        avatarUrl: '',
        score:0,
        ob_socket_map:{},
        recover_disconnect_data:[],//断线重连缓存数据
      })
    }
    ret.push(desk);
  }
  return ret;
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

function time() {
  return (new Date()).toLocaleDateString()+" "+(new Date()).toLocaleTimeString();
}

function GameServer(port) {
  this.clients = [];
  this.port = port;
  this.desks = createDeskList(150);
  this.gameDatas = {};
}
const proto = {
  broadCastHouse(event, data, socket) {
    console.log("broadCastHouse")
    socket = socket === undefined ? null : socket;
    this.clients.forEach((client, index) => {
      if (client.deskId === '') {
        this.socketEmit(client,event, data);
      }
    });
  },
  broadCastRoom(event, deskId, data, socket) {
    console.log("broadCastRoom")
    socket = socket === undefined ? null : socket;

    this.clients.forEach((client, index) => {
      if (client.deskId === deskId && client.socket !== socket) {
        this.socketEmit(client,event, data);
      }
    });
  },
  socketEmit:function(client,event,data){
    console.log("socketEmit")
    if(client) {
      var saveData = data;
      console.log("11111111")
      if (data instanceof Object) {//深复制data
        saveData = JSON.parse(JSON.stringify(data));
      }
      var userObj = this.getPositionByClient(client);
      if (userObj) {
        console.log("22222222")
        for (const ob_uid in userObj.ob_socket_map) {
          userObj.ob_socket_map[ob_uid].emit(event, saveData);
        }
        userObj.recover_disconnect_data.push({event: event, data: saveData});
        console.log("3333333333")
        console.log("4444444444")
      }
      client.socket.emit(event, saveData);
      console.log("555555555")
    }
  },
  getDesk(deskId) {
    console.log("getDesk")
    for (let i = 0, len = this.desks.length; i < len; i++) {
      let desk = this.desks[i];
      if (desk.deskId == deskId) {
        return desk;
      }
    }
    return null;
  },
  getDeskByName(deskName) {
    console.log("getDeskByName")
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
        if(desk.name == '' && desk.positions[0].state == 0 && desk.positions[1].state == 0 && desk.positions[2].state == 0){
          desk.name = deskName;
          findDesk = desk;
          break;
        }
      }
    }
    return findDesk;
  },
  getAllPosInfo(deskId) {
    let desk = this.getDesk(deskId);
    if (desk) {
      var newPositionList = [];
      for (let i = 0; i < desk.positions.length; i++) {
        var newPostion = {}
        for (const k in desk.positions[i]) {
          if(k != "recover_disconnect_data" && k != 'ob_socket_map'){
            newPostion[k] = desk.positions[i][k];
          }
        }
        newPositionList.push(newPostion);
      }
      return newPositionList;
    }
    return [];
  },
  getOtherPosInfo(deskId, posId) {
    let desk = this.getDesk(deskId);
    if (desk) {
      var positions = desk.positions.filter(function (pos) {
        return pos.posId !== posId;
      });
      var newPositionList = [];
      for (let i = 0; i < positions.length; i++) {
        var newPostion = {}
        for (const k in positions[i]) {
          if(k != "recover_disconnect_data" && k != 'ob_socket_map'){
            newPostion[k] = positions[i][k];
          }
        }
        newPositionList.push(newPostion);
      }
      return newPositionList;
    }
    return [];
  },
  updateOtherPosStatus(deskId, posId, state) {
    let desk = this.getDesk(deskId);
    if (desk) {
      let positions = desk.positions;
      positions.forEach(function (pos) {
        if (pos.posId !== posId) {
          pos.state = state;
        }
      }.bind(this));
    }

  },
  getPosition(desk, posId) {
    for (let i = 0, len = desk.positions.length; i < len; i++) {
      let position = desk.positions[i];
      if (position.posId == posId) {
        return position;
      }
    }
    return null;
  },
  getPositionByClient(client){
    var desk = this.getDesk(client.deskId);
    if(desk) {
      for (let i = 0, len = desk.positions.length; i < len; i++) {
        let position = desk.positions[i];
        if (position.uid == client.uid) {
          return position;
        }
      }
    }
    return null;
  },
  getPositionByPosId(desk,posId){
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
  isEmptyPos(deskName, posId) {
    const desk = this.getDeskByName(deskName);
    if (!desk) {
      return false;
    }
    const position = this.getPosition(desk, posId);
    return position && position.state === 0;
  },
  getEmptyPos(deskName){
    const desk = this.getDeskByName(deskName);
    if (!desk) {
      return false;
    }
    for (let j = 0; j < 3; j++) {
      var position = desk.positions[j];
      if(position && position.state === 0){
        return position.posId;
      }
    }
    return false;
  },
  updatePosStatus(deskId, posId, state, name,avatarUrl,score,uid) {
    const desk = this.getDesk(deskId);
    if (desk) {
      const position = this.getPosition(desk, posId);
      if (position) {
        position.state = state;
        if (name === '' || name) {
          position.name = name;
          position.avatarUrl = avatarUrl;
          position.score = score;
          position.uid = uid;
        }
      }
      // 检测是否需要重置房间属性
      var isNeedClear = true;
      for (const positionKey in desk.positions) {
         if(desk.positions[positionKey].state != 0){
           isNeedClear = false;
         }
      }
      if(isNeedClear){
        desk.islaizi = 0;
        desk.base_score = 100;
        desk.play_count = 0;
        desk.play_index = 1;
        desk.name = '';
      }
    }
  },
  updateRoomStatus(deskId, state) {
    const desk = this.getDesk(deskId);
    if (desk) {
      desk.state = state;
      return true;
    }
    return false;
  },
  removeClient(socket) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].socket === socket) {
        this.clients.splice(i, 1);
        break;
      }
    }
  },
  addClient(socket, data) {
    this.clients.push({ uid:data.uid,name: data.name,avatarUrl:data.avatarUrl,score:data.score, socket: socket, deskId: '', posId: '' });
  },
  getClient(socket) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      let client = this.clients[i];
      if (client.socket == socket) {
        return client;
      }
    }
    return null;
  },
  getClientByUid(uid){
    for (let i = 0, len = this.clients.length; i < len; i++) {
      let client = this.clients[i];
      if (client.uid == uid) {
        return client;
      }
    }
    return null;
  },
  updateClientState(socket, deskId, posId) {
    let client = this.getClient(socket)
    if (client) {
      client.deskId = deskId !== undefined ? deskId : '';
      client.posId = posId !== undefined ? posId : '';
    }
  },
  getUserName(socket) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].socket == socket) {
        return this.clients[i].name;
      }
    }
    return null;
  },
  getAvatarUrl(socket) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].socket == socket) {
        return this.clients[i].avatarUrl;
      }
    }
    return null;
  },
  getUid(socket) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].socket == socket) {
        return this.clients[i].uid;
      }
    }
    return null;
  },
  getScore(socket){
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].socket == socket) {
        return this.clients[i].score;
      }
    }
    return null;
  },
  checkUserName(uid) {
    for (let i = 0, len = this.clients.length; i < len; i++) {
      if (this.clients[i].uid === uid) {
        return false;
      }
    }
    return true;
  },
  checkPrepareAll(deskId) {
    const desk = this.getDesk(deskId);
    if (desk) {
      const positions = desk.positions;
      for (let i = 0; i < 3; i++) {
        if (positions[i].state !== 2) {
          return false;
        }
      }
      return true;
    }
    return false;
  },
  checkDisconnect:function(){
    console.log("checkDisconnect")
    for (let i = 0; i < this.desks.length; i++) {
      var room = this.desks[i];
      for (let j = 0; j < room.positions.length; j++) {
        var userObj = room.positions[j];
        if(userObj.disconnectTime > 0 && Math.floor(new Date().getTime() / 1000) - userObj.disconnectTime >= (isDebug ? 100:180)) {
          console.log('用户 ' + userObj.name + " " + userObj.uid + ' 已确认断线，清除数据');
          userObj.disconnectTime = null;
          //清空断线重连缓存数据
          userObj.recover_disconnect_data = [];

          var client = this.getClientByUid(userObj.uid);
          var posId = userObj.posId;
          var deskId = room.deskId;

          var socket = client.socket;
          this.removeClient(socket);
          //更新座位状态
          this.updatePosStatus(deskId, posId, 0, '', '', 0, 0);
          //重置房间状态
          this.updateRoomStatus(deskId, posId, 0);
          //解绑座位号 桌号
          this.updateClientState(socket);
          //通知在房间里的其它客户端，更新座位息
          this.broadCastRoom("POS_STATUS_CHANGE", deskId, {posId, state: 0}, socket);
          //通知大厅其它客户端更新该座位信息
          this.broadCastHouse('STATUS_CHANGE', {deskId, posId, state: 0});

          //如果在游戏中，则有玩家强行退出，重置此房间其它玩家的状态为未准备
          // //更新其它两位玩家的座位状态为未准备
          // this.updateOtherPosStatus(deskId, posId, 1);
          //获取其它两位玩家的座位信息
          // const otherPosInfo = this.getOtherPosInfo(deskId, posId);
          // //通知其它两位玩家重置自己的状态为未准备
          // this.broadCastRoom("POS_STATUS_RESET", deskId, {pos: otherPosInfo, state: 1});
          //通知其它两位玩家重置房间状态
          this.broadCastRoom('ROOM_STATUS_CHANGE', deskId, {state: 0});
          //通知其它两位玩家当前玩家逃跑
          // this.broadCastRoom('FORCE_EXIT_EV', deskId, {msg: '有玩家逃跑，游戏结束', posId});
          const game = this.gameDatas[deskId];
          if (game) {
            //强制结束游戏
            this.broadCastRoom('GAME_OVER', deskId, {invalid:1,winner:[], loser:[], score: 0, ratio:0});
            game.init();
          }
        }
      }
    }
  },
  //切换房间
  checkChangeRoom:function(curRoomId,uid){
    console.log("checkChangeRoom")
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      for (let j = 0; j < roomObj.positions.length; j++) {
        var userObj = roomObj.positions[j];
        //房间号不同 要退出原来房间
        if(userObj.uid == uid && roomObj.deskId != curRoomId){

          console.log('用户 '+userObj.name+" "+userObj.uid+' 退出原来房间');
          userObj.disconnectTime = null;
          //清空断线重连缓存数据
          userObj.recover_disconnect_data = [];

          var client = this.getClientByUid(userObj.uid);
          var posId = userObj.posId;
          var deskId = roomObj.deskId;

          var socket = client.socket;
          this.removeClient(socket);
          //更新座位状态
          this.updatePosStatus(deskId, posId, 0, '', '', 0, 0);
          //重置房间状态
          this.updateRoomStatus(deskId, posId, 0);
          //解绑座位号 桌号
          this.updateClientState(socket);
          //通知在房间里的其它客户端，更新座位息
          this.broadCastRoom("POS_STATUS_CHANGE", deskId, {posId, state: 0}, socket);
          //通知大厅其它客户端更新该座位信息
          this.broadCastHouse('STATUS_CHANGE', {deskId, posId, state: 0});
        }
      }
    }
  },
  checkRecover:function(socket,obj){
    console.log("checkRecover")
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      for (let j = 0; j < roomObj.positions.length; j++) {
        var userObj = roomObj.positions[j];
        if(userObj.uid == 0) continue;
        // 断线重连、旁观
        if(userObj.uid == obj.uid || userObj.uid == obj.ob_uid ){
          if(userObj.uid == obj.uid){ //断线重连
            userObj.disconnectTime = null;
            this.getClientByUid(obj.uid).socket = socket; //重连上
          }else if(userObj.uid == obj.ob_uid) { //旁观
            userObj.ob_socket_map[obj.uid] = socket;
          }
          //重连恢复
          console.log("断线重连：",userObj.uid,userObj.name);
          for (let k = 0; k < userObj.recover_disconnect_data.length; k++) {
            var emitObj = userObj.recover_disconnect_data[k];
            socket.emit(emitObj.event,emitObj.data);
          }
          //广播其他所有人 该玩家上线了
          this.broadCastRoom("CONNECT_STATE",roomObj.deskId,{state:1,posId:userObj.posId},socket);
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
  startGame(deskId,isRestart) {
    if (this.gameDatas[deskId] === undefined) {
      this.gameDatas[deskId] = new Game();
    }
    const game = this.gameDatas[deskId];
    game.init();
    const cards = game.start(isRestart).getCards();
    let desk = this.getDesk(deskId);
    desk.score_list = [];
    this.broadCastRoom('GAME_START', deskId, { cards });
    this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos: game.getContextPosId(), ctxScore: game.getContextScore(), timeout: 15 });
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
  init() {

    const self = this;

    function setHeartbeat(){
      // setTimeout(setHeartbeat,5000);
      io.sockets.emit('ping',{beat:1});
    }
    // setTimeout(setHeartbeat,5000);
    setInterval(setHeartbeat,5000)

    function checkDisconnect(){
    //   setTimeout(checkDisconnect, 5000);
      self.checkDisconnect()
    }
    // setTimeout(checkDisconnect, 5000);
    setInterval(checkDisconnect,5000)

    io.on('connection', socket => {
      socket.on('pong', function(data){
      });

      console.log('有客户端接入，时间： %s', time());
      socket.on('LOGIN', data => {

        //检查是否换房间
        let room = this.getDeskByName(data.deskName);
        self.checkChangeRoom(room.deskId,data.uid);
        //检测是否重连玩家
        if(self.checkRecover(socket,data)){
          //推送恢复数据
          return;
        }
        console.log("Login")
        if (this.checkUserName(data.uid)) {

          this.addClient(socket, {uid:data.uid, name:data.name,avatarUrl:data.avatarUrl,score:data.score});
          this.socketEmit(this.getClient(socket),'LOGIN_SUCCESS', this.desks);
          console.log('有客户端登录，时间： %s', time());

        } else {
          this.socketEmit(this.getClient(socket),'LOGIN_FAIL', { msg: '该用户名已存在' });
        }
      });

      socket.on('SITDOWN', data => {
        console.log("SITDOWN")
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        //找到桌子
        let desk = this.getDeskByName(data.deskName);
        if(!desk) {
          //房间已满
          this.socketEmit(this.getClient(socket),'SITDOWN_ERROR', { msg: '找不到可用的房间' });
          //坐下失败 强制退出
          this.removeClient(socket);
          return;
        }

        //检查该座位是否是空闲状态
          var newPosId = this.getEmptyPos(data.deskName);
          // console.log("newPosId:",data.deskName,newPosId);
          if (newPosId !== false)
          {
            //成功坐下
            if(data.play_mode != undefined && data.play_mode != null){
              desk.islaizi = data.play_mode;
            }
            if(data.play_count != undefined && data.play_count != null){
              desk.play_count = data.play_count;
            }

            let islaizi = desk.islaizi;
            let base_score = desk.base_score;
            let play_count = desk.play_count;
            let play_index = desk.play_index;

            console.log('有客户端进入房间，桌号：%s %s，posId：%s，时间： %s ，玩法：%s，总局数：%s，第%s局 ', desk.deskId,desk.name, newPosId, time(),islaizi,play_count,play_index);
            //更新座位状态为占用
            this.updatePosStatus(desk.deskId, newPosId, 1, this.getUserName(socket), this.getAvatarUrl(socket),this.getScore(socket),this.getUid(socket));
            //绑定客户端桌号，座位号
            this.updateClientState(socket, desk.deskId, newPosId);
            //获取除当前房间其它座位信息
            let posInfos = this.getAllPosInfo(desk.deskId);
            //通知该客户端坐下成功 并发送当前房间的信息给该客户端
            this.socketEmit(this.getClient(socket),'SITDOWN_SUCCESS', {posId:newPosId,deskId:desk.deskId,deskName:desk.name, posInfos, islaizi,base_score,play_count,play_index});
            //通知在大厅游览的所有客户端当前坐位已被占用
            this.broadCastHouse('STATUS_CHANGE', {deskId:desk.deskId, posId:newPosId, state: 1});

            //通知在房间里的其它客户端，更新座位息
            this.broadCastRoom("POS_STATUS_CHANGE", desk.deskId, {
              posId:newPosId,
              state: 1,
              name: this.getUserName(socket),
              avatarUrl: this.getAvatarUrl(socket),
              score:this.getScore(socket),
              uid:this.getUid(socket),
            }, socket);

        } else {
            //通知该客户端此座位被人占用
            this.socketEmit(this.getClient(socket),'SITDOWN_ERROR', { msg: '房间已满员' });
            //坐下失败 强制退出
            this.removeClient(socket);
            //由于当前位置被占用可能是由于该客户端数据不同步造成，所以再次向该客户端推送一次所有桌数据
            this.socketEmit(this.getClient(socket),'REFRESH_LIST', this.desks);
        }
      });

      socket.on('UNSITDOWN', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        // const { deskId, posId } = client;
        let deskId = client.deskId;
        let posId = client.posId;
        if (!deskId) {
          return;
        }
        console.log('有客户端退出房间，桌号：%s，座位：%s，时间：', deskId, posId, time());
        //更新座位状态
        this.updatePosStatus(deskId, posId, 0, '','',0,0);
        //重置房间状态
        this.updateRoomStatus(deskId, 0);
        //解绑座位号 桌号
        this.updateClientState(socket);
        //通知在房间里的其它客户端，更新座位息
        this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, state: 0 }, socket);
        //通知大厅其它客户端更新该座位信息
        this.broadCastHouse('STATUS_CHANGE', { deskId, posId, state: 0 });

        //如果在游戏中，则有玩家强行退出，重置此房间其它玩家的状态为未准备
        //获取此桌游戏数据
        const game = this.gameDatas[deskId];
        //判断是否在进行游戏
        if (game) {
          const status = game.getStatus();
          if (game && status && status !== 3) {
            //更新其它两位玩家的座位状态为未准备
            this.updateOtherPosStatus(deskId, posId, 1);
            //获取其它两位玩家的座位信息
            const otherPosInfo = this.getOtherPosInfo(deskId, posId);
            //通知其它两位玩家重置自己的状态为未准备
            this.broadCastRoom("POS_STATUS_RESET", deskId, { pos: otherPosInfo, state: 1 });
            //通知其它两位玩家重置房间状态
            this.broadCastRoom('ROOM_STATUS_CHANGE', deskId, { state: 0 });
            //通知其它两位玩家当前玩家逃跑
            this.broadCastRoom('FORCE_EXIT_EV', deskId, { msg: '有玩家逃跑，游戏结束', posId });

            game.init();

          }
        }
        //通知当前玩家退出房间成功
        this.socketEmit(this.getClient(socket),'UNSITDOWN_SUCCESS', this.desks);
      });

      socket.on('PREPARE', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        // const { deskId, posId } = client;
        let deskId = client.deskId;
        let posId = client.posId;
        if (!deskId) {
          return;
        }
        //更新座位为准备状态
        this.updatePosStatus(deskId, posId, 2);
        //通知该客户端准备成功
        this.socketEmit(this.getClient(socket),'PREPARE_SUCCESS');
        //通知房间里的其它客户端更新座位信息
        this.broadCastRoom("POS_STATUS_CHANGE", deskId, { posId, state: 2 }, socket);

        //更新房间状态
        this.updateRoomStatus(deskId, 1);

        //检查是否全部准备完毕
        const isPrepareAll = this.checkPrepareAll(deskId);
        if (isPrepareAll) {
          this.startGame(deskId,false);
        }

      });

      socket.on('CALL_SCORE', data => {
        const { score } = data;
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        // const { deskId, posId } = client;
        let deskId = client.deskId;
        let posId = client.posId;
        const game = this.gameDatas[deskId];
        if (!game || !deskId) {
          return;
        }

        const status = game.next(posId, score).getStatus();
        if (status == 1) {
          this.socketEmit(this.getClient(socket),'CALL_SCORE_SUCCESS',score);
          const ctxPos = game.getContextPosId();
          const ctxScore = game.getContextScore();
          const calledScores = game.getCalledScores();
          this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos, ctxScore, calledScores, timeout: 15 });
        }
        if (status == 2) {
          const topCards = game.getTopCards();
          const dizhuPosId = game.getDiZhuPosId();
          let desk = this.getDesk(deskId);
          let islaizi = desk.islaizi;
          const laiziCards = islaizi > 0 ? game.getLaiziCards(islaizi) : [];
          game.contextLaiziCards = laiziCards;
          this.socketEmit(this.getClient(socket),'CALL_SCORE_SUCCESS',score);
          this.broadCastRoom('SHOW_TOP_CARD', deskId, { topCards,laiziCards, dizhuPosId, timeout: 15,score:game.getMaxScoreInfo().score });
          this.broadCastRoom('CTX_PLAY_CHANGE', deskId, {
            ctxData: {
              len: 0,
              key: '',
              type: '',
              cards: [],
              posId: dizhuPosId,
            },
            posId: dizhuPosId,
            timeout: 30,
            isPass: false,
          });

        }
        if (status == 4) {
          this.broadCastRoom('MESSAGE', deskId, { msg: '没有玩家叫分，重新发牌' });
          this.socketEmit(this.getClient(socket),'CALL_SCORE_SUCCESS',0);
          this.startGame(deskId,true);
        }
      });

      socket.on("CHECK_PLAY_CARD",data=>{

        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        let deskId = client.deskId;
        let posId = client.posId;

        const game = this.gameDatas[deskId];
        if (game && deskId) {
          let desk = this.getDesk(deskId);
          let islaizi = desk.islaizi;
          const ret = game.validate(posId, data,islaizi);
          this.socketEmit(client,'CHECK_PLAY_CARD_SUCCESS', ret);
        }
      });

      socket.on('PLAY_CARD', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        // const { deskId, posId } = client;
        let deskId = client.deskId;
        let posId = client.posId;

        const game = this.gameDatas[deskId];
        if (game && deskId) {
          let desk = this.getDesk(deskId);
          let islaizi = desk.islaizi;
          const ret = game.validate(posId, data,islaizi);
          const isPass = !data.length;
          const { status } = ret;
          if (status || !data.length) {

            console.log("出牌调试：",posId, JSON.stringify(data),islaizi);
            //debug
            //强制重置posId
            var lastPosId = game.contextPosId;
            game.next(posId, data,islaizi);
            posId = lastPosId;

            if (game.getStatus() === 5) {
              this.socketEmit(this.getClient(socket),'PLAY_CARD_ERROR', '游戏出错');
              return;
            }

            this.broadCastRoom('CTX_PLAY_CHANGE', deskId, {
              ctxData: {
                len: data.length,
                key: ret.key,
                type: ret.type,
                cards: data,
                posId:posId,
              },
              posId: game.getContextPosId(),
              timeout: 15,
              isPass:isPass,
            })
            this.socketEmit(this.getClient(socket),'PLAY_CARD_SUCCESS', data);


            if (game.getStatus() === 3) {
              var gameResult = game.getResult();
              this.broadCastRoom('GAME_OVER', deskId, gameResult);

              var score = desk.base_score * gameResult.score * gameResult.ratio;
              var score_list = [];
              for (let j = 0; j < gameResult.winner.length; j++) {
                for (let i = 0; i < desk.positions.length; i++) {
                  if(desk.positions[i].posId == gameResult.winner[j]){
                    score_list.push({uid:desk.positions[i].uid,name:desk.positions[i].name,score:score/gameResult.winner.length,is_win:1,avatorUrl:desk.positions[i].avatarUrl})
                  }
                }
              }
              for (let j = 0; j < gameResult.loser.length; j++) {
                for (let i = 0; i < desk.positions.length; i++) {
                  if(desk.positions[i].posId == gameResult.loser[j]){
                    score_list.push({uid:desk.positions[i].uid,name:desk.positions[i].name,score:score/gameResult.loser.length,is_win:0,avatorUrl:desk.positions[i].avatarUrl})
                  }
                }
              }
              
              score_list.sort((a, b) => {
                return b.score - a.score;
              });
              if(!desk.score_list) desk.score_list = [];
              desk.score_list.push({play_index:desk.play_index,score_list:score_list})
              if(desk.play_index == desk.play_count){
                this.sendYcGameOver({
                  room_id:desk.name,
                  game_id:2,
                  score_list:desk.score_list
                })
              }

              desk.play_index++;
              if(desk.play_count < desk.play_index){ //剩余局数为0
                desk.play_index = 1;
              }
              this.updatePosStatus(deskId, 0, 1);
              this.updatePosStatus(deskId, 1, 1);
              this.updatePosStatus(deskId, 2, 1);
              game.init();
            }else{
              //游戏中
              if(game.getStatus() == 2) {
                //玩家如果掉线中 自动出pass
                var nextUserObj = this.getPositionByPosId(desk, game.getContextPosId());
                if (nextUserObj.disconnectTime > 0) {
                  game.next(nextUserObj.posId, [], desk.islaizi);
                  self.broadCastRoom('CTX_PLAY_CHANGE', desk.deskId, {
                    ctxData: {
                      len: 0,
                      key: '',
                      type: '',
                      cards: [],
                      posId: nextUserObj.posId,
                    },
                    posId: game.getContextPosId(),
                    timeout: 15,
                    isPass: true,
                  })
                }
              }
            }

          } else {
            this.socketEmit(this.getClient(socket),'PLAY_CARD_ERROR', '你的牌不符合规则')
          }
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

            var client = self.getClientByUid(userObj.uid);
            if(userObj.state > 0 && client && client.socket && client.socket.id == socket.id){

              console.log('用户 '+userObj.name+" "+userObj.uid+' 断线');
              //记录掉线时间
              userObj.disconnectTime = Math.floor(new Date().getTime() / 1000);
              
              const game = self.gameDatas[self.desks[i].deskId];
              if (game && game.getStatus() == 2) {
                //如果刚好轮到的人掉线，自动pass处理
                if(game.getContextPosId() == userObj.posId){
                  game.next(userObj.posId, [],self.desks[i].islaizi);
                  self.broadCastRoom('CTX_PLAY_CHANGE', self.desks[i].deskId, {
                    ctxData: {
                      len: 0,
                      key: '',
                      type: '',
                      cards: [],
                      posId:userObj.posId,
                    },
                    posId: game.getContextPosId(),
                    timeout: 15,
                    isPass:true,
                  })
                }
              }
              //通知其他人 该玩家掉线了
              self.broadCastRoom("CONNECT_STATE",self.desks[i].deskId,{state:0,posId:userObj.posId},socket);
              return;
            }
          }
        }
      });
    });


    http.listen(this.port, () => {
      console.log(`server is running on port ${this.port}`);
      // (require('os').platform() == 'win32') && require('child_process').exec(`start http://localhost:${this.port}/index.html`);
    });
  }
}
Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer(game_port);
gameServer.init();

app.get('/ddz/quit',function(req,res){
  const uid = req.query.uid;
  res.send({state:0,msg:"退出成功",uid:uid});
  //踢出房间
  gameServer.checkChangeRoom(-1,uid);
})