const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
const util = require('../../utils/util')

const TEXT = {
  tip: '提示',
  visitorLiftExecutePending: '访客梯控开锁接口暂未对接',
  unlockSuccess: '开门成功',
  unlockFailed: '开门失败'
}

const OPEN_DOOR_UNLOCK_DELAY = 1000

Page({
  data: {
    floors: [],
    checkedMap: {},
    devid: '',
    courtId: '',
    devName: '',
    openMode: false,
    allChecked: false,
    mode: 'setting',
    source: '',
    actionText: '确认执行',
    visitorOpenMinutes: 1,
    openingDoor: false
  },
  buildFloorItems: function (source) {
    return (Array.isArray(source) ? source : []).map(function (item) {
      const key = String(item || '').trim()
      if (!key) return null
      return {
        key: key,
        label: key
      }
    }).filter(Boolean)
  },
  onLoad: function (options) {
    options = options || {}
    this.openDoorPageUnloaded = false
    const devid = options.devid || ''
    const courtId = options.courtid || ''
    const devName = this.decodeText(options.devname) || devid
    const mode = options.mode || 'setting'
    const source = options.source || ''
    const visitorOpenMinutes = this.getPositiveMinutes(options.openminutes || options.minutes)
    const result = appService.getLiftControl(devid, courtId)
    const selectedFloors = result.SelectedFloors || []
    const allFloors = Array.isArray(result.Floors) && result.Floors.length
      ? result.Floors
      : []
    const floorValues = mode === 'select'
      ? (allFloors.length ? allFloors : selectedFloors)
      : (allFloors.length ? allFloors : featureMock.getFloorOptions())
    const floors = this.buildFloorItems(floorValues)
    const checkedMap = {}

    selectedFloors.forEach(item => {
      checkedMap[String(item || '').trim()] = true
    })

    this.setData({
      devid: devid,
      courtId: courtId,
      devName: devName,
      mode: mode,
      source: source,
      actionText: '确认执行',
      visitorOpenMinutes: visitorOpenMinutes,
      floors: floors,
      checkedMap: checkedMap,
      allChecked: floors.length > 0 && floors.every(item => checkedMap[item.key]),
      openMode: !!result.OpenMode
    })
    wx.setNavigationBarTitle({
      title: mode === 'select' ? '楼层选择' : '设置梯控'
    })
  },
  onUnload: function () {
    this.openDoorPageUnloaded = true
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
  decodeText: function (value) {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  },
  getPositiveMinutes: function (value) {
    const minutes = parseInt(value, 10)
    return minutes > 0 ? minutes : 1
  },
  isVisitorOpen: function () {
    return this.data.source === 'visitor'
  },
  confirmVisitorOpen: function (selectedFloors) {
    if (this.openDoorLocked || this.visitorConfirmShowing) return
    const that = this
    this.visitorConfirmShowing = true
    wx.showModal({
      title: '来访开启',
      content: '开启时长为' + this.data.visitorOpenMinutes + '分钟！\n确定要开启？',
      confirmText: '确定',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          that.executeOpenDoor(selectedFloors)
        }
      },
      complete: function () {
        that.visitorConfirmShowing = false
      }
    })
  },
  toggleAll: function () {
    const checkedMap = {}
    const allChecked = this.data.allChecked
    this.data.floors.forEach(item => {
      checkedMap[item.key] = !allChecked
    })
    this.setData({ checkedMap, allChecked: !allChecked })
  },
  toggleOne: function (e) {
    const key = e.currentTarget.dataset.key
    const checkedMap = this.data.checkedMap
    checkedMap[key] = !checkedMap[key]
    this.setData({
      checkedMap,
      allChecked: this.data.floors.length > 0 && this.data.floors.every(item => checkedMap[item.key])
    })
  },
  setOpenMode: function (e) {
    this.setData({
      openMode: e.currentTarget.dataset.value === 'true'
    })
  },
  showExecuteBlockedNotice: function () {
    util.notice(TEXT.tip, TEXT.visitorLiftExecutePending)
  },
  openDoor: function (operationCode, selectedFloors, func) {
    appService.openDoorInSmallApp({
      devid: this.data.devid,
      courtId: this.data.courtId,
      type: 'lift',
      selectedFloors: selectedFloors,
      deviceAction: this.data.source === 'visitor' ? '01' : '00',
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
  executeOpenDoor: function (selectedFloors) {
    if (!this.lockOpenDoor()) return
    const that = this
    this.openDoor('PRE-DEDUCT', selectedFloors, function (res) {
      if (res.Status == 'success') {
        if (res.Code == 'SHOWDEDUCTTIP') {
          wx.showModal({
            title: TEXT.tip,
            content: '本次需要扣费' + res.Deduction + '元，确认是否执行？',
            success(res2) {
              if (res2.confirm) {
                that.openDoor('', selectedFloors, function (res3) {
                  that.handleOpenDoorResult(res3)
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
        that.handleOpenDoorResult(res)
        that.releaseOpenDoorAfterDelay()
      } else {
        util.notice(TEXT.unlockFailed, res.Result)
        that.releaseOpenDoorAfterDelay()
      }
    })
  },
  handleOpenDoorResult: function (res) {
    if (res && res.Status == 'success') {
      wx.showToast({
        title: TEXT.unlockSuccess,
        mask: true,
        duration: OPEN_DOOR_UNLOCK_DELAY
      })
      if (this.data.mode !== 'select') {
        setTimeout(function () {
          wx.navigateBack({
            delta: 1
          })
        }, 600)
      }
      return
    }
    util.notice(TEXT.unlockFailed, (res && res.Result) || '')
  },
  executeFloor: function (e) {
    const floor = e.currentTarget.dataset.key
    if (!floor) return
    if (this.isVisitorOpen()) {
      this.confirmVisitorOpen([floor])
      return
    }
    this.executeOpenDoor([floor])
  },
  submit: function () {
    const selectedFloors = this.data.floors.filter(item => this.data.checkedMap[item.key]).map(function (item) {
      return item.key
    })

    if (!selectedFloors.length) {
      wx.showToast({
        title: '请先选择楼层',
        icon: 'none'
      })
      return
    }

    if (this.data.mode === 'select') {
      if (this.isVisitorOpen()) {
        this.confirmVisitorOpen(selectedFloors)
        return
      }
      this.executeOpenDoor(selectedFloors)
      return
    }

    const action = appService.saveLiftControl({
      devid: this.data.devid,
      courtId: this.data.courtId,
      selectedFloors: selectedFloors,
      openMode: this.data.openMode
    })
    const that = this

    action.then(function () {
      wx.showToast({
        title: that.data.mode === 'select' ? '执行成功' : '保存成功',
        icon: 'success'
      })
      setTimeout(function () {
        wx.navigateBack({
          delta: 1
        })
      }, 600)
    }).catch(function (result) {
      util.notice(
        that.data.mode === 'select' ? '执行失败' : '保存失败',
        (result && result.Result) || ''
      )
    })
  }
})
