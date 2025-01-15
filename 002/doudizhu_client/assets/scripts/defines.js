const defines = {};

var host = window.location.host;
//本地调试
if(host.indexOf('localhost')!=-1){
    defines.isDebug = true;
}

if(defines.isDebug){
    defines.serverUrl = "localhost:9002";
}else{
    defines.serverUrl = "www.fsyctech.com";
}

window.defines = defines;