
import gameMgr from "./data/gameMgr.js"
import socketMgr from "./data/socketMgr.js"
import eventlister from "./util/event_lister.js"
import utils from "./data/utils";
require('./data/audioMgr')

const globalData = {} || globalData;
globalData.utils = utils();
globalData.gameMgr = gameMgr()
globalData.eventlister = eventlister({})
globalData.socketMgr = socketMgr()
globalData.socketMgr.setGameMgr(globalData.gameMgr)
globalData.socketMgr.setEventlister(globalData.eventlister)
globalData.gameMgr.setSocketMgr(globalData.socketMgr)
globalData.gameMgr.setEventlister(globalData.eventlister)

export default globalData
