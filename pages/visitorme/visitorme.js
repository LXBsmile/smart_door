const app = getApp()
const util = require('../../utils/util')
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')

const TEXT = {
  noNetworkTitle: '无网络',
  noNetworkContent: '无网络，请连接网络后再试',
  tip: '提示',
  keyLoadFailed: '加载钥匙列表失败',
  visitorKeyLoadFailed: '加载访客钥匙失败',
  visitorUnlockPending: '访客开锁接口暂未对接',
  noLiftFloor: '暂无可选楼层'
}

const OPEN_DOOR_UNLOCK_DELAY = 1000

Page({
  data: {
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index: '0',
    allKeys: [],
    keys: [],
    filterType: 'all',
    keyword: '',
    pageTitle: '我是访客',
    emptyText: '暂无访客钥匙',
    useOwnerKeyList: false,
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
      thisCourtID: '',
      index: '0',
      allKeys: [],
      keys: []
    })
    util.scheduleFeatureLoginPrompt(this)
    return false
  },
  onLoad: function (options) {
    this.openDoorPageUnloaded = false
    const isVisitorManageEntry = options && options.mode === 'visitor'
    this.setData({
      pageTitle: isVisitorManageEntry ? '来访开启' : '我是访客',
      emptyText: isVisitorManageEntry ? '暂无钥匙' : '暂无访客记录',
      useOwnerKeyList: isVisitorManageEntry
    })
  },

  onShow: function () {
    wx.setNavigationBarTitle({
      title: this.data.pageTitle
    })
    if (!this.ensureFeatureLogin()) {
      return
    }
    this.loadKeyList()
  },

  onPullDownRefresh: function () {
    if (!this.ensureFeatureLogin()) {
      wx.stopPullDownRefresh()
      return
    }
    this.loadKeyList()
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

  loadKeyList: function () {
    if (this.data.useOwnerKeyList) {
      this.loadOwnerKeyList()
      return
    }
    this.loadVisitorsKeyList()
  },

  loadOwnerKeyList: function () {
    var that = this
    that.showListLoading()
    util.ensureCourtState(function (stored) {
      if (!stored.currentCourt) {
        util.noticeArea('index')
        that.hideListLoading()
        wx.stopPullDownRefresh()
        return
      }

      that.setData({
        courts: stored.groups,
        thisCourtName: stored.currentCourt.GroupName,
        thisCourtID: stored.currentCourt.f_id,
        index: stored.index
      })

      appService.getKeyList(stored.currentCourt.f_id).then(function (keys) {
        that.setData({
          allKeys: keys
        })
        that.applyFilter()
        that.hideListLoading()
        wx.stopPullDownRefresh()
      }).catch(function (res) {
        that.setData({
          allKeys: [],
          keys: []
        })
        that.hideListLoading()
        util.notice(TEXT.keyLoadFailed, res && res.Result)
        wx.stopPullDownRefresh()
      })
    })
  },

  loadVisitorsKeyList: function () {
    var that = this
    that.showListLoading()
    appService.getVisitorsKeyList().then(function (res) {
      console.log('GetVisitorsKeyList返回：', res)
      const keys = that.normalizeVisitorKeys(res)
      that.setData({
        allKeys: keys
      })
      that.applyFilter()
      that.hideListLoading()
      wx.stopPullDownRefresh()
    }).catch(function (res) {
      console.log('GetVisitorsKeyList失败：', res)
      that.setData({
        allKeys: [],
        keys: []
      })
      if (res && res.Result) {
        util.notice(TEXT.visitorKeyLoadFailed, res.Result)
      }
      that.hideListLoading()
      wx.stopPullDownRefresh()
    })
  },

  normalizeVisitorKeys: function (res) {
    const records = this.extractVisitorKeys(res)
    return records.map((record, recordIndex) => {
      const source = record && typeof record === 'object' ? record : {}
      const devices = this.parseSharedDevices(source.f_shareddevices)
      const deviceNames = []
      const deviceIds = []
      const floorSelections = []

      devices.forEach((device) => {
        const selectedList = this.normalizeSelectedList(device.f_selectedlist)
        const deviceNumber = String(device.f_devicenumber || device.f_devNum || '').trim()
        const rawType = String(device.f_devicetype || device.f_devType || '').trim()
        const deviceName = this.getVisitorDeviceName(device, selectedList, source, deviceNumber)
        const typeText = this.getVisitorDeviceType(rawType, deviceName, deviceNumber, selectedList)

        if (deviceNumber) deviceIds.push(deviceNumber)
        if (deviceName) deviceNames.push(deviceName)
        if (typeText === '梯控' && selectedList.length) {
          floorSelections.push({
            deviceId: deviceNumber,
            deviceName: deviceName,
            floors: selectedList
          })
        }
      })

      const statusInfo = this.normalizeVisitStatus(source.f_status)
      const visitId = String(source.f_visitid || '').trim()
      const useCount = String(source.f_useNum || '').trim()
      return {
        id: visitId || ('visitor_' + recordIndex),
        itemKey: visitId || ('visitor_' + recordIndex),
        visitId: visitId,
        createTime: this.formatApplyTime(source.f_createdDateTime),
        applyUser: String(source.f_username || source.f_userName || source.f_userid || '').trim(),
        courtId: String(source.f_groupid || source.CourtID || '').trim(),
        courtName: String(source.f_groupname || '').trim(),
        visitorName: String(source.f_fkName || '').trim(),
        visitorTel: String(source.f_tel || '').trim(),
        password: String(source.f_Password || '').trim(),
        validity: String(source.f_validity || '').trim(),
        expireTime: this.formatValidity(source.f_validity),
        useCount: useCount || '1',
        status: statusInfo.value,
        statusText: statusInfo.text,
        statusClass: statusInfo.className,
        deviceNames: deviceNames,
        deviceSummary: deviceNames.length ? deviceNames.join('、') : '暂无设备',
        deviceIds: deviceIds,
        floorSelections: floorSelections,
        qrType: 'A8',
        raw: source
      }
    })
  },

  parseSharedDevices: function (value) {
    if (Array.isArray(value)) return value
    if (!value) return []
    try {
      const parsed = JSON.parse(String(value))
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      return []
    }
  },

  normalizeSelectedList: function (value) {
    if (Array.isArray(value)) {
      return value.map(function (item) {
        return String(item || '').trim()
      }).filter(Boolean)
    }
    if (!value) return []
    try {
      const parsed = JSON.parse(String(value))
      if (Array.isArray(parsed)) {
        return parsed.map(function (item) {
          return String(item || '').trim()
        }).filter(Boolean)
      }
    } catch (e) { }
    const text = String(value || '').trim()
    return text ? [text] : []
  },

  getVisitorDeviceName: function (device, selectedList, record, deviceNumber) {
    const name = String(device.f_devName || device.f_devname || device.f_doorname || '').trim()
    if (name) return name
    if (selectedList.length) {
      return selectedList.join('、')
    }
    return String(record.f_groupname || deviceNumber || '').trim()
  },

  getVisitorDeviceType: function (rawType, deviceName, deviceNumber, selectedList) {
    const typeText = String(rawType || '').trim()
    const nameText = [deviceName, selectedList.join(',')].join(',')
    if (typeText === 'lift' || typeText === '梯控' || typeText.indexOf('梯') > -1) return '梯控'
    if (typeText === 'door' || typeText === '门禁') return '门禁'
    if (nameText.indexOf('梯') > -1 || /^8/.test(String(deviceNumber || ''))) return '梯控'
    return '门禁'
  },

  normalizeVisitStatus: function (value) {
    const text = String(value === undefined || value === null ? '' : value).trim()
    const numericStatus = text !== '' && !isNaN(Number(text)) ? Number(text) : 0
    const arrived = value === true || numericStatus > 0 || text === '已到访' || text === 'done'
    return arrived
      ? {
        value: 'done',
        text: '已到访',
        className: 'status_done'
      }
      : {
        value: 'pending',
        text: '未到访',
        className: 'status_pending'
      }
  },

  formatApplyTime: function (value) {
    const text = String(value || '').trim()
    const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
    if (matched) {
      return matched[1].slice(2) + '-' + matched[2] + '-' + matched[3] + ' ' + matched[4] + ':' + matched[5] + ':' + (matched[6] || '00')
    }
    return text
  },

  formatValidity: function (value) {
    const text = String(value || '').replace(/\D/g, '')
    if (text.length < 10) return String(value || '').trim()
    const year = text.slice(0, 4)
    const month = text.slice(4, 6)
    const day = text.slice(6, 8)
    const hour = text.slice(8, 10)
    const minute = text.slice(10, 12)
    return year + '年' + month + '月' + day + '日 ' + hour + '时' + (minute || '00') + '分'
  },

  parseResult: function (value) {
    if (!value || typeof value !== 'string') return value
    try {
      return JSON.parse(value)
    } catch (e) {
      return value
    }
  },

  extractVisitorKeys: function (res) {
    if (Array.isArray(res?.Keys)) return res.Keys

    const result = this.parseResult(res && res.Result)
    if (Array.isArray(result)) return result
    if (result && Array.isArray(result.Keys)) return result.Keys

    return []
  },

  applyFilter: function () {
    if (!this.data.useOwnerKeyList) {
      this.setData({
        keys: this.filterVisitorRecords(this.data.allKeys, this.data.filterType, this.data.keyword)
      })
      return
    }
    this.setData({
      keys: featureMock.filterKeys(this.data.allKeys, this.data.filterType, this.data.keyword)
    })
  },

  filterVisitorRecords: function (list, filterType, keyword) {
    const key = String(keyword || '').trim()
    return (list || []).filter(function (item) {
      const statusOk = !filterType || filterType === 'all' || item.status === filterType
      const keyOk = !key ||
        String(item.applyUser || '').indexOf(key) > -1 ||
        String(item.courtName || '').indexOf(key) > -1 ||
        String(item.visitorName || '').indexOf(key) > -1 ||
        String(item.createTime || '').indexOf(key) > -1
      return statusOk && keyOk
    })
  },

  openVisitorPass: function (e) {
    const item = this.data.keys[e.currentTarget.dataset.index]
    if (!item) return
    appService.saveVisitorPassDetail(item)
    wx.navigateTo({
      url: '/pages/visitorpass/visitorpass?id=' + encodeURIComponent(item.id || item.visitId || ''),
    })
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
      courtId: item.courtId || this.data.thisCourtID,
      f_devName: item.f_devName,
      type: item.type,
      selectedFloors: selectedFloors,
      deviceAction: '01',
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
                      title: '开门成功',
                      mask: true,
                      duration: OPEN_DOOR_UNLOCK_DELAY
                    })
                  } else {
                    util.notice('开门失败', res3.Result)
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
          return
        }
        wx.showToast({
          title: '开门成功',
          mask: true,
          duration: OPEN_DOOR_UNLOCK_DELAY
        })
        that.releaseOpenDoorAfterDelay()
        return
      }
      util.notice('开门失败', res.Result)
      that.releaseOpenDoorAfterDelay()
    })
  },

  openLiftSelector: function (item) {
    if (!item || item.type !== 'lift') return
    const openMinutes = this.getVisitorOpenMinutes(item)
    wx.navigateTo({
      url: '/pages/keyfloor/keyfloor?devid=' + encodeURIComponent(item.f_devNum) + '&courtid=' + encodeURIComponent(item.courtId || this.data.thisCourtID) + '&mode=select&source=visitor&openminutes=' + encodeURIComponent(openMinutes),
    })
  },

  getVisitorOpenMinutes: function (item) {
    const source = item || {}
    const value = source.f_VstTime || source.f_vstTime || source.f_Vsttime || source.VstTime
    const minutes = parseInt(value, 10)
    return minutes > 0 ? minutes : 1
  },

  confirmVisitorOpen: function (item, selectedFloors) {
    if (this.openDoorLocked || this.visitorConfirmShowing) return
    const that = this
    this.visitorConfirmShowing = true
    wx.showModal({
      title: '来访开启',
      content: '开启时长为' + this.getVisitorOpenMinutes(item) + '分钟！\n确定要开启？',
      confirmText: '确定',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          that.unlockDoor(item, selectedFloors)
        }
      },
      complete: function () {
        that.visitorConfirmShowing = false
      }
    })
  },

  executeVisitorOpen: function (item, selectedFloors) {
    if (this.data.useOwnerKeyList) {
      this.confirmVisitorOpen(item, selectedFloors)
      return
    }
    this.unlockDoor(item, selectedFloors)
  },

  unlock: function (e) {
    const item = this.data.keys[e.currentTarget.dataset.index]
    if (!item) return
    if (getApp().globalData.offline) {
      this.showNoNetwork()
      return
    }
    if (item.type === 'lift' && item.floorInfo && item.floorInfo.floors && item.floorInfo.floors.length) {
      this.executeVisitorOpen(item, this.getLiftAllFloors(item))
      return
    }
    this.executeVisitorOpen(item)
  },

  handleUnlockLongPress: function (e) {
    if (this.openDoorLocked) return
    const item = this.data.keys[e.currentTarget.dataset.index]
    this.openLiftSelector(item)
  }
})
