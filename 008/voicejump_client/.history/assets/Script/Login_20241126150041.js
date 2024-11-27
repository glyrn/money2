import globalData from "./data/globalData.js"

cc.Class({
    extends: cc.Component,

    properties: {
        img_loading:cc.Node,
        lab_tips:cc.Label
    },

    onLoad () {
        this.lab_tips.node.active = false;
        cc.debug.setDisplayStats(false);
        // globalData.socketMgr.initSocket();
    },
    update(){
        this.img_loading.angle = this.img_loading.angle + 10;
    },

    showTips(msg){
        console.log(msg);
        this.lab_tips.node.active = true;
        this.lab_tips.string = msg;
        this.scheduleOnce(function () {
            this.lab_tips.node.active = false;
        }, 2);
    },

    start(){

        navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            function updateVolume() {
            analyser.getByteFrequencyData(dataArray);
            const rms = getRMS(dataArray);
            
            // 在此处使用rms作为麦克风音量
            console.log(rms);
            
            requestAnimationFrame(updateVolume);
            }
            
            updateVolume();
        })
        .catch(error => {
            console.error('获取麦克风音量时出错:', error);
        });
        
        function getRMS(dataArray) {
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] ** 2;
        }
        const avg = sum / dataArray.length;
        return Math.sqrt(avg);
        }


        // var url = decodeURI(window.location.href);
        // if(url.split('?').length > 1){
        //     var params = url.split('?')[1].split('&');
        //     var field = {};
        //     for (const paramsKey in params) {
        //         var obj = params[paramsKey].split('=');
        //         field[obj[0]] = obj[1];
        //     }
        //     cc.args = field;

        //     globalData.socketMgr.login(cc.args['uid'],cc.args['name'],cc.args['avatorUrl'],cc.args['score'] ,cc.args['room'],
        //         cc.args['play_mode'],cc.args['play_count'],function(){
        //         cc.director.loadScene("Game");
        //     });
        // }
    },

});
