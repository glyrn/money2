import chessLogic from "./chessLogic";
import AI from './AI';
import globalData from "./globalData";

var playLogic = cc.playLogic || {};
//debug
cc.playLogic = playLogic;

playLogic.init = function (depth, map){
    var map = map || chessLogic.initMap;
    var depth = depth || 3
    playLogic.my				=	1;				//玩家方
    playLogic.nowMap			=	map;
    playLogic.map 			=	chessLogic.arr2Clone ( map );		//初始化棋盘
    playLogic.nowManKey		=	false;			//现在要操作的棋子
    playLogic.pace 			=	[];				//记录每一步
    playLogic.isPlay 		=	false ;			//是否能走棋

    playLogic.bylaw 			= 	chessLogic.bylaw;
    playLogic.show 			= 	chessLogic.show;
    playLogic.showPane 		= 	chessLogic.showPane;
    playLogic.isOffensive	=	true;			//是否先手
    playLogic.depth			=	depth;			//搜索深度
    playLogic.isFoul			=	false;			//是否犯规长将
    chessLogic.childList = chessLogic.childList || [];
    if (!chessLogic.dot && chessLogic.class && chessLogic.class.Dot) {
        chessLogic.dot = new chessLogic.class.Dot();
        chessLogic.childList.push(chessLogic.dot);
    }
    if (!chessLogic.pane && chessLogic.class && chessLogic.class.Pane) {
        chessLogic.pane = new chessLogic.class.Pane();
        chessLogic.childList.push(chessLogic.pane);
    }
    if (chessLogic.pane) {
        chessLogic.pane.isShow		=	false;			//隐藏方块
    }

    //清除所有旗子
    playLogic.mans 			=	chessLogic.mans	= {};

    for (let i = 0; i < chessLogic.childList.length; i++) {
        if (chessLogic.childList[i]) {
            chessLogic.childList[i].isShow = false;
        }
    }
    chessLogic.show();

    chessLogic.createMans( map,playLogic.rotation )		//生成棋子

    //初始化棋子
    for (var i=0; i<playLogic.map.length; i++){
        for (var n=0; n<playLogic.map[i].length; n++){
            var key = playLogic.map[i][n];
            if (key){
                if (!chessLogic.mans[key]) {
                    chessLogic.mans[key] = new chessLogic.class.Man(key);
                    chessLogic.childList.push(chessLogic.mans[key]);
                }
                chessLogic.mans[key].x=n;
                chessLogic.mans[key].y=i;
                chessLogic.mans[key].isShow = true;
            }
        }
    }
    playLogic.show();
}


//悔棋
playLogic.regret = function (){
    var map  = chessLogic.arr2Clone(chessLogic.initMap);
    //初始化所有棋子
    for (var i=0; i<map.length; i++){
        for (var n=0; n<map[i].length; n++){
            var key = map[i][n];
            if (key){
                chessLogic.mans[key].x=n;
                chessLogic.mans[key].y=i;
                chessLogic.mans[key].isShow = true;
            }
        }
    }
    var pace= playLogic.pace;
    // pace.pop();
    pace.pop();

    for (var i=0; i<pace.length; i++){
        var p= pace[i].split("")
        var x = parseInt(p[0], 10);
        var y = parseInt(p[1], 10);
        var newX = parseInt(p[2], 10);
        var newY = parseInt(p[3], 10);
        var key=map[y][x];
        //try{

        var cMan=map[newY][newX];
        if (cMan) chessLogic.mans[map[newY][newX]].isShow = false;
        chessLogic.mans[key].x = newX;
        chessLogic.mans[key].y = newY;
        map[newY][newX] = key;
        delete map[y][x];
        if (i==pace.length-1){
            chessLogic.showPane(newX ,newY,x,y)
        }
        //} catch (e){
        //	chessLogic.show()
        //	z([key,p,pace,map])

        //	}
    }
    playLogic.map = map;
    playLogic.my=1;
    playLogic.isPlay=true;
    chessLogic.show();
}


//点击棋盘事件
playLogic.clickCanvas = function (x,y){

    if (!playLogic.isPlay) return false;

    var key = playLogic.getClickMan(x,y);
    // console.log(x,y,playLogic.isPlay,key)
    if (key){
        playLogic.clickMan(key,x,y);
    }else {
        playLogic.clickPoint(x,y);
    }
    playLogic.isFoul = playLogic.checkFoul();//检测是不是长将
}

