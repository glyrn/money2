import playLogic from "./playLogic";
import gambitall from './gambitall';
import AI from './AI';
var chessLogic = chessLogic||{};

chessLogic.init = function (){

    var style = {
        width:530,		//画布宽度
        height:567, 		//画布高度
        spaceX:60,		//着点X跨度
        spaceY:58,		//着点Y跨度
        pointStartX:21,		//第一个着点X坐标;
        pointStartY:25,		//第一个着点Y坐标;
    }
    chessLogic.width			=	style.width;		//画布宽度
    chessLogic.height			=	style.height; 		//画布高度
    chessLogic.spaceX			=	style.spaceX;		//着点X跨度
    chessLogic.spaceY			=	style.spaceY;		//着点Y跨度
    chessLogic.pointStartX		=	style.pointStartX;	//第一个着点X坐标;
    chessLogic.pointStartY		=	style.pointStartY;	//第一个着点Y坐标;
    chessLogic.childList		=	chessLogic.childList||[];

    chessLogic.dot = new chessLogic.class.Dot();
    chessLogic.pane=new chessLogic.class.Pane();
    chessLogic.pane.isShow=false;

    chessLogic.childList=[chessLogic.dot,chessLogic.pane];
    chessLogic.mans = {};		//棋子集合

    chessLogic.gambit = gambitall.data.split(" ");
    AI.historyBill =  chessLogic.gambit;
}


//显示列表
chessLogic.show = function (){
    for (var i=0; i<chessLogic.childList.length ; i++){
        chessLogic.childList[i].show();
    }
}

//显示移动的棋子外框
chessLogic.showPane  = function (x, y, newX, newY){
    chessLogic.pane.isShow=true;
    chessLogic.pane.x= x ;
    chessLogic.pane.y= y ;
    chessLogic.pane.newX= newX ;
    chessLogic.pane.newY= newY ;
    chessLogic.pane.show()
}

//生成map里面有的棋子
chessLogic.createMans = function(map){
    for (var i=0; i<map.length; i++){
        for (var n=0; n<map[i].length; n++){
            var key = map[i][n];
            if (key){
                chessLogic.mans[key]=new chessLogic.class.Man(key);
                chessLogic.mans[key].x=n;
                chessLogic.mans[key].y=i;
                chessLogic.mans[key].originX=n;
                chessLogic.mans[key].originY=i;
                chessLogic.childList.push(chessLogic.mans[key])
            }
        }
    }
}

//二维数组克隆
chessLogic.arr2Clone = function (arr){
    var newArr=[];
    for (var i=0; i<arr.length ; i++){
        newArr[i] = arr[i].slice();
    }
    return newArr;
}

chessLogic.initMap = [
    ['C0','M0','X0','S0','J0','S1','X1','M1','C1'],
    [    ,    ,    ,    ,    ,    ,    ,    ,    ],
    [    ,'P0',    ,    ,    ,    ,    ,'P1',    ],
    ['Z0',    ,'Z1',    ,'Z2',    ,'Z3',    ,'Z4'],
    [    ,    ,    ,    ,    ,    ,    ,    ,    ],
    [    ,    ,    ,    ,    ,    ,    ,    ,    ],
    ['z0',    ,'z1',    ,'z2',    ,'z3',    ,'z4'],
    [    ,'p0',    ,    ,    ,    ,    ,'p1',    ],
    [    ,    ,    ,    ,    ,    ,    ,    ,    ],
    ['c0','m0','x0','s0','j0','s1','x1','m1','c1']
];

chessLogic.keys = {
    "c0":"c","c1":"c",
    "m0":"m","m1":"m",
    "x0":"x","x1":"x",
    "s0":"s","s1":"s",
    "j0":"j",
    "p0":"p","p1":"p",
    "z0":"z","z1":"z","z2":"z","z3":"z","z4":"z","z5":"z",

    "C0":"c","C1":"C",
    "M0":"M","M1":"M",
    "X0":"X","X1":"X",
    "S0":"S","S1":"S",
    "J0":"J",
    "P0":"P","P1":"P",
    "Z0":"Z","Z1":"Z","Z2":"Z","Z3":"Z","Z4":"Z","Z5":"Z",
}

