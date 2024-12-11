const fs = require('fs');
const request = require('request')
const express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http,{path:'/dfw_socket.io'});
app.use(express.static(`${__dirname}/../monopoly_client`));
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
//获取 0-num范围的随机整数
  getRandomNumForRange:function(num) {
    return Math.round(Math.random() * num);
  },
  //创建地图
  createMap:function(){

    const grids = [];
    for (let i = 0; i < 40; i++) {
      grids.push({idx:i,belong:-1,type:-1,build:-1,land_price:1000,build_price:2000,rent:1000*0.3});
    }
    for (let i = 0; i < 6; i++) {
      var grid = grids[this.getRandomNumForRange(38)+1];
      grid.type = 1;// 命运
    }
    // //debug
    // grids[3].type = 3;
    // grids[3].belong = 0;
    // grids[3].build = 4;

    for (let i = 0; i < 3; i++) {
      var grid = grids[this.getRandomNumForRange(38)+1];
      grid.type = 2;// 监狱
      grid.ext = {
        money:500,
        round:this.getRandomNumForRange(2)+1
      }
    }
    return grids;
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
        start_money:1500,
        max_turns:0,
        play_mode:-1,
        play_index:1,
        round:0,
      }
      for (let j = 0; j < 6; j++) {
        desk.positions.push({
          uid:0,
          posId: j,
          state: 0,
          name: '',
          avatorUrl: '',
          socket:null,
          money:0,
          remain_skip_round:0,
          save_money:0, //存款
          interest_money:0, //利息
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
  getNextPosId:function(socket,curPosId){
    var desk = this.getDesk(socket)
    var nextPosId;
    if(desk.direct == 1){ //顺时针方向
      if(curPosId + 1 >= desk.ready_count){
        nextPosId = 0;
      }else{
        nextPosId = curPosId + 1;
      }

    }else if(desk.direct == 0){ //逆时针
      if(curPosId - 1 >= 0){
        nextPosId = curPosId - 1;
      }else{
        nextPosId = desk.ready_count - 1;
      }
    }

    //需要跳过
    if(desk.positions[nextPosId].remain_skip_round > 0){
      desk.positions[nextPosId].remain_skip_round--;
      return this.getNextPosId(socket,nextPosId);
    }
    if(desk.positions[nextPosId].broken == 1){
      return this.getNextPosId(socket,nextPosId);
    }
    return nextPosId;
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
  checkGameOver:function(desk){
    if(desk.round == desk.max_turns){
      var score_list = [];
      var winer = 0;
      for (let i = 0; i < desk.play_mode; i++) {
        var house = 0;
        for (const k in desk.game_map) {
            var map_info = desk.game_map[k];
            if(map_info.belong == i){
              house = (map_info.build * map_info.build_price + map_info.land_price) * 0.9;
            }
        }

        score_list.push(
            parseInt(desk.positions[i].money)+
            parseInt(desk.positions[i].save_money)+
            parseInt(desk.positions[i].interest_money)+
            house
        );
        if(desk.positions[i].money > desk.positions[winer].money){
          winer = i;
        }
      }
      this.broadCastRoom("GAME_OVER",desk.deskId,{score_list:score_list,winer:winer});
    }
  },
  init:function () {

    const self = this;

    function setHeartbeat() {
      setTimeout(setHeartbeat, 5000);
      io.sockets.emit('ping', {beat: 1});
    }
    setTimeout(setHeartbeat, 5000);

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
                room.positions[i].socket = socket;
                room.positions[i].money = obj.start_money ?? 1500;
                obj.posId = room.positions[i].posId;
                obj.state = 1;
                obj.place_index = 0;
                room.positions[i].place_index = obj.place_index;
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
                  room.start_money = obj.start_money ?? 1500;
                  room.play_mode = obj.play_mode;
                  room.ready_count = obj.play_mode;
                  room.max_turns = obj.max_turns ?? 100;
                }

                var playerData = [];
                for (let i = 0; i < room.positions.length; i++) {
                  if(room.positions[i].state > 0){
                    playerData[room.positions[i].posId] = {
                      uid: room.positions[i].uid,
                      state: room.positions[i].state,
                      name: room.positions[i].name,
                      avatorUrl: room.positions[i].avatorUrl,
                      posId: room.positions[i].posId,
                      money: parseInt(room.start_money),
                      place_index:room.positions[i].place_index,
                      save_money:room.positions[i].save_money,
                      interest_money:room.positions[i].interest_money,
                    };
                  }
                }

                socket.emit("LOGIN_SUCCESS",{
                  roomId:room.name,
                  posId:obj.posId,
                  playerData:playerData,
                });
                self.broadCastRoom("SIT_CHANGE",room.deskId,{target:playerData[obj.posId],posId:obj.posId},obj.uid)
              }

              next();

            }else{
              socket.emit("MESSAGE",'房间已满员');
            }
          }
      })

      socket.on("PREPARE",function(){

        var isStartGame = false;
        var ready_count = 0;
        const desk = self.getDesk(socket);
        for (let j = 0; j < desk.positions.length; j++) {
          const userObj = desk.positions[j];
          if(userObj.state == 1 && userObj.socket && userObj.socket.id == socket.id){
            desk.positions[j].state = 2;
          }
          if(desk.positions[j].state == 2){
            ready_count++;
          }
        }

        if(desk.play_mode == ready_count ){
          desk.state = 1;//开始游戏
          isStartGame = true;
        }

        self.broadCastRoom("PREPARE_SUCCESS",self.getDeskId(socket),self.getPosId(socket));
        if(isStartGame)
        {
          desk.direct = 1;//顺时针方向
          desk.game_map = self.createMap();
          desk.start_posId = self.getRandomNumForRange(ready_count-1);
          desk.round = 0;
          desk.start_time = Date.parse(new Date()) / 1000;

          for (let i = 0; i < ready_count; i++) {
              const userObj = desk.positions[i];
              userObj.place_index = 0;
              userObj.state = 1;
              userObj.money = desk.start_money;
              userObj.socket.emit('GAME_START',{game_map:desk.game_map,turn:desk.start_posId});
          }
        }
      });

      socket.on('MAKE_DICE_NUM', function(){

        var posId = self.getPosId(socket);
        var num = self.getRandomNumForRange(5)+1;
        // num = 3;
        var desk = self.getDesk(socket);

        if(desk.state == 1){
          desk.cur_dice_num = num;
          var from_place_index = desk.positions[posId].place_index;
          if(from_place_index + num > 40-1){
            desk.positions[posId].place_index = from_place_index + num - 40;
          }else{
            desk.positions[posId].place_index = from_place_index + num;
          }
          var to_place_index = desk.positions[posId].place_index;

          var interest_list = []
          if(posId == desk.start_posId){
              desk.round++;
              //计算利息
              for (let i = 0; i < desk.positions.length; i++) {
                var info = desk.positions[i];
                if(info.save_money > 0){
                  info.interest_money += info.save_money * 0.05; //利率
                  interest_list.push({posId:info.posId,interest_money:info.interest_money});
                }
              }
          }

          self.broadCastRoom("MAKE_DICE_NUM_SUCCESS",self.getDeskId(socket),{
            num:num,
            posId:posId,
            from_place_index:from_place_index,
            to_place_index:to_place_index,
            round:desk.round,
            interest_list:interest_list,
          });
          //检测是否结束游戏
          self.checkGameOver(desk);
        }
      });

      //支付保释金
      socket.on("PAY_BAIL",function(){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var map_info = desk.game_map[desk.positions[posId].place_index];
        if(map_info.type == 2){
          desk.positions[posId].money -= map_info.ext.money;
        }
        self.broadCastRoom("PAY_BAIL_SUCCESS",self.getDeskId(socket),{
          posId:posId,money:desk.positions[posId].money});
        //下一个
        var nexPosId = self.getNextPosId(socket,posId);
        self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:nexPosId});
      });

      //进监狱
      socket.on("IN_JAIL",function(){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var map_info = desk.game_map[desk.positions[posId].place_index];
        if(map_info.type == 2){
          //剩余跳过次数
          desk.positions[posId].remain_skip_round = map_info.ext.round; //正在跳过回合中
          var nexPosId = self.getNextPosId(socket,posId);

          self.broadCastRoom("IN_JAIL_SUCCESS",self.getDeskId(socket),{msg:desk.positions[posId].name+":执行相关法律法规，收监"+map_info.ext.round+"个回合",event:2});
          self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:nexPosId});
        }
      });

      socket.on('NEXT_PLAYER_DICE',function(){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var nexPosId = self.getNextPosId(socket,posId);
        self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:nexPosId});
      });

      socket.on("BUY_BANK_ASSET",function (list){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        for (let i = 0; i < list.length; i++) {
          var map_info = desk.game_map[list[i]];
          var sell_price = (map_info.land_price + map_info.build * map_info.build_price) * 1.2;
          if(parseInt(desk.positions[posId].money) >= sell_price){
            desk.positions[posId].money = parseInt(desk.positions[posId].money) - sell_price;
            map_info.is_sell = 0;
            map_info.belong = posId;
          }else{
            socket.emit("MESSAGE",'余额不足，支付失败！');
            break;
          }
        }

        self.broadCastRoom('BUY_BANK_ASSET_SUCCESS',self.getDeskId(socket),{buy_list:list,posId:posId,money:desk.positions[posId].money});
      });

      socket.on('BUY_BUILD',function(data){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var place_index = desk.positions[posId].place_index;
        var map_info = desk.game_map[place_index];
        var build = map_info.build;
        var type = map_info.type;

        //空地 未建
        if(type == -1){
          if(build == -1){

            //够钱
            if(desk.positions[posId].money >= map_info.land_price){
              desk.positions[posId].money -= map_info.land_price;

              map_info.type = 3; //已买
              map_info.belong = posId;
              map_info.build = 0;

            }else{ //不够钱买
                socket.emit("MESSAGE",'余额不足，支付失败！');
                self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:self.getNextPosId(socket,posId)});
                return
            }
          }
          //已买地
        }else if(type == 3){
          if(build >= 0){ //未建
            //够钱
            if(desk.positions[posId].money >= map_info.build_price){
              desk.positions[posId].money -= map_info.build_price;

              map_info.build = map_info.build + 1;
              map_info.rent = (map_info.land_price+map_info.build_price * map_info.build) * 0.3;

            }else{ //不够钱
              socket.emit("MESSAGE",'余额不足，支付失败！');
              self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:self.getNextPosId(socket,posId)});
              return
            }
          }
        }
        self.broadCastRoom("BUY_BUILD_SUCCESS",self.getDeskId(socket),{posId:posId,money:desk.positions[posId].money,map_info:desk.game_map[place_index]});
        self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:self.getNextPosId(socket,posId)});
      });
      socket.on('PAY_RENT',function(){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var place_index = desk.positions[posId].place_index;
        var map_info = desk.game_map[place_index];
        var rent = map_info.rent;
        var belong = map_info.belong;
        var sell = [];
        desk.positions[posId].money = parseInt(desk.positions[posId].money);
        desk.positions[belong].money = parseInt(desk.positions[belong].money);
        //够钱交租
        if(desk.positions[posId].money >= rent) {
          desk.positions[posId].money -= rent;
          desk.positions[belong].money += rent;
          //利息
        }else if (desk.positions[posId].interest_money >= rent) {
          desk.positions[posId].interest_money -= rent;
          desk.positions[belong].money += rent;
          //本金
        }else if (desk.positions[posId].save_money >= rent) {
          desk.positions[posId].save_money -= rent;
          desk.positions[belong].money += rent;
        }else{ //出售资产

          var is_enough = false;
          for (const place_index in desk.game_map) {
            if(map_info.belong == posId){ //找出自己的资产
              //8折套现
              map_info.belong = -1;
              desk.positions[posId].money += (map_info.land_price + map_info.build * map_info.build_price) * 0.8;
              sell.push(map_info);
              //够钱交租
              if(desk.positions[posId].money >= rent){
                is_enough = true;
                desk.positions[posId].money -= rent;
                desk.positions[belong].money += rent;
                break;
              }
              //继续出售
            }
          }
          //不够钱
          if(is_enough == false){
            desk.positions[posId].broken = 1;//破产
            self.broadCastRoom("MESSAGE",desk.deskId,'余额不足，支付失败！'+desk.positions[posId].name+':宣布破产！');
            self.broadCastRoom("PLAYER_BROKEN",self.getDeskId(socket),{posId:posId});
            self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:self.getNextPosId(socket,posId)});
            return;
          }
        }

        self.broadCastRoom("PAY_RENT_SUCCESS",self.getDeskId(socket),{
          posId1:posId,
          posId2:belong,
          sell:sell,
          money1:desk.positions[posId].money,
          money2:desk.positions[belong].money,
          game_map:desk.game_map});
        self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:self.getNextPosId(socket,posId)});
      });

      socket.on('LUCKY_EVENT',function(){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var append = parseInt(self.getRandomNumForRange(9)+1) * 100;

        desk.positions[posId].money = parseInt(desk.positions[posId].money) + parseInt(append);

        self.broadCastRoom("LUCKY_EVENT_SUCCESS",self.getDeskId(socket),{
          money:desk.positions[posId].money,posId:posId,
          msg:desk.positions[posId].name+':走路捡到钱：'+append+"元",
          event:1,
        });
        self.broadCastRoom("NEXT_PLAYER_DICE_SUCCESS",self.getDeskId(socket),{turn:self.getNextPosId(socket,posId)});
      });

      socket.on('SAVE_MONEY',function(data){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var user = desk.positions[posId];
        if(user.money >= parseInt(data.save_money)){
          user.money = parseInt(user.money) - parseInt(data.save_money);
          user.save_money += parseInt(data.save_money);
          self.broadCastRoom("MESSAGE",desk.deskId,'玩家'+user.name+'在银行存进了：'+data.save_money+"元");
          self.broadCastRoom("SAVE_MONEY_SUCCESS",desk.deskId,{posId:posId,save_money:user.save_money,interest_money:user.interest_money,money:user.money})
        }else{
          socket.emit("MESSAGE",desk.deskId,'余额不足，存入失败！');
        }
      });

      socket.on("BANK_SELL_BUILD",function(data){

        var desk = self.getDesk(socket);
        for (let i = 0; i < data.sell_list.length; i++) {
          desk.game_map[data.sell_list[i]].is_sell = 1;
        }
        socket.emit('BANK_SELL_BUILD_SUCCESS',data);
      });

      socket.on("WITHDRAW_MONEY",function(){
        var posId = self.getPosId(socket);
        var desk = self.getDesk(socket);
        var user = desk.positions[posId];

        var withdrawOKfunc = function(){
          self.broadCastRoom("MESSAGE",desk.deskId,'玩家'+user.name+'在银行存提现：'+1000+"元");
          self.broadCastRoom("WITHDRAW_MONEY_SUCCESS",desk.deskId,{posId:posId,save_money:user.save_money,interest_money:user.interest_money,money:user.money})
        }
        if(user.interest_money >= 1000) {
          user.money = parseInt(user.money) + 1000;
          user.interest_money -= 1000;
          withdrawOKfunc();
        }else if(user.save_money >= 1000){
          user.money = parseInt(user.money) + 1000;
          user.save_money -= 1000;
          withdrawOKfunc();
        }else{
          socket.emit("MESSAGE",'余额不足，提现失败！');
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
              self.desks[i].positions[j].money = 0;
              self.desks[i].positions[j].save_money = 0;
              self.desks[i].positions[j].interest_money = 0;
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
            self.desks[i].round = 0;
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
