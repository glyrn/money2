

cc.Class({
    extends: cc.Component,

    properties: {
        img_loading:cc.Node,
        lab_tips:cc.Label,
        img_test:cc.Node,
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

    voiceSuccess(stream){

        var that = this;

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
            that.img_test.position = cc.v2(0, rms * 2);
            
            requestAnimationFrame(updateVolume);
        }

        function getRMS(dataArray) {
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] ** 2;
            }
            const avg = sum / dataArray.length;
            return Math.sqrt(avg);
        }
        
        updateVolume();
    },
    voiceFail(error){
        console.error('获取麦克风音量时出错:', error);
    },
    start(){

        var constrains = {audio: true};

        var that = this;
        // if (navigator.mediaDevices.getUserMedia) {
        //     console.log("最新标准API");
            navigator.mediaDevices.getUserMedia(constrains).then(stream => { this.voiceSuccess(stream); }).catch(err => { this.voiceFail(err); });
        // } else if (navigator.getUserMedia) {
        //     console.log("旧版API");
            // navigator.getUserMedia(constrains, function(stream){
            //     that.voiceSuccess(stream)
            // }, this.voiceFail);
        // }


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