//棋子能走的着点
chessLogic.bylaw ={}
//车
chessLogic.bylaw.c = function (x, y, map, my){
    var d=[];
    //左侧检索
    for (var i=x-1; i>= 0; i--){
        if (map[y][i]) {
            if (chessLogic.mans[map[y][i]].my!=my) d.push([i,y]);
            break
        }else{
            d.push([i,y])
        }
    }
    //右侧检索
    for (var i=x+1; i <= 8; i++){
        if (map[y][i]) {
            if (chessLogic.mans[map[y][i]].my!=my) d.push([i,y]);
            break
        }else{
            d.push([i,y])
        }
    }
    //上检索
    for (var i = y-1 ; i >= 0; i--){
        if (map[i][x]) {
            if (chessLogic.mans[map[i][x]].my!=my) d.push([x,i]);
            break
        }else{
            d.push([x,i])
        }
    }
    //下检索
    for (var i = y+1 ; i<= 9; i++){
        if (map[i][x]) {
            if (chessLogic.mans[map[i][x]].my!=my) d.push([x,i]);
            break
        }else{
            d.push([x,i])
        }
    }
    return d;
}

//马
chessLogic.bylaw.m = function (x, y, map, my){
    var d=[];
    //1点
    if ( y-2>= 0 && x+1<= 8 && !playLogic.map[y-1][x] &&(!chessLogic.mans[map[y-2][x+1]] || chessLogic.mans[map[y-2][x+1]].my!=my)) d.push([x+1,y-2]);
    //2点
    if ( y-1>= 0 && x+2<= 8 && !playLogic.map[y][x+1] &&(!chessLogic.mans[map[y-1][x+2]] || chessLogic.mans[map[y-1][x+2]].my!=my)) d.push([x+2,y-1]);
    //4点
    if ( y+1<= 9 && x+2<= 8 && !playLogic.map[y][x+1] &&(!chessLogic.mans[map[y+1][x+2]] || chessLogic.mans[map[y+1][x+2]].my!=my)) d.push([x+2,y+1]);
    //5点
    if ( y+2<= 9 && x+1<= 8 && !playLogic.map[y+1][x] &&(!chessLogic.mans[map[y+2][x+1]] || chessLogic.mans[map[y+2][x+1]].my!=my)) d.push([x+1,y+2]);
    //7点
    if ( y+2<= 9 && x-1>= 0 && !playLogic.map[y+1][x] &&(!chessLogic.mans[map[y+2][x-1]] || chessLogic.mans[map[y+2][x-1]].my!=my)) d.push([x-1,y+2]);
    //8点
    if ( y+1<= 9 && x-2>= 0 && !playLogic.map[y][x-1] &&(!chessLogic.mans[map[y+1][x-2]] || chessLogic.mans[map[y+1][x-2]].my!=my)) d.push([x-2,y+1]);
    //10点
    if ( y-1>= 0 && x-2>= 0 && !playLogic.map[y][x-1] &&(!chessLogic.mans[map[y-1][x-2]] || chessLogic.mans[map[y-1][x-2]].my!=my)) d.push([x-2,y-1]);
    //11点
    if ( y-2>= 0 && x-1>= 0 && !playLogic.map[y-1][x] &&(!chessLogic.mans[map[y-2][x-1]] || chessLogic.mans[map[y-2][x-1]].my!=my)) d.push([x-1,y-2]);

    return d;
}

//相
chessLogic.bylaw.x = function (x, y, map, my){
    var d=[];
    if (my===1){ //红方
        //4点半
        if ( y+2<= 9 && x+2<= 8 && !playLogic.map[y+1][x+1] && (!chessLogic.mans[map[y+2][x+2]] || chessLogic.mans[map[y+2][x+2]].my!=my)) d.push([x+2,y+2]);
        //7点半
        if ( y+2<= 9 && x-2>= 0 && !playLogic.map[y+1][x-1] && (!chessLogic.mans[map[y+2][x-2]] || chessLogic.mans[map[y+2][x-2]].my!=my)) d.push([x-2,y+2]);
        //1点半
        if ( y-2>= 5 && x+2<= 8 && !playLogic.map[y-1][x+1] && (!chessLogic.mans[map[y-2][x+2]] || chessLogic.mans[map[y-2][x+2]].my!=my)) d.push([x+2,y-2]);
        //10点半
        if ( y-2>= 5 && x-2>= 0 && !playLogic.map[y-1][x-1] && (!chessLogic.mans[map[y-2][x-2]] || chessLogic.mans[map[y-2][x-2]].my!=my)) d.push([x-2,y-2]);
    }else{
        //4点半
        if ( y+2<= 4 && x+2<= 8 && !playLogic.map[y+1][x+1] && (!chessLogic.mans[map[y+2][x+2]] || chessLogic.mans[map[y+2][x+2]].my!=my)) d.push([x+2,y+2]);
        //7点半
        if ( y+2<= 4 && x-2>= 0 && !playLogic.map[y+1][x-1] && (!chessLogic.mans[map[y+2][x-2]] || chessLogic.mans[map[y+2][x-2]].my!=my)) d.push([x-2,y+2]);
        //1点半
        if ( y-2>= 0 && x+2<= 8 && !playLogic.map[y-1][x+1] && (!chessLogic.mans[map[y-2][x+2]] || chessLogic.mans[map[y-2][x+2]].my!=my)) d.push([x+2,y-2]);
        //10点半
        if ( y-2>= 0 && x-2>= 0 && !playLogic.map[y-1][x-1] && (!chessLogic.mans[map[y-2][x-2]] || chessLogic.mans[map[y-2][x-2]].my!=my)) d.push([x-2,y-2]);
    }
    return d;
}

