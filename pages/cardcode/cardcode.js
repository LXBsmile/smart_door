const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js")
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
const config = require('../../config.js')
var timer = 0
var HEADER = 'FF55'

Page({
  data: {
    thisCourtName: '',
    thisCourtID: '',
    hideCanvas: true,
    show: false,
    qr_width: config.APP_CONFIG.QR_WIDTH,
    qr_height: config.APP_CONFIG.QR_HEIGHT,
    canCardCode: false,
    canVisitorManage: false,
    debugOpen: featureMock.DEBUG_OPEN_PERMISSION,
    backend: {},
    previewingQR: false
  },
  ensureFeatureLogin: function () {
    if (this.shouldUseDebugQr()) {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    if (app.globalData.isRegisted && util.isRegisteredUser(app.globalData.userInfo)) {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    clearInterval(timer)
    this.setData({
      thisCourtName: '',
      thisCourtID: '',
      hideCanvas: true,
      show: false,
      canCardCode: false,
      canVisitorManage: false
    })
    util.scheduleFeatureLoginPrompt(this)
    return false
  },
  onShow: function () {
    if (!this.ensureFeatureLogin()) {
      return
    }
    var that = this
    const selectedCourt = app.thisCourt && app.thisCourt.f_id ? app.thisCourt : null
    that.setData(appService.getCardPageConfig(that.data.thisCourtID || selectedCourt?.f_id))
    if (that.shouldUseDebugQr()) {
      const court = selectedCourt || featureMock.getDebugCourts()[0]
      that.setData({
        thisCourtName: court.GroupName,
        thisCourtID: court.f_id,
        hideCanvas: false,
        show: true,
        backend: {
          f_validity: '2026-12-31 00',
          f_cardMsg: 'DEBUG'
        }
      })
      QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', that.data.qr_width, that.data.qr_height)
      return
    }
    that.setData({
      hideCanvas: true,
      show: false
    })
    that.loadLatestQrData()
  },
  loadLatestQrData: function () {
    var that = this
    const selectedCourt = app.thisCourt && app.thisCourt.f_id ? app.thisCourt : null
    const loadPageData = function () {
      var user = app.globalData.userInfo
      if (user == null || user.f_UnionID == '') {
        if (that.shouldUseDebugQr()) {
          const court = selectedCourt || featureMock.getDebugCourts()[0]
          that.setData({
            thisCourtName: court.GroupName,
            thisCourtID: court.f_id,
            hideCanvas: false,
            show: true
          })
          QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', that.data.qr_width, that.data.qr_height)
        } else {
          clearInterval(timer)
          that.setData({
            hideCanvas: true,
            show: false
          })
        }
        return
      }
      const stored = util.getStoredCourtState()
      if (!stored.currentCourt) {
        clearInterval(timer)
        that.setData({
          hideCanvas: true,
          show: false
        })
        util.noticeArea('index')
        return
      }
      that.setData({
        thisCourtName: stored.currentCourt.GroupName,
        thisCourtID: stored.currentCourt.f_id
      })
      that.loadCardPermission(that.data.thisCourtID, true)
    }
    if (!util.getStoredUserInfo() || !app.globalData.isRegisted) {
      util.refreshUserInfo(function () {
        loadPageData()
      }, false)
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
  onPullDownRefresh: function () {
    if (!this.ensureFeatureLogin()) {
      wx.stopPullDownRefresh()
      return
    }
    clearInterval(timer)
    if (this.shouldUseDebugQr()) {
      this.setData({
        hideCanvas: false,
        show: true
      })
      QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', this.data.qr_width, this.data.qr_height)
      setTimeout(function () {
        wx.stopPullDownRefresh()
      }, 1000)
      return
    }
    this.loadLatestQrData()
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000)
  },
  loadInterval: function () {
    clearInterval(timer)
    this.loadQRCode()
    timer = setInterval(() => {
      this.loadQRCode()
    }, config.APP_CONFIG.INTERVAL_TIME)
  },
  loadQRCode: function () {
    var user = app.globalData.userInfo || {}
    if (!this.data.canCardCode && !this.shouldUseDebugQr()) {
      this.setData({
        hideCanvas: true,
        show: false
      })
      return
    }
    if (this.shouldUseDebugQr()) {
      QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', this.data.qr_width, this.data.qr_height)
      this.setData({
        hideCanvas: false,
        show: true
      })
      return
    }
    if (!user.f_Tel) {
      this.setData({
        hideCanvas: true,
        show: false
      })
      return
    }
    var content = util.getQRCodeContentForDoor(parseInt(user.f_Tel))
    if (!content) {
      this.setData({
        hideCanvas: true,
        show: false
      })
      return
    }
    content = HEADER + util.encodeForDoorQR(content)
    QR.api.draw(content, 'mycanvas', this.data.qr_width, this.data.qr_height)
    this.setData({
      hideCanvas: false,
      show: true
    })
  },
  loadCardPermission: function (courtID, force = false) {
    var that = this
    const renderQr = function (res) {
      const backendInfo = res && res.Status == 'success'
        ? (appService.getBackEndUserInfo(courtID) || res)
        : (res || {})
      that.setData(Object.assign({
        backend: backendInfo
      }, appService.getCardPageConfig(courtID)))
      if (backendInfo.Status == 'success') {
        if (!that.data.canCardCode) {
          clearInterval(timer)
          that.setData({
            hideCanvas: true,
            show: false
          })
          return
        }
        that.loadInterval()
      } else if (that.shouldUseDebugQr()) {
        that.setData({
          hideCanvas: false,
          show: true,
          backend: {
            f_validity: '2026-12-31 00',
            f_cardMsg: 'DEBUG'
          }
        })
        QR.api.draw(featureMock.getDebugQrContent('A1'), 'mycanvas', that.data.qr_width, that.data.qr_height)
      } else {
        clearInterval(timer)
        that.setData({
          hideCanvas: true,
          show: false
        })
        util.notice('获取卡号码失败', backendInfo.Result)
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
  gotoVisitorManage: function () {
    wx.navigateTo({
      url: '/pages/cardshareqr/cardshareqr'
    })
  },
  showQR: function () {
    if (!this.data.show || this.data.previewingQR) return
    this.setData({ previewingQR: true })
    var that = this
    setTimeout(function () {
      wx.canvasToTempFilePath({
        canvasId: 'mycanvas',
        fileType: 'jpg',
        quality: 1,
        success: function (res) {
          wx.previewImage({
            current: res.tempFilePath,
            urls: [res.tempFilePath],
            complete: function () {
              that.setData({ previewingQR: false })
            }
          })
        },
        fail: function () {
          that.setData({ previewingQR: false })
          wx.showToast({
            title: '转换失败',
            icon: 'none'
          })
        }
      })
    }, 160)
  },
  onHide: function () {
    clearInterval(timer)
    util.clearFeatureLoginPrompt(this)
  },
  onUnload: function () {
    clearInterval(timer)
    util.clearFeatureLoginPrompt(this)
  }
})
