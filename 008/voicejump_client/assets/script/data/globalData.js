
import gameMgr from "./gameMgr.js"
import socketMgr from "./socketMgr.js"
import eventlister from "./event_lister.js"

require('./audioMgr')

const globalData = {} || globalData;
globalData.gameMgr = gameMgr()
globalData.eventlister = eventlister({})
globalData.socketMgr = socketMgr()
globalData.socketMgr.setGameMgr(globalData.gameMgr)
globalData.socketMgr.setEventlister(globalData.eventlister)
globalData.gameMgr.setSocketMgr(globalData.socketMgr)
globalData.gameMgr.setEventlister(globalData.eventlister)

export default globalData
