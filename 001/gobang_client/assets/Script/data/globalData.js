
import gameMgr from "./gameMgr"
import socketMgr from "./socketMgr"
import eventlister from "./event_lister"
import utils from "./utils"

require('./audioMgr')

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
