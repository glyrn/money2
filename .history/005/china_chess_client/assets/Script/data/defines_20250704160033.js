const defines = {};

var host = window.location.host;
//本地调试
if(host.indexOf('localhost')!=-1){
    defines.isDebug = true;
}


if(defines.isDebug){
    defines.serverUrl = "localhost:9005";
}else{
    defines.serverUrl = window.location.hostname;
}

//云村域名
defines.yc_domain = "https://www.fsyctech.com";

//------------------------------------------
var url = decodeURI(window.location.href);
if(url.split('?').length > 1){
    var params = url.split('?')[1].split('&');
    var field = {};
    for (const paramsKey in params) {
        var obj = params[paramsKey].split('=');
        field[obj[0]] = obj[1];
    }
    cc.args = field;
    //正式环境调试
     defines.isDebug = false;
    // defines.isForce = true;
    cc.args['gamedomain'] = "www.fsyctech.com";
    // cc.args['ycdomain'] = "www.fsyctech.com";
    // cc.args['gamedomain'] = "www.woojey.com";
    cc.args['ycdomain'] = "www.woojey.com";

    console.log("test2")
    if(cc.args['gamedomain']){
        defines.serverUrl = cc.args['gamedomain'];
    }
    if(cc.args['ycdomain']){
        defines.yc_domain = "https://"+cc.args['ycdomain'];
    }
}

window.defines = defines;
