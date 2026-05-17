// pages/showqr/showqr.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js")
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
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
    backend: {},
    canOfflinePermission: false,
    canVisitorManage: false
  },
  onReady: function () {
    setTimeout(function () { flag = true }, 500)
    //flag=true
    //setTimeout(function(){flag = true}, 2000)
  },
  onShow: function (options) {
    var that = this
    timeflag = true
    that.setData(appService.getPermissionPageConfig(that.data.thisCourtID || app.thisCourt?.f_id))
    if (this.shouldUseDebugQr()) {
      const court = featureMock.getDebugCourts()[0]
      this.setData({
        courts: featureMock.getDebugCourts(),
        index: '0',
        thisCourtName: court.GroupName,
        thisCourtID: court.f_id,
        hideCanvas: false,
        backend: {
          f_validity: '2026-12-31 00',
          f_cardMsg: 'DEBUG'
        }
      })
      QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', 200, 200);
      return
    }
    util.refreshUserInfoOnTabShow(function () {
      that.setData(appService.getPermissionPageConfig(that.data.thisCourtID || app.thisCourt?.f_id))
      if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
        clearTimeout(timer)
        that.setData({
          courts: [],
          thisCourtName: '',
          thisCourtID: '',
          hideCanvas: true,
          backend: {},
          canOfflinePermission: false,
          canVisitorManage: false
        })
        return
      }
      that.loadLatestQrData()
    })
  },
  loadLatestQrData: function () {
    var that = this
    const loadPageData = function () {
      var user = app.globalData.userInfo
      if (user == null || user.f_UnionID == '') {
        if (that.shouldUseDebugQr()) {
          const court = featureMock.getDebugCourts()[0]
          that.setData({
            courts: featureMock.getDebugCourts(),
            index: '0',
            thisCourtName: court.GroupName,
            thisCourtID: court.f_id,
            hideCanvas: false,
            backend: {
              f_validity: '2026-12-31 00',
              f_cardMsg: 'DEBUG'
            }
          })
          QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', 200, 200);
        }
        return;
      }

      const stored = util.getStoredCourtState()
      if (!stored.currentCourt) {
        util.noticeArea('index')
        return
      }
      that.setData({
        courts: stored.groups,
        index: stored.index,
        thisCourtName: stored.currentCourt.GroupName,
        thisCourtID: stored.currentCourt.f_id
      })
      that.drawQR(that.data.thisCourtID, true)
    }
    if (!util.getStoredUserInfo() || !app.globalData.isRegisted) {
      util.refreshUserInfo(function () {
        loadPageData()
      }, true)
      return
    }
    if (!util.getStoredCourtState().currentCourt) {
      util.refreshCourtList(function () {
        loadPageData()
      })
      return
    }
    loadPageData()
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
    this.loadLatestQrData()
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000)
  },
  selectcourt: function (e) {
    var index = e.detail.value
    var that = this
    clearTimeout(timer)
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id,
      groupindex: index,
      hideCanvas: false,
      index: index
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(that.data.courts[index], Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = that.data.courts[index]
    }
    that.drawQR(that.data.thisCourtID, true)
  },
  drawQR: function (courtID, force = false) {
    var that = this
    clearTimeout(timer)
    const renderQr = function (res) {
      const backendInfo = res && res.Status == 'success'
        ? (appService.getBackEndUserInfo(courtID) || res)
        : (res || {})
      that.setData(appService.getPermissionPageConfig(courtID))
      if (backendInfo.Status == 'success') {
        if (!that.data.canOfflinePermission) {
          that.setData({
            hideCanvas: true,
            backend: backendInfo
          })
          return
        }
        if (backendInfo.f_cardMsg != '' && backendInfo.f_cardMsg != null) {
          that.setData({ backend: backendInfo })
          var date = new Date()
          var content = 'Time:' + ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2) + ',Type:A1,Value:' + backendInfo.f_cardMsg
          /*wx.setScreenBrightness({
            value: 0.8,
          })*/
          console.log(content);
          QR.api.draw(content, 'mycanvas', 200, 200);
          if (!that.data.hideCanvas && timeflag) {
            timer = setTimeout(function () {
              if (!that.data.hideCanvas && timeflag) {
                that.drawQR(that.data.thisCourtID, true)
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
      } else if (that.shouldUseDebugQr()) {
        that.setData({
          hideCanvas: false,
          backend: {
            f_validity: '2026-12-31 00',
            f_cardMsg: 'DEBUG'
          }
        })
        QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', 200, 200);
      } else {
        util.notice('获取权限码失败', res.Result)
      }
    }
    const cachedBackEndUserInfo = !force ? util.getStoredBackEndUserInfo({
      courtId: courtID
    }) : null
    if (cachedBackEndUserInfo && cachedBackEndUserInfo.Status == 'success') {
      renderQr(cachedBackEndUserInfo)
      return
    }
    util.refreshBackEndUserInfo(renderQr, {
      courtId: courtID,
      force: !!force
    })
  },
  shouldUseDebugQr: function () {
    return featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId
  },
  gotoshareqr: function () {
    if (flag) {
      flag = false
      setTimeout(function () { flag = true }, 1000)
      const backendInfo = this.data.backend || {}
      if (!backendInfo.f_validity || !backendInfo.f_cardMsg) {
        util.notice('获取权限码失败', '访客二维码参数无效')
        return
      }
      if (new Date() > new Date((backendInfo.f_validity || '').replace(/-/g, '/') + ':00:00')) {
        wx.showModal({
          content: '您的权限已过期',
          showCancel: false
        })
        return
      }
      wx.navigateTo({
        url: '/pages/shareqr/shareqr?val=' + backendInfo.f_validity + '&msg=' + backendInfo.f_cardMsg,
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
