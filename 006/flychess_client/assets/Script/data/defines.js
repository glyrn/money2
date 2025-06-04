const defines = {};

var host = window.location.host;
//本地调试
if(host.indexOf('localhost')!=-1){
    defines.isDebug = true;
}

if(defines.isDebug){
    defines.serverUrl = "localhost:9006";
}else{
    defines.serverUrl = window.location.hostname;
}
//云村域名
defines.yc_domain = "https://www.fsyctech.com";

window.defines = defines;
