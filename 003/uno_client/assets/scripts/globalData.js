
import gameMgr from "./data/gameMgr"
import socketMgr from "./data/socketMgr"
import utils from "./data/utils"
import eventlister from "./util/event_lister"
require('./data/audioMgr')

const globalData = {} || globalData;
globalData.utils = utils();
globalData.gameMgr = gameMgr()
globalData.eventlister = eventlister({})
globalData.socketMgr = socketMgr()
globalData.socketMgr.setGameMgr(globalData.gameMgr)
globalData.socketMgr.setEventlister(globalData.eventlister)
globalData.socketMgr.setUtils(globalData.utils)
globalData.gameMgr.setSocketMgr(globalData.socketMgr)
globalData.gameMgr.setEventlister(globalData.eventlister)
cc.globalData = globalData;

export default globalData
