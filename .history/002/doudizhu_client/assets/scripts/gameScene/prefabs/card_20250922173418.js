import globalData from "../../globalData.js";

let card_map = {
    '14-0':'27',
    '14-1':'1',
    '14-2':'40',
    '14-3':'14',
    '15-0':'28',
    '15-1':'2',
    '15-2':'41',
    '15-3':'15',
    '3-0':'29',
    '3-1':'3',
    '3-2':'42',
    '3-3':'16',
    '4-0':'30',
    '4-1':'4',
    '4-2':'43',
    '4-3':'17',
    '5-0':'31',
    '5-1':'5',
    '5-2':'44',
    '5-3':'18',
    '6-0':'32',
    '6-1':'6',
    '6-2':'45',
    '6-3':'19',
    '7-0':'33',
    '7-1':'7',
    '7-2':'46',
    '7-3':'20',
    '8-0':'34',
    '8-1':'8',
    '8-2':'47',
    '8-3':'21',
    '9-0':'35',
    '9-1':'9',
    '9-2':'48',
    '9-3':'22',
    '10-0':'36',
    '10-1':'10',
    '10-2':'49',
    '10-3':'23',
    '11-0':'37',
    '11-1':'11',
    '11-2':'50',
    '11-3':'24',
    '12-0':'38',
    '12-1':'12',
    '12-2':'51',
    '12-3':'25',
    '13-0':'39',
    '13-1':'13',
    '13-2':'52',
    '13-3':'26',
    '16-0':'54',
    '17-0':'53',
    '0-0':'55',
}

cc.Class({
    extends: cc.Component,
    name:'Card',
    properties: {
        cards_sprite_atlas: cc.SpriteAtlas,
        // laizi_flag:cc.Node,

        spSelected: cc.Node,
        touched: {
            default: false,
            notify(){
                this.spSelected.active = this.touched;
            }
        },
        selected: {
            default: false,
            notify(){
                if(this.card) {
                    this.card.selected = this.selected;
                    this.node.position = this.card.selected ? cc.v2(this.base_pos.x, this.base_pos.y + 40) : this.base_pos;
                    if (this.card.selected) {
                        cc.playEffect("sound/select_card", false, 1);
                    }
                }
            }
        },
    },
    start () {

    },
    renderSelectCard(){

        this.node.position =  this.card.selected ? cc.v2(this.base_pos.x,this.base_pos.y+40) : this.base_pos;
        if(this.card.selected){
            cc.playEffect("sound/select_card",false,1);
        }
    },

    render(flag,card,isPass){
        if(this.cards_sprite_atlas == null) return;

        this.flag = flag;
        this.card = card;
        this.base_pos = this.node.position;

        this.node.getComponent(cc.Sprite).spriteFrame = this.cards_sprite_atlas.getSpriteFrame('card_'+card_map[card.value+'-'+card.type])
        // this.laizi_flag.active = false;

        let laiziCards = globalData.gameMgr.posState.laizi.cards;
        for(var laizi_card_key in laiziCards){
            var laizi_card = laiziCards[laizi_card_key];
            if(laizi_card.value == card.value){

                this.node.getComponent(cc.Sprite).spriteFrame = this.cards_sprite_atlas.getSpriteFrame('laizi_'+card_map[card.value+'-'+card.type])
                // this.laizi_flag.active = true;
            }
        }

        if(this.flag == 'self' && isPass){
            this.card.selected = false;
        }

        if(this.flag != 'top' && this.flag != 'laizi'){
            this.renderSelectCard()
        }
    }
});


