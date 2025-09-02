// pages/help/help.js
const app = getApp()
const util = require('../../utils/util')
Page({
  data: {
    unit: '未知',
    tel: '未知',
    address: '未知',
    email: '未知',
    web: '未知',
    introduce: '未知',
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    groupindex: 0,
    index: '0'
  },
  onShow: function () {
    util.refreshUserInfo()
  },
  onReady: function (options) {
    var that = this
    that.setData({
      groupindex: app.globalData.courtindex,
      index: app.globalData.courtindex
    })
    that.getMyInfo()
  },
  onPullDownRefresh: function () {
    this.getMyInfo()
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000
    )
  },
  onReachBottom: function () {
  },
  onShareAppMessage: function () {
  },
  getMyInfo: function () {
    var that = this
    var user = app.globalData.userInfo
    var courts = util.getJson('GetCourts', {}, function (res) {
      if (res.Status == 'success') {
        if (res.Groups.length < 1) {
          util.noticeArea('index')
          return
        }
        if (!res.Groups[app.globalData.courtindex]) {
          app.globalData.courtindex = 0
        }
        var index = that.data.groupindex
        that.setData({
          courts: res.Groups,
          thisCourtName: res.Groups[index].GroupName,
          thisCourtID: res.Groups[index].f_id,
          index: app.globalData.courtindex
        })
        util.getJson('GetCourtByID', { 'CourtID': that.data.thisCourtID }, function (res2) {
          if (res2.Status == 'success') {
            that.setData({
              unit: res2.Group.f_unit,
              tel: res2.Group.f_tel,
              address: res2.Group.f_address,
              email: res2.Group.f_mail,
              web: res2.Group.f_Web,
              introduce: res2.Group.f_introduce
            })
          } else {
            util.notice('获取小区信息失败', res2.Result)
          }
        })
      } else {
        util.notice('加载小区信息失败', res.Result)
      }
    })
  },
  selectcourt: function (e) {
    var index = e.detail.value
    var that = this
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id,
      groupindex: index,
      index: index
    })
    app.globalData.courtindex = index//记忆小区
    util.getJson('GetCourtByID', { 'CourtID': that.data.thisCourtID }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          unit: res.Group.f_unit,
          tel: res.Group.f_tel,
          address: res.Group.f_address,
          email: res.Group.f_mail,
          web: res.Group.f_Web,
          introduce: res.Group.f_introduce
        })
      } else {
        util.notice('获取小区信息失败', res.Result)
      }
    })
  },
  getcourts: function () {
    return
    this.setData({
      courts: [{ "f_id": "19", "GroupName": "AAA示范小区" }, { "f_id": "29", "GroupName": "AAA示范2小区" }]
    })
  }
})