//点击棋子，两种情况，选中或者吃子
playLogic.clickMan = function (key,x,y){
    console.log(key,x,y ,playLogic.nowManKey)
    var man = chessLogic.mans[key];
    //吃子
    if (playLogic.nowManKey&&playLogic.nowManKey != key && man.my != chessLogic.mans[playLogic.nowManKey ].my){
        //man为被吃掉的棋子
        if (playLogic.indexOfPs(chessLogic.mans[playLogic.nowManKey].ps,[x,y])){
            man.isShow = false;
            var pace=chessLogic.mans[playLogic.nowManKey].x+""+chessLogic.mans[playLogic.nowManKey].y
            //z(bill.createMove(playLogic.map,man.x,man.y,x,y))
            delete playLogic.map[chessLogic.mans[playLogic.nowManKey].y][chessLogic.mans[playLogic.nowManKey].x];
            playLogic.map[y][x] = playLogic.nowManKey;
            chessLogic.showPane(chessLogic.mans[playLogic.nowManKey].x ,chessLogic.mans[playLogic.nowManKey].y,x,y)
            chessLogic.mans[playLogic.nowManKey].x = x;
            chessLogic.mans[playLogic.nowManKey].y = y;
            // chessLogic.mans[playLogic.nowManKey].alpha = 1

            playLogic.pace.push(pace+x+y);
            playLogic.nowManKey = false;
            // chessLogic.pane.isShow = false;
            chessLogic.dot.dots = [];
            chessLogic.dot.isShowChoice = false;
            chessLogic.show()
            cc.playEffect('eat',false,1);

            if(globalData.gameMgr.play_mode == 0) {
                setTimeout(playLogic.AIPlay, 500);
            }else{
                if(!(key == "j0" || key == "J0")){
                    globalData.eventlister.fire('CHECK_END');
                    globalData.gameMgr.playerData.turn = globalData.gameMgr.playerData.turn == 0 ? 1 : 0;
                    globalData.eventlister.fire('CHANGE_TURN');
                }
            }
            if (key == "j0") playLogic.showWin (-1);
            if (key == "J0") playLogic.showWin (1);
        }
        // 选中棋子
    }else{
        if ((globalData.gameMgr.play_mode == 0 && man.my===1) ||
            (globalData.gameMgr.play_mode == 1)){
            // if (chessLogic.mans[playLogic.nowManKey]) chessLogic.mans[playLogic.nowManKey].alpha = 1 ;
            // man.alpha = 0.8;
            // chessLogic.pane.isShow = false;
            playLogic.nowManKey = key;
            chessLogic.mans[key].ps = chessLogic.mans[key].bl(); //获得所有能着点

            chessLogic.dot.dots = chessLogic.mans[key].ps;
            chessLogic.dot.choiceX = chessLogic.mans[key].x;
            chessLogic.dot.choiceY = chessLogic.mans[key].y;
            chessLogic.dot.isShowChoice = true;
            chessLogic.dot.isShow = true;
            chessLogic.show();
            cc.playEffect('select',false,1);
        }
    }
}

//点击着点
playLogic.clickPoint = function (x,y){
    var key=playLogic.nowManKey;
    var man=chessLogic.mans[key];
    if (playLogic.nowManKey){
        if (playLogic.indexOfPs(chessLogic.mans[key].ps,[x,y])){
            var pace=man.x+""+man.y
            //z(bill.createMove(playLogic.map,man.x,man.y,x,y))
            delete playLogic.map[man.y][man.x];
            playLogic.map[y][x] = key;
            chessLogic.showPane(man.x ,man.y,x,y)
            man.x = x;
            man.y = y;
            // man.alpha = 1;
            playLogic.pace.push(pace+x+y);
            playLogic.nowManKey = false;
            chessLogic.dot.dots = [];
            chessLogic.dot.isShowChoice = false;
            chessLogic.show();
            cc.playEffect('click',false,1);
            // chessLogic.get("clickAudio").play();
            if(globalData.gameMgr.play_mode == 0){
                setTimeout(playLogic.AIPlay,500);
            }else{
                globalData.eventlister.fire('CHECK_END');
                globalData.gameMgr.playerData.turn = globalData.gameMgr.playerData.turn == 0 ? 1 : 0;
                console.log("turn :",globalData.gameMgr.playerData.turn);
                globalData.eventlister.fire('CHANGE_TURN');
            }
        }else{
            //alert("不能这么走哦！")
        }
    }
}

