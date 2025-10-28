var arrs = [
  { type: 1, value: 5, color: 2 },
  { type: 1, value: 2, color: 3 },
  { type: 1, value: 7, color: 1 },
  { type: 2, value: 'plus4', color: 0 },
  { type: 1, value: 2, color: 2 }
];
var obj = { type: 2, value: 'color', color: 2 };
var new_cards = [];
var has_skip = false;
for (let i = 0; i < arrs.length; i++) {
  var _card = arrs[i];
    if(_card.value == "color" && obj.value == 'color' && !has_skip){
        console.log("跳过",_card);
        has_skip = true;
    }
    if(_card.value == "plus4" && obj.value == 'plus4' && !has_skip){
        console.log("跳过",_card);
        has_skip = true;
    }
  if(((_card.value == obj.value && _card.type == obj.type && _card.color == obj.color)) && !has_skip )
  {
    console.log("跳过",_card);
    has_skip = true;
  }else{
    new_cards.push(_card);
  }
}

console.log(new_cards);