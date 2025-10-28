import globalData from "../Script/data/globalData.js"
cc.Class({
    name: "Map",
    extends: cc.Component,
    properties: {
        all_places:[cc.Node],
        straight0_places:[cc.Node],
        straight1_places:[cc.Node],
        straight2_places:[cc.Node],
        straight3_places:[cc.Node],
        pos0_places:[cc.Node],
        pos1_places:[cc.Node],
        pos2_places:[cc.Node],
        pos3_places:[cc.Node],
    },
    onLoad(){

        var map = cc.find('Canvas/map');
        var id = 0;
        for (let i = 0; i < map.children.length; i++) {
            id++;
            var name = map.children[i].name;
            var child = map.children[i].getComponent('Place')
            if(name == '1'){
                child.id = id;
                this.all_places.push(map.children[i]);
            }
            if(name == '2'){
                if(child.color == 0){
                    this.straight0_places.push(map.children[i])
                }
                if(child.color == 1){
                    this.straight1_places.push(map.children[i])
                }
                if(child.color == 2){
                    this.straight2_places.push(map.children[i])
                }
                if(child.color == 3){
                    this.straight3_places.push(map.children[i])
                }
            }
        }

        var len = this.all_places.length - 2;
        for (let i = 0; i < len; i++) {
            //黄色
            var offset = 0;
            var idx = offset + i;
            if(idx > this.all_places.length -1){
                idx -= this.all_places.length;
            }
            this.pos0_places.push(this.all_places[idx]);

            // 蓝色
            var offset = 13;
            var idx = offset + i;
            if(idx > this.all_places.length -1){
                idx -= this.all_places.length;
            }
            this.pos1_places.push(this.all_places[idx]);

            // 绿色
            var offset = 26;
            var idx = offset + i;
            if(idx > this.all_places.length -1){
                idx -= this.all_places.length;
            }
            this.pos2_places.push(this.all_places[idx]);

            // 红色
            var offset = 39;
            var idx = offset + i;
            if(idx > this.all_places.length -1){
                idx -= this.all_places.length;
            }
            this.pos3_places.push(this.all_places[idx]);

        }

        for (let i = 0; i < this.straight0_places.length; i++) {
            this.pos0_places.push(this.straight0_places[i])
        }
        for (let i = 0; i < this.straight1_places.length; i++) {
            this.pos1_places.push(this.straight1_places[i])
        }
        for (let i = 0; i < this.straight2_places.length; i++) {
            this.pos2_places.push(this.straight2_places[i])
        }
        for (let i = 0; i < this.straight3_places.length; i++) {
            this.pos3_places.push(this.straight3_places[i])
        }

        this.chessPlace = {
            0:{0:0,1:0,2:0,3:0},
            1:{0:0,1:0,2:0,3:0},
            2:{0:0,1:0,2:0,3:0},
            3:{0:0,1:0,2:0,3:0},
        }
    },
    makeBomb(bomb_idxs)
    {
        for (const idx in bomb_idxs) {
            if(this.all_places[idx]){
                this.all_places[idx].getComponent('Place').makeBomb();
            }
        }
    },
    reset(){
        for (const k in this.all_places) {
            if(this.all_places[k]) {
                this.all_places[k].getComponent('Place').reset();
            }
        }
    },
    getPosPlaces(pos){
        return this['pos'+pos+'_places'];
    },

    setChessPlace(posId,chess_idx,chess_id){
        this.chessPlace[posId][chess_idx] = chess_id;
    },

    getChessPlaceInfo(posId,chess_id){
        var rets = [];
        for (let i = 0; i < 4; i++) {
            if (i != posId) {
                var playerNode = cc.find("Canvas/player" + (i + 1)).getComponent("PlayerNode")
                for (let j = 0; j < 4; j++) {
                    if(chess_id == playerNode.getChessNowPlaceId(j)){
                        rets.push({posId:i,chess_idx:j,chess_id:chess_id});
                    }
                }
            }
        }
        return rets;
    },

    checkEat(posId,check_chess_id){
        console.log("checkEat",posId,check_chess_id)
        var infos = this.getChessPlaceInfo(posId,check_chess_id);
        for (const k in infos) {
            var info = infos[k];
            if(info && info.posId != posId){ //可以吃
                console.log(info)
                globalData.eventlister.fire("BACK_HOME",{posId:info.posId,chess_idx:info.chess_idx})
            }
        }

    },

    checkFlyHit(posId){
        console.log("checkFlyHit",posId);
        var playerNode;
        if(posId == 0){ //黄色
            playerNode = cc.find("Canvas/player3").getComponent("PlayerNode");
        }else if(posId == 1){ //蓝色
            playerNode = cc.find("Canvas/player4").getComponent("PlayerNode");
        }else if(posId == 2){ //绿色
            playerNode = cc.find("Canvas/player1").getComponent("PlayerNode");
        }else if(posId == 3){ //红色
            playerNode = cc.find("Canvas/player2").getComponent("PlayerNode");
        }
        var chress_idxs = playerNode.getMidStraightChress();
        for (const k in chress_idxs) {
            if(chress_idxs[k] >= 0){
                playerNode.backHome(chress_idxs[k]);
            }
        }

    }
})