
import gameMgr from "./data/gameMgr"
import socketMgr from "./data/socketMgr"
import eventlister from "./util/event_lister"
import utils from "./data/utils"
require('./data/audioMgr')

const globalData = {} || globalData;
globalData.utils = utils();
globalData.gameMgr = gameMgr()
globalData.eventlister = eventlister({})
globalData.socketMgr = socketMgr()
globalData.socketMgr.setGameMgr(globalData.gameMgr)
globalData.socketMgr.setEventlister(globalData.eventlister)
globalData.socketMgr.setUtil(globalData.utils);
globalData.gameMgr.setSocketMgr(globalData.socketMgr)
globalData.gameMgr.setEventlister(globalData.eventlister)
cc.globalData = globalData;

export default globalData
