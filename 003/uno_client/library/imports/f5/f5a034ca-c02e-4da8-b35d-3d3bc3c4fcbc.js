"use strict";
cc._RF.push(module, 'f5a03TKwC5NqLNdPTvDxPy8', 'audioMgr');
// scripts/data/audioMgr.js

"use strict";

/**
 * [playEffect description]
 * @param  {[type]} filename [url]
 * @param  {[type]} boolean  [是否循环 true or false]
 * @param  {[type]} val      [音量]
 * @return {[type]}          [description]
 */
cc.playEffect = function (url, _boolean, val) {
  cc.loader.loadRes(url, cc.AudioClip, function (err, clip) {
    cc.audioEngine.playEffect(clip, _boolean);
  });
},
/**
 * [playMusic description]
 * @param  {[type]} filename [url]
 * @param  {[type]} boolean  [是否循环 true or false]
 * @param  {[type]} val      [音量]
 * @return {[type]}          [description]
 */
cc.playMusic = function (url, _boolean2, val) {
  cc.loader.loadRes(url, cc.AudioClip, function (err, clip) {
    cc.audioEngine.playMusic(clip, _boolean2);
  });
};

cc._RF.pop();