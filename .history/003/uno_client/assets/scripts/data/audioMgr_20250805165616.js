/**
 * [playEffect description]
 * @param  {[type]} filename [url]
 * @param  {[type]} boolean  [是否循环 true or false]
 * @param  {[type]} val      [音量]
 * @return {[type]}          [description]
 */
cc.playEffect=function(url,boolean,val){
    cc.loader.loadRes(url,cc.AudioClip,function (err,clip){
        cc.audioEngine.playEffect(clip,boolean);
    });
},
/**
 * [playMusic description]
 * @param  {[type]} filename [url]
 * @param  {[type]} boolean  [是否循环 true or false]
 * @param  {[type]} val      [音量]
 * @return {[type]}          [description]
 */
cc.playMusic=function(url,boolean,val){
    cc.loader.loadRes(url,cc.AudioClip,function (err,clip){
        cc.bg_music_id = cc.audioEngine.play(clip,boolean,1);
    });
}