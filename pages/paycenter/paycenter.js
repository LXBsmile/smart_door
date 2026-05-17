// pages/paycenter/paycenter.js
const app = getApp()
const util = require('../../utils/util')
const appService = require('../../utils/services/appService')
Page({
  data: {
    thisCourtName: '',
    courts: [],
    thisCourtID: '',
    index: '0',
    uerNum: '',
    name: '',
    group: '',
    tel: '',
    money: '',
    validity: '',
    showBalance: false,
    showRecharge: false,
    showDelay: false
  },
  onLoad: function (options) {
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
      that.getMoney()
    })
  },
  onReady: function () {
  },
  onShow: function () {
    if (!util.getStoredUserInfo()) {
      util.refreshUserInfo()
    }
  },
  onHide: function () {
  },
  onUnload: function () {
  },
  onPullDownRefresh: function () {
    this.getMoney()
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000)
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
    that.getMoney()
  },
  getMoney: function () {
    var that = this
    const targetCourtId = String(that.data.thisCourtID || '').trim()
    const applyPageConfig = function () {
      const config = appService.getMyPageConfig(targetCourtId)
      that.setData({
        showBalance: !!config.showBalance,
        showRecharge: !!config.showRecharge,
        showDelay: !!config.showDelay
      })
    }
    applyPageConfig()
    util.requestCourtConfigurationInfo(targetCourtId, function () {
      if (String(that.data.thisCourtID || '') !== targetCourtId) return
      applyPageConfig()
    }, {
      showError: true
    })
    util.refreshBackEndUserInfo(function (res) {
      if (String(that.data.thisCourtID || '') !== String(res && res.CourtID || that.data.thisCourtID || '')) return
      applyPageConfig()
    }, {
      courtId: that.data.thisCourtID,
      showError: true
    })
    util.getJson('GetUserBalanceValidate', { CourtID: that.data.thisCourtID }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          uerNum: res.f_uerNum,
          name: res.f_name,
          group: res.f_group,
          tel: res.f_tel,
          money: res.f_money,
          validity: res.f_validity
        })
        util.getJson('CalculateExtendCourtFee', { Months: '1', CourtID: that.data.thisCourtID }, function (res) {
          if (res.Status == 'success') {
          } else {
            util.notice('获取费用信息失败', res.Result)
          }
        })
      } else {
        util.notice('获取余额失败', res.Result)
      }
    })
  },
  gotocharge: function () {
    if (!this.data.showRecharge) return
    var that = this
    wx.navigateTo({
      url: '/pages/charge/charge?courtid=' + that.data.thisCourtID + '&courtname=' + that.data.thisCourtName,
    })
  },
  gotodelay: function () {
    if (!this.data.showDelay) return
    var that = this
    wx.navigateTo({
      url: '/pages/chargedelay/chargedelay?courtid=' + that.data.thisCourtID + '&courtname=' + that.data.thisCourtName,
    })
  }
})
