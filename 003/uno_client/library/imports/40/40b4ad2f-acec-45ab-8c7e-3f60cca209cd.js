"use strict";
cc._RF.push(module, '40b4a0vrOxFq4x+P2DMognN', 'defines');
// scripts/defines.js

"use strict";

var defines = {};
var host = window.location.host; //本地调试

if (host.indexOf('localhost') != -1) {
  defines.isDebug = true;
}

if (defines.isDebug) {
  defines.serverUrl = "localhost:9003";
} else {
  // defines.serverUrl = "www.fsyctech.com";
  defines.serverUrl = "www.g-xinyi1313.cn";
} //云村域名


defines.yc_domain = "https://www.fsyctech.com";
window.defines = defines;

cc._RF.pop();