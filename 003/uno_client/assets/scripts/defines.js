const defines = {};

var host = window.location.host;
//本地调试
if(host.indexOf('localhost')!=-1){
    defines.isDebug = true;
}

if(defines.isDebug){
    defines.serverUrl = "localhost:9003";
}else{
    defines.serverUrl = "42.194.141.209";
}

window.defines = defines;
