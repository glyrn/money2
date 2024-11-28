const fs = require('fs');
const request = require('request')
const express = require('express'),
  app = express(),
  http = require('http').Server(app),
  io = require('socket.io')(http,{path:"/hlddz_socket.io"});
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

app.get('/', function (req, res) {
  res.sendFile(`${__dirname}/index.html`);
});

const Game = require('./game.js');
function createDeskList(n) {
  n = n || 50;
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
        posId: j,
        state: 0,
        userName: '',
        avatarUrl: '',
        score:0,
      })
    }
    ret.push(desk);
  }
  return ret;
}

function time() {
  return (new Date()).toLocaleTimeString();
}


var guid = function () {
  var n = 0;
  return function () {
    return ++n;
  }
}();


function GameServer(port) {
  this.clients = [];
  this.port = port;
  this.desks = createDeskList(20);
  this.gameDatas = {};
}
const proto = {
  broadCastHouse(event, data, socket) {
    socket = socket === undefined ? null : socket;
    this.clients.forEach((client, index) => {
      if (client.deskId === '') {
        client.socket.emit(event, data);
      }
    });
  },
  broadCastRoom(event, deskId, data, socket) {
    socket = socket === undefined ? null : socket;

    this.clients.forEach((client, index) => {
      if (client.deskId === deskId && client.socket !== socket) {
        client.socket.emit(event, data);
      }
    });
  },
  getDesk(deskId) {
    for (let i = 0, len = this.desks.length; i < len; i++) {
      let desk = this.desks[i];
      if (desk.deskId == deskId) {
        return desk;
      }
    }
    return null;
  },
  getDeskByName(deskName) {
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
  getOtherPosInfo(deskId, posId) {
    let desk = this.getDesk(deskId);
    if (desk) {
      let positions = desk.positions;
      return positions.filter(function (pos) {
        return pos.posId !== posId;
      })
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
  updatePosStatus(deskId, posId, state, userName,avatarUrl,score,uid) {
    const desk = this.getDesk(deskId);
    if (desk) {
      const position = this.getPosition(desk, posId);
      if (position) {
        position.state = state;
        if (userName === '' || userName) {
          position.userName = userName;
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
    this.clients.push({ uid:data.uid,userName: data.userName,avatarUrl:data.avatarUrl,score:data.score, socket: socket, deskId: '', posId: '' });
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
        return this.clients[i].userName;
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
  startGame(deskId,isRestart) {
    if (this.gameDatas[deskId] === undefined) {
      this.gameDatas[deskId] = new Game();
    }
    const game = this.gameDatas[deskId];
    game.init();
    const cards = game.start(isRestart).getCards();
    this.broadCastRoom('GAME_START', deskId, { cards });
    this.broadCastRoom('CTX_USER_CHANGE', deskId, { ctxPos: game.getContextPosId(), ctxScore: game.getContextScore(), timeout: 15 });
  },
  init() {

    function setHeartbeat(){
      setTimeout(setHeartbeat,5000);
      io.sockets.emit('ping',{beat:1});
    }
    setTimeout(setHeartbeat,5000);

    io.on('connection', socket => {
      socket.on('pong', function(data){
      });

      console.log('有客户端接入，时间： %s', time());
      socket.on('LOGIN', data => {
        if (this.checkUserName(data.uid)) {
          var that = this;
          var next = function(){
            that.addClient(socket, {uid:data.uid, userName:data.name,avatarUrl:data.avatarUrl,score:data.score});
            socket.emit('LOGIN_SUCCESS', this.desks);
            console.log('有客户端登录，时间： %s', time());
          }


          // try {
            //下载头像
            // var path = `${__dirname}/../doudizhu_client/avator/${data.uid}.jpg`;
            // if(!fs.existsSync(path)){
            //   request(data.avatarUrl).pipe(fs.createWriteStream(path)).on('close',next);
            // }else{
              next();
            // }
          // }catch (e){
          //   console.log('下载头像失败：'+data.avatarUrl);
          //   console.log(e.message)
          //   next();
          // }

        } else {
          socket.emit('LOGIN_FAIL', { msg: '该用户名已存在' });
        }
      });

      socket.on('SITDOWN', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        //找到桌子
        let desk = this.getDeskByName(data.deskName);
        if(!desk) {
          //房间已满
          socket.emit('SITDOWN_ERROR', { msg: '找不到可用的房间' });
          //坐下失败 强制退出
          this.removeClient(socket);
          return;
        }

        //检查该座位是否是空闲状态
          var newPosId = this.getEmptyPos(data.deskName);
        console.log("newPosId:",data.deskName,newPosId);
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

            console.log('有客户端进入房间，桌号：%s %s，座位：%s，时间： %s ，玩法：%s，总局数：%s，第%s局 ', desk.deskId,desk.name, newPosId, time(),islaizi,play_count,play_index);
            //更新座位状态为占用
            this.updatePosStatus(desk.deskId, newPosId, 1, this.getUserName(socket), this.getAvatarUrl(socket),this.getScore(socket),this.getUid(socket));
            //绑定客户端桌号，座位号
            this.updateClientState(socket, desk.deskId, newPosId);
            //获取除当前房间其它座位信息
            let posInfos = this.getOtherPosInfo(desk.deskId, newPosId);
            //通知该客户端坐下成功 并发送当前房间的信息给该客户端
            socket.emit('SITDOWN_SUCCESS', {posId:newPosId,deskId:desk.deskId,deskName:desk.name, posInfos, islaizi,base_score,play_count,play_index});
            //通知在大厅游览的所有客户端当前坐位已被占用
            this.broadCastHouse('STATUS_CHANGE', {deskId:desk.deskId, posId:newPosId, state: 1});

            //通知在房间里的其它客户端，更新座位息
            this.broadCastRoom("POS_STATUS_CHANGE", desk.deskId, {
              posId:newPosId,
              state: 1,
              userName: this.getUserName(socket),
              avatarUrl: this.getAvatarUrl(socket),
              score:this.getScore(socket),
              uid:this.getUid(socket),
            }, socket);

            //推送一条无关紧要的消息
            socket.emit('USER_MESSAGE', {type: 'SYS', posId:newPosId, msg: '欢迎您加入本房间，祝您游戏愉快！', id: guid(), time: time()});
            this.broadCastRoom('USER_MESSAGE', desk.deskId, {
              type: 'SYS',
              posId:newPosId,
              msg: `玩家[${this.getUserName(socket)}]进入房间`,
              id: guid(),
              time: time()
            }, socket);
        } else {
          //通知该客户端此座位被人占用
          socket.emit('SITDOWN_ERROR', { msg: '房间已满员' });
          //坐下失败 强制退出
          this.removeClient(socket);
          //由于当前位置被占用可能是由于该客户端数据不同步造成，所以再次向该客户端推送一次所有桌数据
          socket.emit('REFRESH_LIST', this.desks);
        }
      });

      socket.on('UNSITDOWN', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        if (!deskId) {
          return;
        }
        console.log('有客户端退出房间，桌号：%s，座位：%s，时间：', deskId, posId, time());
        //更新座位状态
        this.updatePosStatus(deskId, posId, 0, '','',0,0);
        //重置房间状态
        this.updateRoomStatus(deskId, posId, 0);
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
        socket.emit('UNSITDOWN_SUCCESS', this.desks);


        //推送一条无关紧要的消息
        this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: `玩家[${this.getUserName(socket)}]退出房间`, id: guid(), time: time() })
      });

      socket.on('PREPARE', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        if (!deskId) {
          return;
        }
        //更新座位为准备状态
        this.updatePosStatus(deskId, posId, 2);
        //通知该客户端准备成功
        socket.emit('PREPARE_SUCCESS');
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
        const { deskId, posId } = client;
        const game = this.gameDatas[deskId];
        if (!game || !deskId) {
          return;
        }

        const status = game.next(posId, score).getStatus();
        if (status == 1) {
          socket.emit('CALL_SCORE_SUCCESS',score);
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
          socket.emit('CALL_SCORE_SUCCESS',score);
          this.broadCastRoom('SHOW_TOP_CARD', deskId, { topCards,laiziCards, dizhuPosId, timeout: 15 });
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
          socket.emit('CALL_SCORE_SUCCESS',0);
          this.startGame(deskId,true);
          //推送一条无关紧要的消息
          this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: '本局游戏无人叫分，重新发牌', id: guid(), time: time() })
        }
      });

      socket.on('PLAY_CARD', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        const game = this.gameDatas[deskId];
        if (game && deskId) {
          let desk = this.getDesk(deskId);
          let islaizi = desk.islaizi;
          const ret = game.validate(posId, data,islaizi);
          const isPass = !data.length;
          const { status } = ret;
          if (status || !data.length) {
            game.next(posId, data,islaizi);

            if (game.getStatus() === 5) {
              socket.emit('PLAY_CARD_ERROR', '游戏出错');
              return;
            }

            this.broadCastRoom('CTX_PLAY_CHANGE', deskId, {
              ctxData: {
                len: data.length,
                key: ret.key,
                type: ret.type,
                cards: data,
                posId
              },
              posId: game.getContextPosId(),
              timeout: 15,
              isPass
            })
            socket.emit('PLAY_CARD_SUCCESS', data)
            if (game.getStatus() === 3) {

              this.broadCastRoom('GAME_OVER', deskId, game.getResult())
              desk.play_index++;
              if(desk.play_count < desk.play_index){ //剩余局数为0
                desk.play_index = 1;
              }
              this.updatePosStatus(deskId, 0, 1);
              this.updatePosStatus(deskId, 1, 1);
              this.updatePosStatus(deskId, 2, 1);
              game.init();
            }


          } else {
            socket.emit('PLAY_CARD_ERROR', '你的牌不符合规则')
          }
        }
      });

      socket.on('disconnect', data => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const userName = this.getUserName(socket);
        const { deskId, posId } = client;
        this.removeClient(socket);

        if (deskId) {
          //更新座位状态
          this.updatePosStatus(deskId, posId, 0, '','',0,0);
          //重置房间状态
          this.updateRoomStatus(deskId, posId, 0);
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
          //推送一条无关紧要的消息
          this.broadCastRoom('USER_MESSAGE', deskId, { type: 'SYS', posId, msg: `玩家[${userName}]退出房间`, id: guid(), time: time() })
          console.log('有客户端退出房间，桌号：%s，座位：%s，时间：', deskId, posId, time());
        }

        console.log('有客户端断开了连接 %s', time());
      })

      socket.on('USER_MESSAGE', msg => {
        const client = this.getClient(socket);
        if (!client) {
          return;
        }
        const { deskId, posId } = client;
        if (!deskId) {
          return;
        }
        this.broadCastRoom('USER_MESSAGE', deskId, { type: 'USER', posId, msg, time: time(), id: guid() })
      })


    });


    http.listen(this.port, () => {
      console.log(`server is running on port ${this.port}`);
      // (require('os').platform() == 'win32') && require('child_process').exec(`start http://localhost:${this.port}/index.html`);
    });
  }
}
Object.assign(GameServer.prototype, proto);
const gameServer = new GameServer(9001);
gameServer.init();