playLogic.AICheckRedEnd = function(){

    var isRed = 1;
    playLogic.my = 1;
    var ret = AI.init(playLogic.pace.join(""));
    if(!ret){
        console.log("将军检查无可用应招，游戏继续");
        return -1;
    }else{
        var key=playLogic.map[ret[3]][ret[2]];
        if(key == 'J0'){
            globalData.eventlister.fire('SHOW_JIANGJUN')
        }
        console.log("游戏继续:"+key);
        return -1;
    }
}

playLogic.AICheckBlackEnd = function(){

    var isBlack = 0;
    playLogic.my = -1;
    var ret = AI.init(playLogic.pace.join(""));
    if(!ret){
        console.log("将军检查无可用应招，游戏继续");
        return -1;
    }else{
        var key=playLogic.map[ret[3]][ret[2]];
        if(key == 'j0'){
            globalData.eventlister.fire('SHOW_JIANGJUN')
        }
        console.log("游戏继续:"+key);
        return -1;
    }
}

//Ai自动走棋
playLogic.AIPlay = function (){

    playLogic.my = -1 ;
    var pace=AI.init(playLogic.pace.join(""))
    if (!pace) {
        playLogic.showWin (1);
        return ;
    }
    playLogic.pace.push(pace.join(""));
    var key=playLogic.map[pace[1]][pace[0]]
    playLogic.nowManKey = key;

    var key=playLogic.map[pace[3]][pace[2]];
    if (key){
        playLogic.AIclickMan(key,pace[2],pace[3]);
    }else {
        playLogic.AIclickPoint(pace[2],pace[3]);
    }
    cc.playEffect('click',false,1);
}

//检查是否长将
playLogic.checkFoul = function(){
    var p=playLogic.pace;
    var len=parseInt(p.length,10);
    if (len>11&&p[len-1] == p[len-5] &&p[len-5] == p[len-9]){
        return p[len-4].split("");
    }
    return false;
}


playLogic.AIclickMan = function (key,x,y){
    var man = chessLogic.mans[key];
    //吃子
    man.isShow = false;
    delete playLogic.map[chessLogic.mans[playLogic.nowManKey].y][chessLogic.mans[playLogic.nowManKey].x];
    playLogic.map[y][x] = playLogic.nowManKey;
    playLogic.showPane(chessLogic.mans[playLogic.nowManKey].x ,chessLogic.mans[playLogic.nowManKey].y,x,y)

    chessLogic.mans[playLogic.nowManKey].x = x;
    chessLogic.mans[playLogic.nowManKey].y = y;
    playLogic.nowManKey = false;

    chessLogic.show()
    if (key == "j0") playLogic.showWin (-1);
    if (key == "J0") playLogic.showWin (1);
}

playLogic.AIclickPoint = function (x,y){
    var key=playLogic.nowManKey;
    var man=chessLogic.mans[key];
    if (playLogic.nowManKey){
        delete playLogic.map[chessLogic.mans[playLogic.nowManKey].y][chessLogic.mans[playLogic.nowManKey].x];
        playLogic.map[y][x] = key;

        chessLogic.showPane(man.x,man.y,x,y)

        man.x = x;
        man.y = y;
        playLogic.nowManKey = false;

    }
    chessLogic.show();
}


playLogic.indexOfPs = function (ps,xy){
    for (var i=0; i<ps.length; i++){
        if (ps[i][0]==xy[0]&&ps[i][1]==xy[1]) return true;
    }
    return false;
}

//获得棋子
playLogic.getClickMan = function (x,y){
    if (x < 0 || x>8 || y < 0 || y > 9) return false;
    return (playLogic.map[y][x] && playLogic.map[y][x]!="0") ? playLogic.map[y][x] : false;
}

playLogic.showWin = function (my){
    playLogic.isPlay = false;

    if(globalData.gameMgr.play_mode == 1){ //人人
        globalData.eventlister.fire('GAME_OVER',{score:100,winer:globalData.gameMgr.playerData.turn});
    }else{
        if (my===1){
            console.log("恭喜你，你赢了！");
            globalData.eventlister.fire('GAME_OVER',{score:100,winer:globalData.gameMgr.playerData.self.posId})
        }else{
            console.log("很遗憾，你输了！");
            globalData.eventlister.fire('GAME_OVER',{score:100,winer:globalData.gameMgr.playerData.pc.posId});
        }
    }


}

playLogic.clearSelection = function(){
    playLogic.nowManKey = false;
    chessLogic.dot.dots = [];
    chessLogic.dot.isShowChoice = false;
    chessLogic.dot.isShow = false;
    chessLogic.show();
};

playLogic.reset = function(){
    playLogic.map =	chessLogic.arr2Clone ( chessLogic.initMap );
    playLogic.pace = [];
}

export default playLogic
