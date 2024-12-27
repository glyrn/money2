
import gameMgr from "./data/gameMgr.js"
import socketMgr from "./data/socketMgr.js"
import eventlister from "./util/event_lister.js"
import validateMgr from "./util/validator";
import utils from "./data/utils.js"
require('./data/audioMgr')

const globalData = {} || globalData;
globalData.utils = utils();
globalData.gameMgr = gameMgr()
globalData.eventlister = eventlister({})
globalData.socketMgr = socketMgr()
globalData.validateMgr = validateMgr()
globalData.socketMgr.setGameMgr(globalData.gameMgr)
globalData.socketMgr.setEventlister(globalData.eventlister)
globalData.gameMgr.setSocketMgr(globalData.socketMgr)
globalData.gameMgr.setEventlister(globalData.eventlister)
globalData.gameMgr.setValidateMgr(globalData.validateMgr)

export default globalData