//士
chessLogic.bylaw.s = function (x, y, map, my){
    var d=[];
    if (my===1){ //红方
        //4点半
        if ( y+1<= 9 && x+1<= 5 && (!chessLogic.mans[map[y+1][x+1]] || chessLogic.mans[map[y+1][x+1]].my!=my)) d.push([x+1,y+1]);
        //7点半
        if ( y+1<= 9 && x-1>= 3 && (!chessLogic.mans[map[y+1][x-1]] || chessLogic.mans[map[y+1][x-1]].my!=my)) d.push([x-1,y+1]);
        //1点半
        if ( y-1>= 7 && x+1<= 5 && (!chessLogic.mans[map[y-1][x+1]] || chessLogic.mans[map[y-1][x+1]].my!=my)) d.push([x+1,y-1]);
        //10点半
        if ( y-1>= 7 && x-1>= 3 && (!chessLogic.mans[map[y-1][x-1]] || chessLogic.mans[map[y-1][x-1]].my!=my)) d.push([x-1,y-1]);
    }else{
        //4点半
        if ( y+1<= 2 && x+1<= 5 && (!chessLogic.mans[map[y+1][x+1]] || chessLogic.mans[map[y+1][x+1]].my!=my)) d.push([x+1,y+1]);
        //7点半
        if ( y+1<= 2 && x-1>= 3 && (!chessLogic.mans[map[y+1][x-1]] || chessLogic.mans[map[y+1][x-1]].my!=my)) d.push([x-1,y+1]);
        //1点半
        if ( y-1>= 0 && x+1<= 5 && (!chessLogic.mans[map[y-1][x+1]] || chessLogic.mans[map[y-1][x+1]].my!=my)) d.push([x+1,y-1]);
        //10点半
        if ( y-1>= 0 && x-1>= 3 && (!chessLogic.mans[map[y-1][x-1]] || chessLogic.mans[map[y-1][x-1]].my!=my)) d.push([x-1,y-1]);
    }
    return d;

}

//将
chessLogic.bylaw.j = function (x, y, map, my){
    var d=[];
    var isNull=(function (y1,y2){
        var y1=chessLogic.mans["j0"].y;
        var x1=chessLogic.mans["J0"].x;
        var y2=chessLogic.mans["J0"].y;
        for (var i=y1-1; i>y2; i--){
            if (map[i][x1]) return false;
        }
        return true;
    })();

    if (my===1){ //红方
        //下
        if ( y+1<= 9  && (!chessLogic.mans[map[y+1][x]] || chessLogic.mans[map[y+1][x]].my!=my)) d.push([x,y+1]);
        //上
        if ( y-1>= 7 && (!chessLogic.mans[map[y-1][x]] || chessLogic.mans[map[y-1][x]].my!=my)) d.push([x,y-1]);
        //老将对老将的情况
        if ( chessLogic.mans["j0"].x == chessLogic.mans["J0"].x &&isNull) d.push([chessLogic.mans["J0"].x,chessLogic.mans["J0"].y]);

    }else{
        //下
        if ( y+1<= 2  && (!chessLogic.mans[map[y+1][x]] || chessLogic.mans[map[y+1][x]].my!=my)) d.push([x,y+1]);
        //上
        if ( y-1>= 0 && (!chessLogic.mans[map[y-1][x]] || chessLogic.mans[map[y-1][x]].my!=my)) d.push([x,y-1]);
        //老将对老将的情况
        if ( chessLogic.mans["j0"].x == chessLogic.mans["J0"].x &&isNull) d.push([chessLogic.mans["j0"].x,chessLogic.mans["j0"].y]);
    }
    //右
    if ( x+1<= 5  && (!chessLogic.mans[map[y][x+1]] || chessLogic.mans[map[y][x+1]].my!=my)) d.push([x+1,y]);
    //左
    if ( x-1>= 3 && (!chessLogic.mans[map[y][x-1]] || chessLogic.mans[map[y][x-1]].my!=my))d.push([x-1,y]);
    return d;
}

