// pages/showqr/showqr.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js")
var timeflag = false
var timer
var flag = false
Page({
  data: {
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index: '0',
    bright: 0.3,
    hideCanvas: false,
    backend: {}
  },
  onReady: function () {
    setTimeout(function () { flag = true }, 500)
    //flag=true
    //setTimeout(function(){flag = true}, 2000)
  },
  onShow: function (options) {
    timeflag = true
    util.refreshUserInfo(() => {
      var that = this
      var user = app.globalData.userInfo
      if (user == null || user.f_UnionID == '') {
        return;
      }

      var courts = util.getJson('GetCourts', {}, function (res) {
        if (res.Status == 'success') {
          if (res.Groups.length < 1) {
            util.noticeArea('index')
            return
          }
          if (!res.Groups[app.globalData.courtindex]) {
            app.globalData.courtindex = 0
          }
          that.setData({
            courts: res.Groups,
            index: app.globalData.courtindex
          })
          that.setData({
            thisCourtName: res.Groups[app.globalData.courtindex].GroupName,
            thisCourtID: res.Groups[app.globalData.courtindex].f_id
          })
          that.drawQR(that.data.thisCourtID)
        } else {
          util.notice('加载小区信息失败', res.Result)
        }
      })
    });


  },
  onUnload: function () {
    /*var that=this
    that.setData({
      hideCanvas:true
    })*/
    clearTimeout(timer)
  },
  onHide: function () {
    timeflag = false
    clearTimeout(timer)
  },
  onPullDownRefresh: function () {
    clearTimeout(timer)
    this.drawQR(this.data.thisCourtID)
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
      index: app.globalData.courtindex,
      groupindex: index,
      hideCanvas: false,
      index: index
    })
    app.globalData.courtindex = index//记忆小区
    that.drawQR(that.data.thisCourtID)
  },
  drawQR: function (courtID) {
    var that = this
    util.getJson('GetBackEndUserInfo', { CourtID: courtID }, function (res) {
      if (res.Status == 'success') {
        if (res.f_cardMsg != '' && res.f_cardMsg != null) {
          that.setData({ backend: res })
          var date = new Date()
          var content = 'Time:' + ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2) + ',Type:A1,Value:' + res.f_cardMsg
          /*wx.setScreenBrightness({
            value: 0.8,
          })*/
          console.log(content);
          QR.api.draw(content, 'mycanvas', 200, 200);
          if (!that.data.hideCanvas && timeflag) {
            timer = setTimeout(function () {
              if (!that.data.hideCanvas && timeflag) {
                that.drawQR(that.data.thisCourtID)
              }
            }, 30000)
          }
        } else {
          that.setData({
            hideCanvas: true
          })
          /*util.notice('','抱歉，您没有权限!',function(e){
            wx.navigateBack({
              delta:-1
            })
          })*/
        }
      } else {
        util.notice('获取权限码失败', res.Result)
      }
    })
  },
  gotoshareqr: function () {
    if (flag) {
      flag = false
      setTimeout(function () { flag = true }, 1000)
      if (new Date() > new Date(this.data.backend.f_validity.replace(/-/g, '/') + ':00:00')) {
        wx.showModal({
          content: '您的权限已过期',
          showCancel: false
        })
        return
      }
      wx.navigateTo({
        url: '/pages/shareqr/shareqr?val=' + this.data.backend.f_validity + '&msg=' + this.data.backend.f_cardMsg,
      })
    }
  },
  switchtab1: function () {
    if (flag) {
      flag = false
      setTimeout(function () { flag = true }, 1000)
      wx.redirectTo({
        url: '/pages/index/index',
      })
    }
  },
  switchtab3: function () {
    if (flag) {
      flag = false
      setTimeout(function () { flag = true }, 1000)
      wx.redirectTo({
        url: '/pages/my/my',
      })
    }
  }
})