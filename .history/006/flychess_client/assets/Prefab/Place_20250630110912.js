
cc.Class({
    name:"Place",
    extends: cc.Component,
    properties: {
        id:0,
        color: {
                type: cc.Enum({
                    yellow: 0,
                    blue: 1,
                    red: 2,
                    green: 3,
                }),
                default:0,
            },
        type:{
            type: cc.Enum({
                normal: 0,
                normal_not_jump:7,
                bomb: 1,
                jump: 2,
                straight: 3,
                home:4,
                gate:5,
                win:6,

            }),
            default:0,
        },
        angle:{
            type: cc.Enum({
                top: 0,
                right: 90,
                left: -90,
                down: 180,
            }),
            default:0,
        },

        bomb:cc.Animation,
    },

    makeBomb(){
        if(this.type == 0) {
            this.type = 1;
            var that = this;
            cc.loader.loadRes('bomb', cc.Prefab, function (error, prefab) {
                var bomb = cc.instantiate(prefab);
                bomb.parent = that.node;
                bomb.position = cc.v2(10, 2);
                that.bomb = bomb.getComponent(cc.Animation);
            });
        }
    },
    reset(){
        if(this.bomb){
            this.bomb.node.destroy()
            this.bomb = null;

            this.type = 0;
        }

        this.node.removeAllChildren()
    }
})