//炮
chessLogic.bylaw.p = function (x, y, map, my){
    var d=[];
    //左侧检索
    var n=0;
    for (var i=x-1; i>= 0; i--){
        if (map[y][i]) {
            if (n==0){
                n++;
                continue;
            }else{
                if (chessLogic.mans[map[y][i]].my!=my) d.push([i,y]);
                break
            }
        }else{
            if(n==0) d.push([i,y])
        }
    }
    //右侧检索
    var n=0;
    for (var i=x+1; i <= 8; i++){
        if (map[y][i]) {
            if (n==0){
                n++;
                continue;
            }else{
                if (chessLogic.mans[map[y][i]].my!=my) d.push([i,y]);
                break
            }
        }else{
            if(n==0) d.push([i,y])
        }
    }
    //上检索
    var n=0;
    for (var i = y-1 ; i >= 0; i--){
        if (map[i][x]) {
            if (n==0){
                n++;
                continue;
            }else{
                if (chessLogic.mans[map[i][x]].my!=my) d.push([x,i]);
                break
            }
        }else{
            if(n==0) d.push([x,i])
        }
    }
    //下检索
    var n=0;
    for (var i = y+1 ; i<= 9; i++){
        if (map[i][x]) {
            if (n==0){
                n++;
                continue;
            }else{
                if (chessLogic.mans[map[i][x]].my!=my) d.push([x,i]);
                break
            }
        }else{
            if(n==0) d.push([x,i])
        }
    }
    return d;
}

//卒
chessLogic.bylaw.z = function (x, y, map, my){
    var d=[];
    if (my===1){ //红方
        //上
        if ( y-1>= 0 && (!chessLogic.mans[map[y-1][x]] || chessLogic.mans[map[y-1][x]].my!=my)) d.push([x,y-1]);
        //右
        if ( x+1<= 8 && y<=4  && (!chessLogic.mans[map[y][x+1]] || chessLogic.mans[map[y][x+1]].my!=my)) d.push([x+1,y]);
        //左
        if ( x-1>= 0 && y<=4 && (!chessLogic.mans[map[y][x-1]] || chessLogic.mans[map[y][x-1]].my!=my))d.push([x-1,y]);
    }else{
        //下
        if ( y+1<= 9  && (!chessLogic.mans[map[y+1][x]] || chessLogic.mans[map[y+1][x]].my!=my)) d.push([x,y+1]);
        //右
        if ( x+1<= 8 && y>=6  && (!chessLogic.mans[map[y][x+1]] || chessLogic.mans[map[y][x+1]].my!=my)) d.push([x+1,y]);
        //左
        if ( x-1>= 0 && y>=6 && (!chessLogic.mans[map[y][x-1]] || chessLogic.mans[map[y][x-1]].my!=my))d.push([x-1,y]);
    }

    return d;
}

