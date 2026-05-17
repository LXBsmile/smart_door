const util = require('../../utils/util')
const app = getApp()
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')

const TEXT = {
  courtLoadFailed: '加载小区信息失败',
  noNetworkTitle: '无网络',
  noNetworkContent: '无网络，请连接网络后再试',
  tip: '提示',
  unlockSuccess: '开门成功',
  unlockFailed: '开门失败',
  keyLoadFailed: '加载钥匙列表失败',
  liftExecuteSuccess: '梯控下发成功',
  liftExecuteFailed: '梯控下发失败'
}

const OPEN_DOOR_UNLOCK_DELAY = 1000

Page({
  data: {
    courts: [],
    thisCourtName: '',
    allkeys: [],
    keys: [],
    thisCourtID: '',
    index: '0',
    filterType: 'all',
    keyword: '',
    isManager: false,
    openingDoor: false
  },
  ensureFeatureLogin: function () {
    if (app.globalData.isRegisted && util.isRegisteredUser(app.globalData.userInfo)) {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    this.setData({
      courts: [],
      thisCourtName: '',
      allkeys: [],
      keys: [],
      thisCourtID: '',
      index: '0',
      isManager: false
    })
    util.scheduleFeatureLoginPrompt(this)
    return false
  },
  onShow: function () {
    this.openDoorPageUnloaded = false
    if (!this.ensureFeatureLogin()) {
      return
    }
    var that = this
    util.ensureCourtState(function (stored) {
      if (!stored.currentCourt) {
        util.noticeArea('index')
        return
      }
      that.setData({
        courts: stored.groups,
        thisCourtName: stored.currentCourt.GroupName,
        thisCourtID: stored.currentCourt.f_id,
        index: stored.index
      })
      that.refreshManagerState(stored.currentCourt.f_id)
      that.getKeyList()
    })
  },
  onPullDownRefresh: function () {
    if (!this.ensureFeatureLogin()) {
      wx.stopPullDownRefresh()
      return
    }
    this.getKeyList()
  },
  onHide: function () {
    util.clearFeatureLoginPrompt(this)
  },
  onUnload: function () {
    this.openDoorPageUnloaded = true
    util.clearFeatureLoginPrompt(this)
    this.clearOpenDoorUnlockTimer()
  },
  clearOpenDoorUnlockTimer: function () {
    if (this.openDoorUnlockTimer) {
      clearTimeout(this.openDoorUnlockTimer)
      this.openDoorUnlockTimer = null
    }
  },
  lockOpenDoor: function () {
    if (this.openDoorLocked) return false
    this.clearOpenDoorUnlockTimer()
    this.openDoorLocked = true
    this.setData({
      openingDoor: true
    })
    return true
  },
  releaseOpenDoorAfterDelay: function () {
    const that = this
    this.clearOpenDoorUnlockTimer()
    if (this.openDoorPageUnloaded) {
      this.openDoorLocked = false
      return
    }
    this.openDoorUnlockTimer = setTimeout(function () {
      that.openDoorLocked = false
      that.openDoorUnlockTimer = null
      if (that.openDoorPageUnloaded) return
      that.setData({
        openingDoor: false
      })
    }, OPEN_DOOR_UNLOCK_DELAY)
  },
  showListLoading: function () {
    wx.showLoading({
      title: '加载中',
      mask: true
    })
  },
  hideListLoading: function () {
    wx.hideLoading()
  },
  getManagerState: function (courtId) {
    const backendInfo = appService.getBackEndUserInfo(courtId)
    return appService.isBackendEnabled(backendInfo?.f_IsAdmin)
  },
  refreshManagerState: function (courtId) {
    var that = this
    that.setData({
      isManager: that.getManagerState(courtId)
    })
    util.refreshBackEndUserInfo(function (res) {
      if (String(that.data.thisCourtID || '') !== String(courtId || '')) return
      if (!res || res.Status !== 'success') return
      that.setData({
        isManager: that.getManagerState(courtId)
      })
    }, {
      courtId: courtId,
      force: true
    })
  },
  selectcourt: function (e) {
    var index = e.detail.value
    var that = this
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id,
      index: index
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(that.data.courts[index], Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = that.data.courts[index]
    }
    that.refreshManagerState(that.data.thisCourtID)
    that.getKeyList()
  },
  showNoNetwork: function () {
    wx.showModal({
      title: TEXT.noNetworkTitle,
      content: TEXT.noNetworkContent,
      showCancel: false
    })
  },
  getLiftAllFloors: function (item) {
    const rawFloors = item && item.floorInfo && item.floorInfo.raw && Array.isArray(item.floorInfo.raw.Floors)
      ? item.floorInfo.raw.Floors
      : (item && item.floorInfo && Array.isArray(item.floorInfo.floors) ? item.floorInfo.floors : [])
    return rawFloors.map(function (floor) {
      return String(floor || '').trim()
    }).filter(Boolean)
  },
  openDoor: function (item, operationCode, selectedFloors, func) {
    appService.openDoorInSmallApp({
      devid: item.f_devNum,
      courtId: this.data.thisCourtID,
      f_devName: item.f_devName,
      type: item.type,
      selectedFloors: selectedFloors,
      deviceAction: '00',
      operationCode: operationCode
    }).then(function (res) {
      if (func) func(res)
    }).catch(function (res) {
      if (func) func(res || {
        Status: 'fail',
        Result: ''
      })
    })
  },
  unlockDoor: function (item, selectedFloors) {
    if (!this.lockOpenDoor()) return
    var that = this
    this.openDoor(item, 'PRE-DEDUCT', selectedFloors, function (res) {
      if (res.Status == 'success') {
        if (res.Code == 'SHOWDEDUCTTIP') {
          wx.showModal({
            title: TEXT.tip,
            content: '本次需要扣费' + res.Deduction + '元，确认是否执行？',
            success(res2) {
              if (res2.confirm) {
                that.openDoor(item, '', selectedFloors, function (res3) {
                  if (res3.Status == 'success') {
                    wx.showToast({
                      title: TEXT.unlockSuccess,
                      mask: true,
                      duration: OPEN_DOOR_UNLOCK_DELAY
                    })
                  } else {
                    util.notice(TEXT.unlockFailed, res3.Result)
                  }
                  that.releaseOpenDoorAfterDelay()
                })
                return
              }
              that.releaseOpenDoorAfterDelay()
            },
            fail() {
              that.releaseOpenDoorAfterDelay()
            }
          })
        } else {
          wx.showToast({
            title: TEXT.unlockSuccess,
            mask: true,
            duration: OPEN_DOOR_UNLOCK_DELAY
          })
          that.releaseOpenDoorAfterDelay()
        }
      } else {
        util.notice(TEXT.unlockFailed, res.Result)
        that.releaseOpenDoorAfterDelay()
      }
    })
  },
  quickExecuteLift: function (item) {
    this.unlockDoor(item, this.getLiftAllFloors(item))
  },
  openLiftSelector: function (item, mode) {
    wx.navigateTo({
      url: '/pages/keyfloor/keyfloor?devid=' + encodeURIComponent(item.f_devNum) + '&courtid=' + encodeURIComponent(this.data.thisCourtID) + '&mode=' + (mode || 'select'),
    })
  },
  unlock: function (e) {
    const item = this.data.keys[e.currentTarget.dataset.index]
    if (!item) return

    if (app.globalData.offline) {
      this.showNoNetwork()
      return
    }

    if (item.type === 'lift' && item.floorInfo && item.floorInfo.floors && item.floorInfo.floors.length) {
      this.quickExecuteLift(item)
      return
    }

    this.unlockDoor(item)
  },
  handleUnlockLongPress: function (e) {
    if (this.openDoorLocked) return
    const item = this.data.keys[e.currentTarget.dataset.index]
    if (!item || item.type !== 'lift' || !item.floorInfo || !item.floorInfo.floors.length) return
    this.openLiftSelector(item, 'select')
  },
  getKeyList: function () {
    var that = this
    that.showListLoading()
    appService.getKeyList(that.data.thisCourtID).then(function (keys) {
      that.setData({
        allkeys: keys,
        keys: featureMock.filterKeys(keys, that.data.filterType, that.data.keyword)
      })
      that.hideListLoading()
      wx.stopPullDownRefresh()
    }).catch(function (res2) {
      that.hideListLoading()
      util.notice(TEXT.keyLoadFailed, res2.Result)
      wx.stopPullDownRefresh()
    })
  },
  setFilter: function (e) {
    this.setData({
      filterType: e.currentTarget.dataset.type
    })
    this.showListLoading()
    this.applyFilter()
    this.hideListLoading()
  },
  inputKeyword: function (e) {
    this.setData({
      keyword: e.detail.value
    })
  },
  search: function () {
    this.showListLoading()
    this.applyFilter()
    this.hideListLoading()
  },
  applyFilter: function () {
    this.setData({
      keys: featureMock.filterKeys(this.data.allkeys, this.data.filterType, this.data.keyword)
    })
  },
  gotoSetting: function (e) {
    const item = this.data.keys[e.currentTarget.dataset.index]
    if (!item) return
    const url = item.type === 'lift'
      ? '/pages/keyfloor/keyfloor?devid=' + encodeURIComponent(item.f_devNum) + '&courtid=' + encodeURIComponent(this.data.thisCourtID) + '&mode=setting&devname=' + encodeURIComponent(item.f_devName)
      : '/pages/keydoor/keydoor?devid=' + encodeURIComponent(item.f_devNum) + '&courtid=' + encodeURIComponent(this.data.thisCourtID) + '&devname=' + encodeURIComponent(item.f_devName)
    wx.navigateTo({
      url: url
    })
  }
})
