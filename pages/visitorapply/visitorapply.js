const app = getApp()
const util = require('../../utils/util')
const appService = require('../../utils/services/appService')

const TEXT = {
  separator: '、',
  tip: '提示',
  inputVisitorName: '请输入访客姓名',
  inputPhone: '请输入正确手机号',
  inputCounts: '请输入正确的使用次数',
  inputValidity: '请选择正确的有效期',
  expiredValidity: '有效期必须晚于当前时间',
  maxValidity: '有效期最晚为明天 23:59',
  noDeviceAvailable: '暂无可授权设备',
  courtLoadFailed: '获取小区信息失败',
  submitFailed: '提交失败',
  submitFailedFallback: '申请临时密码接口调用失败',
  defaultApplyUser: '张三',
  selectDevice: '选择设备（默认全部）'
}

Page({
  data: {
    ids: '',
    courtid: '',
    courtname: '',
    deviceNames: '',
    deviceDisplayText: TEXT.selectDevice,
    deviceNameList: [],
    selectedDevices: [],
    floorSelections: [],
    name: '',
    tel: '',
    counts: '1',
    date: '',
    time: '00:00',
    maxDate: '',
    submitting: false
  },

  onLoad: function (options) {
    options = options || {}
    const defaultValidity = this.getDefaultValidity()
    const courtid = this.decodeText(options.courtid)
    const maxDate = this.getMaxDate(courtid)
    const rawDate = this.decodeText(options.date) || defaultValidity.date
    const clampedDate = maxDate && rawDate > maxDate ? maxDate : rawDate
    this.setData({
      ids: this.decodeText(options.ids),
      courtid: courtid,
      courtname: this.decodeText(options.courtname),
      selectedDevices: this.parseSelectedDevices(options.devices),
      floorSelections: this.parseFloorSelections(options.floors),
      name: this.decodeText(options.name),
      tel: this.decodeText(options.tel),
      counts: this.decodeText(options.counts) || this.data.counts,
      date: clampedDate,
      time: this.decodeText(options.time) || defaultValidity.time,
      maxDate: maxDate
    })
    this.loadDeviceNames()
  },

  decodeText: function (value) {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  },

  parseFloorSelections: function (value) {
    const text = this.decodeText(value)
    if (!text) return []
    try {
      const list = JSON.parse(text)
      return Array.isArray(list) ? list : []
    } catch (e) {
      return []
    }
  },

  parseSelectedDevices: function (value) {
    const text = this.decodeText(value)
    if (!text) return []
    try {
      const list = JSON.parse(text)
      return Array.isArray(list) ? list : []
    } catch (e) {
      return []
    }
  },

  loadDeviceNames: function () {
    var that = this
    const idArr = (that.data.ids || '').split(',').filter(Boolean)
    if (!idArr.length) {
      that.setData({
        deviceNames: '',
        deviceDisplayText: TEXT.selectDevice,
        deviceNameList: []
      })
      return
    }
    appService.getKeyList(that.data.courtid).then(function (keys) {
      const names = that.buildDeviceNames(keys, idArr)
      const deviceNames = names.join(TEXT.separator)
      that.setData({
        deviceNames: deviceNames,
        deviceDisplayText: deviceNames || TEXT.selectDevice,
        deviceNameList: names
      })
    }).catch(function () {
      const names = that.buildDeviceNames([], idArr)
      const deviceNames = names.join(TEXT.separator)
      that.setData({
        deviceNames: deviceNames,
        deviceDisplayText: deviceNames || TEXT.selectDevice,
        deviceNameList: names
      })
    })
  },

  buildDeviceNames: function (keys, idArr, floorSelections) {
    const floorMap = {}
    const selectedFloors = Array.isArray(floorSelections) ? floorSelections : this.data.floorSelections
    selectedFloors.forEach(function (item) {
      floorMap[String(item.deviceId || '')] = item
    })

    return (idArr || []).filter(Boolean).map(function (id) {
      const key = (keys || []).find(function (item) {
        return String(item.f_devNum) === String(id)
      })
      const floorInfo = floorMap[String(id)] || {}
      const name = (key && key.f_devName) || floorInfo.deviceName || id
      const floors = Array.isArray(floorInfo.floors) ? floorInfo.floors : []
      if (!floors.length) return name
      return name + '（' + floors.map(function (floor) {
        return String(floor || '').trim()
      }).join(TEXT.separator) + '）'
    })
  },

  getTomorrowEnd: function () {
    const end = new Date()
    end.setDate(end.getDate() + 1)
    end.setHours(23, 59, 59, 0)
    return end
  },

  getMaxDate: function (courtid = '') {
    const tomorrow = this.getTomorrowEnd()
    const tomorrowStr = tomorrow.getFullYear() + '-' + this.pad(tomorrow.getMonth() + 1) + '-' + this.pad(tomorrow.getDate())
    const backendInfo = appService.getBackEndUserInfo(courtid) || {}
    const validity = String(backendInfo.f_validity || '').trim()
    if (!validity) return tomorrowStr
    const dateStr = validity.split(' ')[0]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return tomorrowStr
    return dateStr < tomorrowStr ? dateStr : tomorrowStr
  },

  pad: function (n) {
    return n < 10 ? '0' + n : '' + n
  },

  getDefaultValidity: function () {
    const next = new Date()
    next.setHours(23, 59, 0, 0)
    if (next.getTime() <= Date.now()) {
      next.setDate(next.getDate() + 1)
    }
    return {
      date: next.getFullYear() + '-' + this.pad(next.getMonth() + 1) + '-' + this.pad(next.getDate()),
      time: '23:59'
    }
  },

  getSelectedValidityDate: function () {
    const dateArr = String(this.data.date || '').split('-').map(function (item) {
      return Number(item)
    })
    const timeArr = String(this.data.time || '').split(':').map(function (item) {
      return Number(item)
    })
    if (dateArr.length !== 3 || timeArr.length !== 2) return null
    if (dateArr.some(function (item) { return !Number.isFinite(item) }) || timeArr.some(function (item) { return !Number.isFinite(item) })) {
      return null
    }
    const selected = new Date(dateArr[0], dateArr[1] - 1, dateArr[2], timeArr[0], timeArr[1], 0, 0)
    if (
      selected.getFullYear() !== dateArr[0] ||
      selected.getMonth() !== dateArr[1] - 1 ||
      selected.getDate() !== dateArr[2] ||
      selected.getHours() !== timeArr[0] ||
      selected.getMinutes() !== timeArr[1]
    ) {
      return null
    }
    return selected
  },

  inputname: function (e) {
    this.setData({ name: e.detail.value })
  },

  inputtel: function (e) {
    this.setData({ tel: e.detail.value })
  },

  inputcounts: function (e) {
    this.setData({ counts: e.detail.value })
  },

  changeDate: function (e) {
    const value = e.detail.value
    const maxDate = this.data.maxDate
    this.setData({ date: maxDate && value > maxDate ? maxDate : value })
  },

  changeTime: function (e) {
    this.setData({ time: e.detail.value })
  },

  applyDeviceSelection: function (selection) {
    const source = selection || {}
    this.setData({
      ids: this.decodeText(source.ids),
      courtid: this.decodeText(source.courtid),
      courtname: this.decodeText(source.courtname),
      selectedDevices: Array.isArray(source.devices) ? source.devices : this.parseSelectedDevices(source.devicesText),
      floorSelections: Array.isArray(source.floorSelections) ? source.floorSelections : this.parseFloorSelections(source.floors)
    })
    this.loadDeviceNames()
  },

  buildSelectDeviceUrl: function () {
    const params = {
      mode: 'select',
      return: 'visitorapply',
      name: this.data.name,
      tel: this.data.tel,
      counts: this.data.counts,
      date: this.data.date,
      time: this.data.time,
      ids: this.data.ids,
      courtid: this.data.courtid,
      courtname: this.data.courtname,
      devices: JSON.stringify(this.data.selectedDevices || []),
      floors: JSON.stringify(this.data.floorSelections || [])
    }
    const query = Object.keys(params).map(function (key) {
      return key + '=' + encodeURIComponent(params[key] || '')
    }).join('&')
    return '/pages/visitormanage/visitormanage?' + query
  },

  gotoSelectDevice: function () {
    wx.navigateTo({
      url: this.buildSelectDeviceUrl(),
    })
  },

  getSelectedDeviceIds: function () {
    return (this.data.ids || '').split(',').filter(Boolean)
  },

  getCurrentCourtForSubmit: function () {
    var that = this
    const courtId = String(this.data.courtid || '').trim()
    if (courtId) {
      return Promise.resolve({
        courtId: courtId,
        courtName: this.data.courtname
      })
    }

    return new Promise(function (resolve, reject) {
      util.ensureCourtState(function (stored) {
        if (!stored.currentCourt) {
          reject({
            Status: 'fail',
            Result: TEXT.courtLoadFailed
          })
          return
        }

        const current = stored.currentCourt || {}
        const result = {
          courtId: String(current.f_id || '').trim(),
          courtName: current.GroupName || ''
        }
        that.setData({
          courtid: result.courtId,
          courtname: result.courtName
        })
        resolve(result)
      })
    })
  },

  buildAllFloorSelections: function (keys) {
    return (keys || []).filter(function (item) {
      return item && item.type === 'lift'
    }).map(function (item) {
      const floorInfo = item.floorInfo || {}
      const floors = floorInfo.raw && Array.isArray(floorInfo.raw.Floors) && floorInfo.raw.Floors.length
        ? floorInfo.raw.Floors
        : (floorInfo.floors || [])
      return {
        deviceId: item.f_devNum,
        deviceName: item.f_devName,
        floors: floors
      }
    }).filter(function (item) {
      return item.deviceId
    })
  },

  isAllSubmitDevicesSelected: function (keys, selectedDevices, selectedDeviceIds, floorSelections) {
    const keyList = Array.isArray(keys) ? keys : []
    if (!keyList.length || !selectedDeviceIds.length) return false
    if ((Array.isArray(selectedDevices) ? selectedDevices.length : selectedDeviceIds.length) < keyList.length) return false

    const that = this
    const selectedDeviceNames = {}
      ; (Array.isArray(selectedDevices) ? selectedDevices : []).forEach(function (item) {
        const key = [String(item.deviceId || item.f_devNum || '').trim(), String(item.deviceName || item.f_devName || '').trim()].join('|')
        selectedDeviceNames[key] = true
      })

    return keyList.every(function (item) {
      const deviceId = String(item.f_devNum || '').trim()
      const deviceName = String(item.f_devName || '').trim()
      if (!deviceId) return false
      if (selectedDevices.length && !selectedDeviceNames[[deviceId, deviceName].join('|')]) return false
      if (item.type !== 'lift') return true

      const floorInfo = item.floorInfo || {}
      const allFloors = floorInfo.raw && Array.isArray(floorInfo.raw.Floors) && floorInfo.raw.Floors.length
        ? floorInfo.raw.Floors
        : (floorInfo.floors || [])
      const currentSelection = (Array.isArray(floorSelections) ? floorSelections : []).find(function (floorItem) {
        return String(floorItem.deviceId || '').trim() === deviceId
      })
      const selectedFloors = currentSelection && Array.isArray(currentSelection.floors) ? currentSelection.floors : []
      return allFloors.length > 0 && allFloors.every(function (floor) {
        return selectedFloors.some(function (selected) {
          return that.normalizeFloorLabel(floor) === that.normalizeFloorLabel(selected)
        })
      })
    })
  },

  prepareSubmitDevices: function () {
    const selectedDeviceIds = this.getSelectedDeviceIds()

    return this.getCurrentCourtForSubmit().then(function (court) {
      const selectedDevices = Array.isArray(this.data.selectedDevices) ? this.data.selectedDevices : []
      const floorSelections = this.data.floorSelections
      if (!selectedDeviceIds.length) {
        return {
          courtId: court.courtId,
          courtName: court.courtName,
          deviceIds: [],
          devices: [],
          useBackendAllDevices: true,
          deviceNames: TEXT.selectDevice,
          floorSelections: []
        }
      }

      return {
        courtId: court.courtId,
        courtName: court.courtName,
        deviceIds: selectedDeviceIds,
        devices: selectedDevices,
        useBackendAllDevices: false,
        deviceNames: this.data.deviceNames || this.buildDeviceNames(selectedDevices.map(function (item) {
          return {
            f_devNum: item.deviceId,
            f_devName: item.deviceName,
            type: item.type
          }
        }), selectedDeviceIds, floorSelections),
        floorSelections: floorSelections
      }
    }.bind(this))
  },

  submit: function () {
    var that = this
    if (this.data.submitting) {
      return
    }
    if (!this.data.name.trim()) {
      util.notice(TEXT.tip, TEXT.inputVisitorName)
      return
    }
    if (!/^1\d{10}$/.test(this.data.tel)) {
      util.notice(TEXT.tip, TEXT.inputPhone)
      return
    }
    if (!/^\d+$/.test(String(this.data.counts || '')) || Number(this.data.counts) <= 0) {
      util.notice(TEXT.tip, TEXT.inputCounts)
      return
    }

    const selectedValidity = this.getSelectedValidityDate()
    if (!selectedValidity) {
      util.notice(TEXT.tip, TEXT.inputValidity)
      return
    }
    if (selectedValidity <= new Date()) {
      util.notice(TEXT.tip, TEXT.expiredValidity)
      return
    }
    if (selectedValidity > this.getTomorrowEnd()) {
      util.notice(TEXT.tip, TEXT.maxValidity)
      return
    }

    const dateArr = this.data.date.split('-')
    const timeArr = this.data.time.split(':')
    const expireText = dateArr[0] + '年' + dateArr[1] + '月' + dateArr[2] + '日 ' + timeArr[0] + '时' + (timeArr[1] ? timeArr[1] + '分' : '')
    const validity = dateArr.join('') + timeArr.join('')
    let submitDevices = null

    this.setData({
      submitting: true
    })
    this.prepareSubmitDevices().then(function (prepared) {
      submitDevices = prepared
      return appService.submitVisitorApply({
        applyUser: app.globalData.userInfo?.f_nickname || TEXT.defaultApplyUser,
        courtId: prepared.courtId,
        courtName: prepared.courtName,
        visitorName: that.data.name.trim(),
        visitorTel: that.data.tel,
        validity: validity,
        expireTime: expireText,
        useCount: that.data.counts,
        deviceNames: prepared.deviceNames,
        deviceIds: prepared.deviceIds,
        devices: prepared.devices,
        useBackendAllDevices: prepared.useBackendAllDevices,
        floorSelections: prepared.floorSelections
      })
    }).then(function (result) {
      console.log('ShareKey2Visitors response:', result.Response)
      const recordResult = appService.createVisitorRecord({
        applyUser: app.globalData.userInfo?.f_nickname || TEXT.defaultApplyUser,
        courtName: submitDevices.courtName,
        visitorName: that.data.name.trim(),
        visitorTel: that.data.tel,
        expireTime: expireText,
        useCount: that.data.counts,
        deviceNames: submitDevices.deviceNames,
        deviceIds: submitDevices.deviceIds,
        floorSelections: submitDevices.floorSelections,
        password: result.Password
      })

      that.setData({
        submitting: false
      })

      wx.redirectTo({
        url: '/pages/visitorpass/visitorpass?id=' + recordResult.Record.id,
      })
    }).catch(function (res) {
      that.setData({
        submitting: false
      })
      util.notice(TEXT.submitFailed, res?.Result || TEXT.submitFailedFallback)
    })
  }
})
