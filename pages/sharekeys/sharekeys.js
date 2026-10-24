const app = getApp()
const util = require('../../utils/util')
const featureMock = require('../../utils/featureMock')

Page({
  data: {
    disabled: true,
    name: '',
    tel: '',
    counts: '1',
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index: '0',
    dateDis: true,
    startYear: '1990',
    endYear: '2100',
    inputYear: '',
    monthArray: [''],
    monthIndex: 0,
    dayArray: [''],
    dayIndex: 0,
    timeArray: [''],
    timeIndex: 23,
    fullTimeArray: ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
    validity: null,
    fullArray: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32'],
    shareDeviceId: '',
    shareDeviceName: '',
    fromPage: '',
    preferredCourtId: ''
  },
  ensureFeatureLogin: function () {
    if (featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId) {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    if (app.globalData.isRegisted && util.isRegisteredUser(app.globalData.userInfo)) {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    util.scheduleFeatureLoginPrompt(this)
    return false
  },

  onShow: function () {
    if (!this.ensureFeatureLogin()) {
      return
    }
    if (!this.data.thisCourtID || !this.data.courts.length) {
      this.loadPageData()
    }
  },

  onLoad: function (options) {
    this.setData({
      shareDeviceId: options.devid || '',
      shareDeviceName: this.decodeText(options.devname),
      fromPage: options.from || '',
      preferredCourtId: options.courtid || ''
    })
  },
  onHide: function () {
    util.clearFeatureLoginPrompt(this)
  },
  onUnload: function () {
    util.clearFeatureLoginPrompt(this)
  },

  decodeText: function (value) {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  },

  buildShareDevices: function () {
    if (!this.data.shareDeviceId) return []
    return [{
      f_devicenumber: this.data.shareDeviceId,
      f_selectedlist: this.data.shareDeviceName ? [this.data.shareDeviceName] : []
    }]
  },

  loadPageData: function () {
    if (featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId) {
      const courts = featureMock.getDebugCourts()
      const index = this.resolveCourtIndex(courts, this.data.preferredCourtId)
      this.applyCourt(courts, index)
      this.applyValidity(new Date('2026/12/31 00:00:00'))
      return
    }
    util.ensureCourtState((stored) => {
      if (!stored.groups.length) {
        util.noticeArea('index')
        return
      }
      const index = this.resolveCourtIndex(stored.groups, this.data.preferredCourtId)
      this.applyCourt(stored.groups, index)
      this.loadValidity()
    }, {
      courtId: this.data.preferredCourtId
    })
  },

  resolveCourtIndex: function (courts, preferredCourtId) {
    if (!courts || !courts.length) return 0
    if (preferredCourtId) {
      const idx = courts.findIndex(function (item) {
        return String(item.f_id) === String(preferredCourtId)
      })
      if (idx > -1) return idx
    }
    if (!courts[app.globalData.courtindex]) {
      app.globalData.courtindex = 0
    }
    return app.globalData.courtindex || 0
  },

  applyCourt: function (courts, index) {
    const current = courts[index] || courts[0] || {}
    this.setData({
      courts: courts,
      index: index,
      thisCourtName: current.GroupName || '',
      thisCourtID: current.f_id || ''
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(current, Number(index) || 0)
    } else {
      app.globalData.courtindex = index
      app.thisCourt = current
    }
  },

  loadValidity: function () {
    var that = this
    const applyBackEndUserInfo = function (res) {
      if (res.Status == 'success') {
        that.applyValidity(new Date((res.f_validity || '').replace(/-/g, '/') + ':00:00'))
      } else if (featureMock.DEBUG_OPEN_PERMISSION) {
        that.applyValidity(new Date('2026/12/31 00:00:00'))
      } else {
        util.notice('获取有效日期失败', res.Result)
      }
    }
    const cachedBackEndUserInfo = util.getStoredBackEndUserInfo({
      courtId: that.data.thisCourtID
    })
    if (cachedBackEndUserInfo && cachedBackEndUserInfo.Status == 'success') {
      applyBackEndUserInfo(cachedBackEndUserInfo)
      return
    }
    util.refreshBackEndUserInfo(applyBackEndUserInfo, {
      courtId: that.data.thisCourtID
    })
  },

  applyValidity: function (validityDate) {
    if (!(validityDate instanceof Date) || Number.isNaN(validityDate.getTime())) {
      this.resetValidity()
      return
    }
    const now = new Date()
    if (validityDate < now) {
      util.notice('', '抱歉，您的权限已过期，不能分享钥匙')
      this.resetValidity()
      return
    }
    const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59)
    const capDate = validityDate < tomorrowEnd ? validityDate : tomorrowEnd
    this.setData({
      validity: capDate,
      dateDis: false,
      startYear: String(now.getFullYear()),
      endYear: String(capDate.getFullYear()),
      inputYear: String(now.getFullYear())
    })
    this.judgeMonth()
    this.judgeDisable()
    if (
      now.getFullYear() == validityDate.getFullYear() &&
      now.getMonth() == validityDate.getMonth() &&
      now.getDate() == validityDate.getDate() &&
      (now.getHours() < validityDate.getHours() || validityDate.getHours() == 0)
    ) {
      util.notice('请注意', '您的权限将在今天过期')
    }
  },

  resetValidity: function () {
    this.setData({
      dateDis: true,
      inputYear: '',
      monthArray: [''],
      monthIndex: 0,
      dayArray: [''],
      dayIndex: 0,
      timeArray: [''],
      validity: null
    })
    this.judgeDisable()
  },

  bindYearChange: function (e) {
    this.setData({
      inputYear: e.detail.value
    })
    this.judgeMonth()
  },

  bindMonthChange: function (e) {
    this.setData({
      monthIndex: e.detail.value
    })
    this.judgeDay()
  },

  bindDayChange: function (e) {
    this.setData({
      dayIndex: e.detail.value
    })
    this.judgeDisable()
  },

  bindTimeChange: function (e) {
    this.setData({
      timeIndex: e.detail.value
    })
    this.judgeDisable()
  },

  inputname: function (e) {
    this.setData({
      name: e.detail.value
    })
    this.judgeDisable()
  },

  inputtel: function (e) {
    this.setData({
      tel: e.detail.value
    })
    this.judgeDisable()
  },

  inputcounts: function (e) {
    this.setData({
      counts: e.detail.value
    })
    this.judgeDisable()
  },

  selectcourt: function (e) {
    const index = e.detail.value
    this.applyCourt(this.data.courts, index)
    this.loadValidity()
  },

  formSubmit: function (e) {
    if (!e.detail.value.name || !e.detail.value.name.trim()) {
      util.notice('提示', '请输入访客姓名')
      return
    }
    if (!/^1\d{10}$/.test(e.detail.value.tel || '')) {
      util.notice('提示', '请输入正确手机号')
      return
    }
    if (!/^\d+$/.test(String(e.detail.value.counts || '')) || Number(e.detail.value.counts) <= 0) {
      util.notice('提示', '请输入正确的使用次数')
      return
    }
    if (this.data.dateDis || !this.data.inputYear || !this.data.monthArray.length || !this.data.dayArray.length || !this.data.timeArray.length) {
      util.notice('提示', '当前权限有效期不可用于分享')
      return
    }
    const selected = new Date(
      Number(this.data.inputYear),
      Number(this.data.monthArray[this.data.monthIndex]) - 1,
      Number(this.data.dayArray[this.data.dayIndex]),
      Number(this.data.timeArray[this.data.timeIndex]), 0, 0, 0
    )
    if (this.data.validity && selected > this.data.validity) {
      util.notice('提示', '所选时间超出可选范围')
      return
    }
    var date = new Date()
    const currentUser = app.globalData.userInfo || {}
    const openId = app.globalData.openId || 'DEBUG_OPENID'
    const unionId = currentUser.f_UnionID || 'DEBUG_UNIONID'
    var nowtime = ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2)
    var time2 = '' + this.data.inputYear + this.data.monthArray[this.data.monthIndex] + this.data.dayArray[this.data.dayIndex] + this.data.timeArray[this.data.timeIndex] + '00'
    var content = 'time=' + nowtime + '&f_openid=' + openId + '&f_unionid=' + unionId + '&f_fkName=' + e.detail.value.name + '&f_tel=' + e.detail.value.tel + '&f_validity=' + time2 + '&f_useNum=' + e.detail.value.counts + '&f_courtid=' + this.data.thisCourtID
    var url = '【智慧云门禁】分享了一把钥匙给你，点击链接进行绑定。http://szcjwzn.cn/open.php?type=6&content=' + util.encode(content)
    const shouldGoBack = this.data.fromPage === 'visitormanage'
    wx.setClipboardData({
      data: url,
      success: function () {
        wx.showToast({
          title: '分享链接已复制',
          icon: 'success',
          duration: 2000,
          mask: true,
          complete: function () {
            setTimeout(function () {
              if (shouldGoBack) {
                wx.navigateBack({
                  delta: 1
                })
              } else {
                wx.redirectTo({
                  url: '/pages/index/index'
                })
              }
            }, 1500)
          }
        })
      },
      fail: function (err) {
        console.error(err)
      }
    })
  },

  judgeMonth: function () {
    if (!this.data.validity) return
    var ma = []
    if (this.data.inputYear == this.data.validity.getFullYear()) {
      ma = this.data.fullArray.slice(0, this.data.validity.getMonth() - 31)
    } else {
      ma = this.data.fullArray.slice(0, 12)
    }
    if (this.data.inputYear == new Date().getFullYear()) {
      ma = ma.slice(new Date().getMonth())
    }
    var mi = ma.indexOf(this.data.monthArray[this.data.monthIndex])
    if (mi < 0) {
      mi = (parseInt('0' + this.data.monthArray[this.data.monthIndex]) > parseInt(ma[ma.length - 1])) ? (ma.length - 1) : 0
    }
    this.setData({
      monthArray: ma,
      monthIndex: mi
    })
    this.judgeDay()
  },

  judgeDay: function () {
    if (!this.data.validity) return
    var da
    var thisYear = this.data.inputYear
    var thisMonth = this.data.monthArray[this.data.monthIndex]
    if (thisYear == this.data.validity.getFullYear() && thisMonth == this.data.validity.getMonth() + 1) {
      da = this.data.fullArray.slice(0, this.data.validity.getDate() - 32)
    } else {
      if ('01,03,05,07,08,10,12'.indexOf(thisMonth) > -1) {
        da = this.data.fullArray.slice(0, 31)
      } else if (thisMonth == '02') {
        if (((thisYear % 4) == 0) && ((thisYear % 100) != 0) || ((thisYear % 400) == 0)) {
          da = this.data.fullArray.slice(0, 29)
        } else {
          da = this.data.fullArray.slice(0, 28)
        }
      } else {
        da = this.data.fullArray.slice(0, 30)
      }
    }
    if (thisYear == new Date().getFullYear() && thisMonth == new Date().getMonth() + 1) {
      da = da.slice(new Date().getDate() - 1)
    }
    var di = da.indexOf(this.data.dayArray[this.data.dayIndex])
    if (di < 0) {
      di = (parseInt('0' + this.data.dayArray[this.data.dayIndex]) > parseInt(da[da.length - 1])) ? (da.length - 1) : 0
    }
    this.setData({
      dayArray: da,
      dayIndex: di,
      timeArray: this.data.fullTimeArray
    })
    this.judgeDisable()
  },

  judgeDisable: function () {
    if (
      this.data.name.trim().length > 0 &&
      /^1\d{10}$/.test(this.data.tel || '') &&
      !this.data.dateDis &&
      /^\d+$/.test(String(this.data.counts || '')) &&
      Number(this.data.counts) > 0 &&
      this.data.timeArray.length > 0
    ) {
      this.setData({
        disabled: false
      })
    } else {
      this.setData({
        disabled: true
      })
    }
  },

  onPullDownRefresh: function () {
    this.loadPageData()
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})
