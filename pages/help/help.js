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
    if (!util.getStoredUserInfo()) {
      util.refreshUserInfo(null, false)
    }
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
    util.ensureCourtState(function (stored) {
      if (!stored.groups.length) {
        util.noticeArea('index')
        return
      }
      const index = stored.groups[that.data.groupindex] ? that.data.groupindex : stored.index
      const currentCourt = stored.groups[index] || stored.currentCourt || {}
      if (typeof app.setCurrentCourt === 'function') {
        app.setCurrentCourt(currentCourt, index)
      } else {
        app.globalData.courtindex = index
        app.thisCourt = currentCourt
      }
      that.setData({
        courts: stored.groups,
        thisCourtName: currentCourt.GroupName,
        thisCourtID: currentCourt.f_id,
        index: index,
        groupindex: index
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
    }, {
      goRegist: false
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
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(that.data.courts[index], Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = that.data.courts[index]
    }
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
