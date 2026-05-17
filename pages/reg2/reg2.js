// pages/reg2/reg2.js
const app = getApp()
var util = require('../../utils/util')

Page({
  data: {
    id: 0
  },
  clearTimers: function () {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
    if (this._timeoutTimer) {
      clearTimeout(this._timeoutTimer)
      this._timeoutTimer = null
    }
  },
  finishLogin: function (user) {
    if (!util.isRegisteredUser(user)) {
      return false
    }

    util.activateUserSession(user.f_OpenID || app.globalData.openId, user)
    this.clearTimers()
    wx.reLaunch({
      url: '/pages/index/index',
    })
    return true
  },
  pollUserInfo: function () {
    var that = this
    util.getJson('GetUserInfo', { 'f_OpenID': app.globalData.openId }, function (res2) {
      wx.stopPullDownRefresh()
      if (res2 && res2.Status == 'success') {
        that.finishLogin(res2.User || null)
      }
    })
  },
  onLoad: function (options) {
    var that = this
    console.log('id', options.id)
    that.setData({
      id: options.id
    })

    that._pollTimer = setInterval(function () {
      that.pollUserInfo()
    }, 1000)

    that._timeoutTimer = setTimeout(function () {
      that.clearTimers()
      util.refreshUserInfo(function (user) {
        if (that.finishLogin(user)) {
          return
        }
        wx.redirectTo({
          url: '/pages/index/index',
        })
      }, false, true, true)
    }, 30000)
  },
  onUnload: function () {
    this.clearTimers()
  }
})
