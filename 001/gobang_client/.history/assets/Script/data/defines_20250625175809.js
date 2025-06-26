const defines = {};

var host = window.location.host;
//本地调试
// if(host.indexOf('localhost')!=-1){
//     defines.isDebug = true;
// }

// if(defines.isDebug){
//     defines.serverUrl = "localhost:9001";
// }else{
//     defines.serverUrl = window.location.hostname;
// }

defines.isDebug = false;
//云村域名
if(defines.isDebug){
    defines.yc_domain = "https://www.fsyctech.com";
    defines.serverUrl = "https://www.fsyctech.com"
}else{
    defines.yc_domain = "https://www.fsyctech.com";
    defines.serverUrl = "https://www.fsyctech.com";
}

window.defines = defines;
