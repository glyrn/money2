
import gameMgr from "./gameMgr.js"
import socketMgr from "./socketMgr.js"
import eventlister from "./event_lister.js"
import utils from "./utils.js"

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


export default globalData