chessLogic.value = {

    //车价值
    c:[
        [206, 208, 207, 213, 214, 213, 207, 208, 206],
        [206, 212, 209, 216, 233, 216, 209, 212, 206],
        [206, 208, 207, 214, 216, 214, 207, 208, 206],
        [206, 213, 213, 216, 216, 216, 213, 213, 206],
        [208, 211, 211, 214, 215, 214, 211, 211, 208],

        [208, 212, 212, 214, 215, 214, 212, 212, 208],
        [204, 209, 204, 212, 214, 212, 204, 209, 204],
        [198, 208, 204, 212, 212, 212, 204, 208, 198],
        [200, 208, 206, 212, 200, 212, 206, 208, 200],
        [194, 206, 204, 212, 200, 212, 204, 206, 194]
    ],

    //马价值
    m:[
        [90, 90, 90, 96, 90, 96, 90, 90, 90],
        [90, 96,103, 97, 94, 97,103, 96, 90],
        [92, 98, 99,103, 99,103, 99, 98, 92],
        [93,108,100,107,100,107,100,108, 93],
        [90,100, 99,103,104,103, 99,100, 90],

        [90, 98,101,102,103,102,101, 98, 90],
        [92, 94, 98, 95, 98, 95, 98, 94, 92],
        [93, 92, 94, 95, 92, 95, 94, 92, 93],
        [85, 90, 92, 93, 78, 93, 92, 90, 85],
        [88, 85, 90, 88, 90, 88, 90, 85, 88]
    ],

    //相价值
    x:[
        [0, 0,20, 0, 0, 0,20, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0,23, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0,20, 0, 0, 0,20, 0, 0],

        [0, 0,20, 0, 0, 0,20, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [18,0, 0, 0,23, 0, 0, 0,18],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0,20, 0, 0, 0,20, 0, 0]
    ],

    //士价值
    s:[
        [0, 0, 0,20, 0,20, 0, 0, 0],
        [0, 0, 0, 0,23, 0, 0, 0, 0],
        [0, 0, 0,20, 0,20, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],

        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0,20, 0,20, 0, 0, 0],
        [0, 0, 0, 0,23, 0, 0, 0, 0],
        [0, 0, 0,20, 0,20, 0, 0, 0]
    ],

    //奖价值
    j:[
        [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
        [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
        [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],

        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
        [0, 0, 0, 8888, 8888, 8888, 0, 0, 0],
        [0, 0, 0, 8888, 8888, 8888, 0, 0, 0]
    ],

    //炮价值
    p:[

        [100, 100,  96, 91,  90, 91,  96, 100, 100],
        [ 98,  98,  96, 92,  89, 92,  96,  98,  98],
        [ 97,  97,  96, 91,  92, 91,  96,  97,  97],
        [ 96,  99,  99, 98, 100, 98,  99,  99,  96],
        [ 96,  96,  96, 96, 100, 96,  96,  96,  96],

        [ 95,  96,  99, 96, 100, 96,  99,  96,  95],
        [ 96,  96,  96, 96,  96, 96,  96,  96,  96],
        [ 97,  96, 100, 99, 101, 99, 100,  96,  97],
        [ 96,  97,  98, 98,  98, 98,  98,  97,  96],
        [ 96,  96,  97, 99,  99, 99,  97,  96,  96]
    ],

    //卒价值
    z:[
        [ 9,  9,  9, 11, 13, 11,  9,  9,  9],
        [19, 24, 34, 42, 44, 42, 34, 24, 19],
        [19, 24, 32, 37, 37, 37, 32, 24, 19],
        [19, 23, 27, 29, 30, 29, 27, 23, 19],
        [14, 18, 20, 27, 29, 27, 20, 18, 14],

        [ 7,  0, 13,  0, 16,  0, 13,  0,  7],
        [ 7,  0,  7,  0, 15,  0,  7,  0,  7],
        [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
        [ 0,  0,  0,  0,  0,  0,  0,  0,  0],
        [ 0,  0,  0,  0,  0,  0,  0,  0,  0]
    ]
}

//黑子为红字价值位置的倒置
chessLogic.value.C = chessLogic.arr2Clone(chessLogic.value.c).reverse();
chessLogic.value.M = chessLogic.arr2Clone(chessLogic.value.m).reverse();
chessLogic.value.X = chessLogic.value.x;
chessLogic.value.S = chessLogic.value.s;
chessLogic.value.J = chessLogic.value.j;
chessLogic.value.P = chessLogic.arr2Clone(chessLogic.value.p).reverse();
chessLogic.value.Z = chessLogic.arr2Clone(chessLogic.value.z).reverse();

//棋子们
chessLogic.args={
    //红子 中文/图片地址/阵营/权重
    'c':{text:"车", img:'r_c', my:1 ,bl:"c", value:chessLogic.value.c},
    'm':{text:"马", img:'r_m', my:1 ,bl:"m", value:chessLogic.value.m},
    'x':{text:"相", img:'r_x', my:1 ,bl:"x", value:chessLogic.value.x},
    's':{text:"仕", img:'r_s', my:1 ,bl:"s", value:chessLogic.value.s},
    'j':{text:"将", img:'r_j', my:1 ,bl:"j", value:chessLogic.value.j},
    'p':{text:"炮", img:'r_p', my:1 ,bl:"p", value:chessLogic.value.p},
    'z':{text:"兵", img:'r_z', my:1 ,bl:"z", value:chessLogic.value.z},

    //蓝子
    'C':{text:"车", img:'b_c', my:-1 ,bl:"c", value:chessLogic.value.C},
    'M':{text:"马", img:'b_m', my:-1 ,bl:"m", value:chessLogic.value.M},
    'X':{text:"象", img:'b_x', my:-1 ,bl:"x", value:chessLogic.value.X},
    'S':{text:"士", img:'b_s', my:-1 ,bl:"s", value:chessLogic.value.S},
    'J':{text:"帅", img:'b_j', my:-1 ,bl:"j", value:chessLogic.value.J},
    'P':{text:"炮", img:'b_p', my:-1 ,bl:"p", value:chessLogic.value.P},
    'Z':{text:"卒", img:'b_z', my:-1 ,bl:"z", value:chessLogic.value.Z}
};

chessLogic.class = chessLogic.class || {} //类
chessLogic.class.Man = function (key, x, y){
    this.pater = key.slice(0,1);
    var o=chessLogic.args[this.pater]
    this.x = x||0;
    this.y = y||0;
    this.originX = x||0;
    this.originY = y||0;
    this.key = key ;
    this.my = o.my;
    this.text = o.text;
    this.value = o.value;
    this.isShow = true;
    this.alpha = 1;
    this.ps = []; //着

    this.show = function (){
        if (this.isShow) {
            if(!this.node){
                this.node = cc.instantiate(cc.find('Canvas//ChessBoard/'+chessLogic.args[this.pater].img))
                this.node.parent = cc.find('Canvas/ChessBoard')
            }
            this.node.active = true;
            this.node.position = cc.v2(chessLogic.spaceX * this.x + chessLogic.pointStartX ,  520-chessLogic.spaceY * this.y +chessLogic.pointStartY)
        }else{
            if(this.node){
                this.node.active = false;
            }
        }
    }

    this.bl = function (map){
        var map = map || playLogic.map
        return chessLogic.bylaw[o.bl](this.x,this.y,map,this.my)
    }
}

chessLogic.class.Pane = function (img, x, y){
    this.x = x||0;
    this.y = y||0;
    this.newX = x||0;
    this.newY = y||0;
    this.isShow = true;

    this.show = function (){
        if (this.isShow) {
            if(!this.node1){
                this.node1 = cc.instantiate(cc.find('Canvas/ChessBoard/r_box'))
                this.node1.parent = cc.find('Canvas/ChessBoard')
            }
            this.node1.active = true;
            this.node1.position = cc.v2(chessLogic.spaceX * this.x + chessLogic.pointStartX , 520-chessLogic.spaceY *  this.y +chessLogic.pointStartY)

            if(!this.node2){
                this.node2 = cc.instantiate(cc.find('Canvas/ChessBoard/select_icon'))
                this.node2.parent = cc.find('Canvas/ChessBoard')
            }
            this.node2.active = true;
            this.node2.position = cc.v2(chessLogic.spaceX * this.newX + chessLogic.pointStartX , 520-chessLogic.spaceY *  this.newY +chessLogic.pointStartY)
        }else{
            if(this.node1){
                this.node1.active = false;
            }
            if(this.node2){
                this.node2.active = false;
            }
        }
    }
}

chessLogic.class.Dot = function (img, x, y){
    this.x = x||0;
    this.y = y||0;
    this.isShow = true;
    this.dots=[]
    this.node_list = [];

    this.show = function (){
        for (let i = 0; i < this.node_list.length; i++) {
            this.node_list[i].active = false;
        }
        if(this.isShow){
            for (var i=0; i<this.dots.length;i++){
                if(!this.node_list[i]){
                    this.node_list[i] = cc.instantiate(cc.find('Canvas/ChessBoard/dot'))
                    this.node_list[i].parent = cc.find('Canvas/ChessBoard')
                }
                this.node_list[i].active = true;
                this.node_list[i].position = cc.v2(chessLogic.spaceX * this.dots[i][0]  + chessLogic.pointStartX ,520-chessLogic.spaceY *  this.dots[i][1] + chessLogic.pointStartY);
            }
        }
    }
}


chessLogic.reset = function(){
    chessLogic.dot.isShow = false;
    for (const i in chessLogic.mans) {
        chessLogic.mans[i].x = chessLogic.mans[i].originX;
        chessLogic.mans[i].y = chessLogic.mans[i].originY;
        chessLogic.mans[i].isShow = true;
    }
    chessLogic.pane.isShow = false;
    this.show()
}

export default chessLogic