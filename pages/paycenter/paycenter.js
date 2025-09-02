// pages/paycenter/paycenter.js
const app = getApp()
const util = require('../../utils/util')
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
    validity: ''
  },
  onLoad: function (options) {
    var that = this
    var user = app.globalData.userInfo
    util.getJson('GetCourts', {}, function (res) {
      if (res.Status == 'success') {
        if (res.Groups.length < 1) {
          util.noticeArea('index');
          return
        }
        if (!res.Groups[app.globalData.courtindex]) {
          app.globalData.courtindex = 0
        }
        that.setData({
          courts: res.Groups,
          thisCourtName: res.Groups[app.globalData.courtindex].GroupName,
          thisCourtID: res.Groups[app.globalData.courtindex].f_id,
          index: app.globalData.courtindex
        })
        that.getMoney()
      } else {
        util.notice('加载小区信息失败', res.Result)
      }
    })
  },
  onReady: function () {
  },
  onShow: function () {
    util.refreshUserInfo()
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
    app.globalData.courtindex = index
    that.getMoney()
  },
  getMoney: function () {
    var that = this
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
    var that = this
    wx.navigateTo({
      url: '/pages/charge/charge?courtid=' + that.data.thisCourtID + '&courtname=' + that.data.thisCourtName,
    })
  },
  gotodelay: function () {
    var that = this
    wx.navigateTo({
      url: '/pages/chargedelay/chargedelay?courtid=' + that.data.thisCourtID + '&courtname=' + that.data.thisCourtName,
    })
  }
})