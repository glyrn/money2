const crypto = require('crypto');
const os = require('os');
const https = require('https');
const fs = require('fs');
const _ = require('lodash');
//本地调试
var isDebug = false;
var ioParam = {path:'/hlddz_socket.io'};
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

const Game = require('./game.js');
function GameServer() {

  this.desks = this.createDeskList(150);
  this.clients = {};
  this.gameDatas = {};

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
        play_index:1,
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
  getUserObj:function(socket){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj.socket && userObj.socket.id == socket.id) {
          return userObj;
        }
      }
    }
  },
  getUserObjByPosId:function(posId){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {
        var userObj = this.desks[i].positions[j];
        if (userObj && userObj.posId == posId) {
          return userObj;
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
  getPosition(desk, posId) {
    for (let i = 0, len = desk.positions.length; i < len; i++) {
      let position = desk.positions[i];
      if (position.posId == posId) {
        return position;
      }
    }
    return null;
  },
  getOnlinePosIds:function(deskId){
    let ret = [];
    for (let i = 0; i < this.desks.length; i++) {
      if(this.desks[i].deskId == deskId){
        for (let j = 0; j < this.desks[i].positions.length; j++) {
          var userObj = this.desks[i].positions[j];
          if (userObj && userObj.socket && !userObj.disconnectTime) {
            ret.push(userObj.posId);
          }
        }
      }
    }
    return ret;
  },
  updatePosStatus(deskId, posId, state, name,avatorUrl,score,uid) {
    const desk = this.getDeskById(deskId);
    if (desk) {
      const position = this.getPosition(desk, posId);
      if (position) {
        position.state = state;
        if (name === '' || name) {
          position.name = name;
          position.avatorUrl = avatorUrl;
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
  broadCastRoom:function(event,roomId,data,except){
    for (let i = 0; i < this.desks.length; i++) {
      var roomObj = this.desks[i];
      if(roomObj.deskId == roomId){
        for (let j = 0; j < roomObj.positions.length; j++) {
          var userObj = roomObj.positions[j];
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
  checkDelayTask:function(){
    for (let i = 0; i < this.desks.length; i++) {
      const game = this.gameDatas[this.desks[i].deskId];
      //叫分阶段
      if(game && game.getStatus() == 1){

        for (let j = 0; j < this.desks[i].positions.length; j++) {
          var userObj = this.desks[i].positions[j];
          if(userObj.disconnectTime > 0 && getTimeStamp() >= userObj.targetTimerTime && userObj.delayCallScore){
            console.log("执行了delayCallScore");
            userObj.delayCallScore.execFunc();
            userObj.delayCallScore = null;
            userObj.targetTimerTime = null;
          }
        }
        //出牌阶段
      }else if(game && game.getStatus() == 2){

        for (let j = 0; j < this.desks[i].positions.length; j++) {
          var userObj = this.desks[i].positions[j];
          if(userObj.disconnectTime > 0 && getTimeStamp() > userObj.targetTimerTime && userObj.delayPlayCard){
            console.log("执行了delayPlayCard");
            userObj.delayPlayCard.execFunc();
            userObj.delayPlayCard = null;
            userObj.targetTimerTime = null;
          }
        }
      }
    }
  },
  checkDisconnect:function(){
    for (let i = 0; i < this.desks.length; i++) {
      for (let j = 0; j < this.desks[i].positions.length; j++) {

        var userObj = this.desks[i].positions[j];

        if(userObj.disconnectTime > 0 && getTimeStamp() - userObj.disconnectTime >= (isDebug ? 180:180)){
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
          this.broadCastRoom("MESSAGE",this.desks[i].deskId, { msg:'玩家'+name+'已掉线'},userObj.uid);
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
            desk.name = '';
            desk.state = 0;
            desk.play_index = 1;
            desk.ready_count = -1;
          }

          this.broadCastRoom("GAME_OVER", desk.deskId,  {invalid:1,winner: [],loser: [],score: 0,ratio: 0});
          // this.broadCastRoom("MESSAGE",desk.deskId,{msg:'中途有人逃跑本局成绩作废'});

          desk.state = 0;
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
              game_id:2,
              score_list:desk.score_list,
            });
          
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
          let name = userObj.name;
          console.log('用户 '+userObj.name+" "+userObj.uid+' 退出原来房间');
          userObj.uid = 0;
          userObj.state = 0;
          userObj.name = '';
          userObj.avatorUrl = '';
          userObj.score = 0;
          userObj.disconnectTime = null;
          //清空断线重连信息
          userObj.recover_disconnect_data = [];

          this.broadCastRoom("MESSAGE",roomObj.deskId, { msg:'玩家'+name+'已掉线'},userObj.uid);
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
            this.desks[i].play_index = 1;
            this.desks[i].ready_count = -1;
          }

          let desk = this.desks[i];
          this.broadCastRoom("GAME_OVER", desk.deskId,  {invalid:1,winner: [],loser: [],score: 0,ratio: 0});
          // this.broadCastRoom("MESSAGE",desk.deskId,{msg:'中途有人逃跑本局成绩作废'});

          desk.state = 0;
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
              game_id:2,
              score_list:desk.score_list,
            });
        }
      }
    }
  },
  startGame:function(deskId,isRestart){
    if (this.gameDatas[deskId] === undefined) {
      this.gameDatas[deskId] = new Game();
    }
    const game = this.gameDatas[deskId];
    game.init();
    let onlinePosIds = this.getOnlinePosIds(deskId);
    
    const cards = game.start(isRestart,onlinePosIds[0] ?? 0).getCards();
    let desk = this.getDeskById(deskId);
    desk.score_list = [];

    this.broadCastRoom("GAME_START",deskId, { cards });
    //记录当前玩家的定时器时间(未来值)
    this.getUserObjByPosId(game.getContextPosId()).targetTimerTime = getTimeStamp() + 15;
    this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos: game.getContextPosId(), ctxScore: game.getContextScore(), timeout: 15,server_time:getTimeStamp() });
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
        userObj.ob_socket_map = {};
      }
      desk.name = '';
      desk.state = 0;
      desk.play_index = 1;
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
        console.log(userObj.name+" 恢复数据")
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
  doCallScore:function(userObj,desk,deskId,game,posId,score){
    let status = game.next(posId, score).getStatus();
    if (status == 1) {
      
      this.socketEmit(userObj,'CALL_SCORE_SUCCESS',score);
      let ctxPos = game.getContextPosId();
      let ctxScore = game.getContextScore();
      let calledScores = game.getCalledScores();
      //记录当前玩家的定时器时间(未来值)
      this.getUserObjByPosId(ctxPos).targetTimerTime = getTimeStamp() + 15;
      this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos, ctxScore, calledScores, timeout: 15,server_time:getTimeStamp() });
      //如果下一个玩家是离线的那么跳过 传给下一个人
      if(this.getUserObjByPosId(ctxPos).disconnectTime > 0){
          status = game.next(ctxPos, 0).getStatus();
          ctxPos = game.getContextPosId();
          ctxScore = game.getContextScore();
          calledScores = game.getCalledScores();
          //记录当前玩家的定时器时间(未来值)
          this.getUserObjByPosId(ctxPos).targetTimerTime = getTimeStamp() + 15;
          this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos, ctxScore, calledScores, timeout: 15,server_time:getTimeStamp() });
      }
      //如果下一个玩家是离线的那么跳过 传给下一个人
      if(this.getUserObjByPosId(ctxPos).disconnectTime > 0){
          status = game.next(ctxPos, 0).getStatus();
          ctxPos = game.getContextPosId();
          ctxScore = game.getContextScore();
          calledScores = game.getCalledScores();
          //记录当前玩家的定时器时间(未来值)
          this.getUserObjByPosId(ctxPos).targetTimerTime = getTimeStamp() + 15;
          this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos, ctxScore, calledScores, timeout: 15,server_time:getTimeStamp() });
      }
    }
    if (status == 2) {
      const topCards = game.getTopCards();
      const dizhuPosId = game.getDiZhuPosId();
      let islaizi = desk.islaizi;
      const laiziCards = islaizi > 0 ? game.getLaiziCards(islaizi) : [];
      game.contextLaiziCards = laiziCards;
      this.socketEmit(userObj,'CALL_SCORE_SUCCESS',score);
      //记录当前玩家的定时器时间(未来值)
      userObj.targetTimerTime = getTimeStamp() + 15;
      this.broadCastRoom('SHOW_TOP_CARD', deskId, { topCards,laiziCards, dizhuPosId, timeout: 15,score:game.getMaxScoreInfo().score,server_time:getTimeStamp() });
      //记录当前玩家的定时器时间(未来值)
      this.getUserObjByPosId(dizhuPosId).targetTimerTime = getTimeStamp() + 30;
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
        server_time:getTimeStamp(),
        isPass: false,
      });
      

    }
    if (status == 4) {
      this.broadCastRoom('MESSAGE', deskId, { msg: '没有玩家叫分，重新发牌' });
      this.socketEmit(userObj,'CALL_SCORE_SUCCESS',0);
      this.startGame(deskId,true);
    }
  },
  doGameOver:function(desk,game){

    var deskId = desk.deskId;
    var gameResult = game.getResult();
    console.log("游戏结果：",gameResult);
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

    function checkDelayTask(){
      self.checkDelayTask()
    }
    setInterval(checkDelayTask,1000)

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
              //推送某个玩家的恢复数据
              return;
            }
            var userObj = null;

            room.ready_count = obj.ready_count;
            room.play_count = obj.play_count;
            room.base_score = obj.base_score;
            room.islaizi = obj.play_mode;

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
                  islaizi:room.islaizi,
                  posId:obj.posId,
                  base_score:room.base_score,
                  ready_count:room.ready_count,
                  play_count:room.play_count,
                  play_index:room.play_index,
                  posInfos:playerData,
                });
                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:obj,posId:obj.posId},obj.uid)

            }else{
              var uids = "";
              for (let i = 0; i < room.positions.length; i++) {
                uids += room.positions[i].uid +",";
              }
              console.log('房间已满员 '+room.name+" "+uids);
              socket.emit("MESSAGE", { msg:'房间已满员 '+room.name+" "+uids});
            }
          }
      })

      socket.on('PREPARE',function(){

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

          if(ready_count == 3 ){
            desk.state = 1;//开始游戏
            isStartGame = true;
          }

          self.broadCastRoom("PREPARE_SUCCESS",desk.deskId,prepare_posId);
          if(isStartGame)
          {
            //重置成绩
            if(desk.play_index == 1){
              desk.score_list = [];
            }
            
            self.startGame(desk.deskId,false);
          }
        }
      });

      socket.on('CALL_SCORE', data => {
        const { score } = data;
        let posId = self.getPosId(socket);
        const desk = self.getDesk(socket);
        if(!desk) return;
        let deskId = desk.deskId;
        const game = self.gameDatas[deskId];
        if (!game || !deskId) {
          return;
        }

        self.doCallScore(self.getUserObj(socket),desk,deskId,game,posId,score);
      });

      socket.on("CHECK_PLAY_CARD",data=>{

        let posId = self.getPosId(socket);
        const desk = self.getDesk(socket);
        if(!desk) return;
        let deskId = desk.deskId;

        const game = self.gameDatas[deskId];
        if (game && deskId) {
          let islaizi = desk.islaizi;
          const ret = game.validate(posId, data,islaizi);
          self.socketEmit(self.getUserObj(socket),'CHECK_PLAY_CARD_SUCCESS', ret);
        }
      });

      socket.on('PLAY_CARD', data => {

        let posId = self.getPosId(socket);
        const desk = self.getDesk(socket);
        if(!desk) return;
        let deskId = desk.deskId;

        const game = self.gameDatas[deskId];
        if (game && deskId) {
          let islaizi = desk.islaizi;
          const ret = game.validate(posId, data,islaizi);
          const isPass = !data.length;
          const { status } = ret;
          if (status || !data.length) {

            // console.log("出牌调试：",posId, JSON.stringify(data),islaizi);
            //debug
            //强制重置posId
            var lastPosId = game.contextPosId;
            game.next(posId, data,islaizi);
            
            posId = lastPosId;
            if (game.getStatus() === 5) {
              self.socketEmit(self.getUserObj(socket),'PLAY_CARD_ERROR', '游戏出错');
              return;
            }

            //记录当前玩家的定时器时间(未来值)
            self.getUserObjByPosId(game.getContextPosId()).targetTimerTime = getTimeStamp() + 15;
            self.broadCastRoom('CTX_PLAY_CHANGE', deskId, {
              ctxData: {
                len: data.length,
                key: ret.key,
                type: ret.type,
                cards: data,
                posId:posId,
              },
              posId: game.getContextPosId(),
              timeout: 15,
              server_time:getTimeStamp(),
              isPass:isPass,
            })
            self.socketEmit(self.getUserObj(socket),'PLAY_CARD_SUCCESS', data);

            if (game.getStatus() === 3) {
              //游戏结束
              self.doGameOver(desk,game);
            }else{
              //游戏中
              if(game.getStatus() == 2) {
                //玩家如果掉线中 自动出pass
                var nextUserObj = self.getPosition(desk, game.getContextPosId());
                if (nextUserObj && nextUserObj.disconnectTime > 0) {
                  //上一手不是他自己出的
                  if(game.lastCardInfo.posId != nextUserObj.posId){
                    game.next(nextUserObj.posId, [], desk.islaizi);
                    //记录当前玩家的定时器时间(未来值)
                    self.getUserObjByPosId(game.getContextPosId()).targetTimerTime = getTimeStamp() + 15;
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
                      server_time:getTimeStamp(),
                      isPass: true,
                    })
                  }else{ //上一手是他自己出的
                    var minCard = game.getMinCardsByPosId(nextUserObj.posId);
                    if(minCard){
                      game.next(nextUserObj.posId, [minCard], desk.islaizi);
                      //记录当前玩家的定时器时间(未来值)
                      self.getUserObjByPosId(game.getContextPosId()).targetTimerTime = getTimeStamp() + 15;
                      self.broadCastRoom('CTX_PLAY_CHANGE', desk.deskId, {
                        ctxData: {
                          len: 1,
                          key: minCard.value,
                          type: 'A',
                          cards: [minCard],
                          posId: nextUserObj.posId, 
                        },
                        posId: game.getContextPosId(),
                        timeout: 15,
                        server_time:getTimeStamp(),
                        isPass: false,
                      })

                      if (game.getStatus() === 3) {
                        //游戏结束
                        self.doGameOver(desk,game);
                      }
                    }
                  }
                }
              }
            }

          } else {
            self.socketEmit(self.getUserObj(socket),'PLAY_CARD_ERROR', '你的牌不符合规则')
          }
        }
      });

      socket.on('disconnect', function(){

        for (let i = 0; i < self.desks.length; i++) {
          // 不要清空观众socket
          // delete self.desks[i].ob_socket_map[socket.id];

          for (let j = 0; j < self.desks[i].positions.length; j++) {

            var userObj = self.desks[i].positions[j];

            if(userObj.state > 0 && userObj.socket && userObj.socket.id == socket.id){

              console.log('用户 '+userObj.name+" "+userObj.uid+' '+userObj.posId+' 断线');

              const game = self.gameDatas[self.desks[i].deskId];
              //选分阶段
              // console.log("选分阶段"+game.getStatus())
              if(game && game.getStatus() === 1){
                if(game.getContextPosId() == userObj.posId){
                  //延迟到倒计时0才触发
                  userObj.delayCallScore = (function(self,userObj,desk,deskId,game,posId,score){
                  return {
                      execFunc:function(){
                          //掉线叫0分
                          self.doCallScore(userObj,desk,deskId,game,posId,score);
                      }}
                  })(self,userObj,self.desks[i],self.desks[i].deskId,game,userObj.posId,0);

                }
              //出牌阶段
              }else if(game && game.getStatus() === 2 ){
                if(game.getContextPosId() == userObj.posId){

                  //延迟到倒计时0才触发
                  userObj.delayPlayCard = (function(self,userObj,desk,game){
                  return {
                      execFunc:function(){
                          
                        //上一手不是他自己出的
                        if(game.lastCardInfo.posId != userObj.posId){
                          game.next(userObj.posId, [], desk.islaizi);
                          var nextUserObj = self.getPosition(desk, game.getContextPosId());

                          self.broadCastRoom('CTX_PLAY_CHANGE', desk.deskId, {
                            ctxData: {
                              len: 0,
                              key: '',
                              type: '',
                              cards: [],
                              posId: userObj.posId,
                            },
                            posId: nextUserObj.posId,
                            timeout: 15,
                            server_time:getTimeStamp(),
                            isPass: true,
                          })
                        }else{ //上一手是他自己出的
                          //出最小的牌
                          var minCard = game.getMinCardsByPosId(userObj.posId);
                          if(minCard){
                            game.next(userObj.posId, [minCard], desk.islaizi);

                            self.broadCastRoom('CTX_PLAY_CHANGE',desk.deskId, {
                              ctxData: {
                                len: 1,
                                key: minCard.value,
                                type: 'A',
                                cards: [minCard],
                                posId: userObj.posId,
                              },
                              posId: game.getContextPosId(),
                              timeout: 15,
                              server_time:getTimeStamp(),
                              isPass: false,
                            });
                            if (game.getStatus() === 3) {
                              //游戏结束
                              self.doGameOver(desk,game);
                            }
                          }
                        }

                      }}
                  })(self,userObj,self.desks[i],game);
                  
                }
              }

              //记录掉线时间
              delete self.clients[userObj.uid];
              userObj.socket = null;
              userObj.disconnectTime = getTimeStamp();
              
              //通知其他人 该玩家掉线了
              self.broadCastRoom("CONNECT_STATE",self.desks[i].deskId,{state:0,posId:userObj.posId},userObj.uid);
              return;
            }
          }
        }
      });
    });

    http.listen(game_port, function(){
      console.log('listening on :'+game_port);
    });
  }
}

Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer()
gameServer.init()

app.get('/ddz/quit',function(req,res){
  const uid = req.query.uid;
  var deskId = gameServer.clearRoomByUid(uid);
  console.log("清空房间:"+deskId);
  res.send({state:0,msg:"退出成功",uid:uid});
})