const QR = require("../../utils/qrcode.js")
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')

const PREVIEW_HEIGHT = 640

Page({
  data: {
    detail: null,
    guideLines: featureMock.getVisitorPassGuideLines(),
    previewMode: false,
    previewHeight: PREVIEW_HEIGHT,
    qrReady: false
  },

  onLoad: function (options) {
    const detail = appService.getVisitorPassDetail(options.id)
    this.setData({
      detail: detail
    })
  },

  onReady: function () {
    if (!this.data.detail) return
    const content = this.buildQrContent(this.data.detail)
    QR.api.draw(content, 'mycanvas', 200, 200, null, () => {
      this.setData({
        qrReady: true
      })
    })
  },

  buildQrContent: function (detail) {
    const date = new Date()
    const time =
      ('00' + date.getFullYear()).substr(-2) +
      ('00' + (date.getMonth() + 1)).substr(-2) +
      ('00' + date.getDate()).substr(-2) +
      ('00' + date.getHours()).substr(-2) +
      ('00' + date.getMinutes()).substr(-2)
    return 'Time:' + time + ',Type:' + (detail.qrType || 'A8') + ',Value:' + this.formatQrPassword(detail.password)
  },

  formatQrPassword: function (password) {
    const value = String(password || '').trim()
    if (!value) return ''
    return value.length < 6 ? value.padStart(6, '0') : value
  },

  showQR: function () {
    if (!this.data.qrReady || this.data.previewMode || !this.data.detail) return
    this.setData({
      previewMode: true
    })
    this.drawPreviewQR()
  },

  drawPreviewQR: function () {
    const detail = this.data.detail
    const content = this.buildQrContent(detail)
    QR.api.draw(content, 'previewCanvas', 200, PREVIEW_HEIGHT, {
      x: 60,
      y: 30,
      border_width: 320
    }, () => {
      const context = wx.createCanvasContext('previewCanvas')
      context.setTextAlign('center')
      context.setTextBaseline('top')

      context.setFillStyle('#666')
      context.setFontSize(13)
      context.fillText('截止时间', 160, 255)
      context.setFillStyle('#111')
      context.setFontSize(13)
      context.fillText(String(detail.expireTime || ''), 160, 276)

      context.setFillStyle('#666')
      context.setFontSize(13)
      context.fillText('临时密码', 160, 312)
      context.setFillStyle('#111')
      context.setFontSize(20)
      context.fillText(String(detail.password || ''), 160, 333)

      context.setFillStyle('#666')
      context.setFontSize(13)
      context.fillText('有效次数', 160, 372)
      context.setFillStyle('#111')
      context.setFontSize(13)
      context.fillText(String(detail.useCount || '') + '次', 160, 393)

      context.draw(true, () => {
        setTimeout(() => {
          this.previewQRImage()
        }, 160)
      })
    })
  },

  previewQRImage: function () {
    wx.canvasToTempFilePath({
      canvasId: 'previewCanvas',
      fileType: 'jpg',
      quality: 1,
      success: (res) => {
        wx.previewImage({
          current: res.tempFilePath,
          urls: [res.tempFilePath],
          complete: () => {
            this.resetQRCanvas()
          }
        })
      },
      fail: () => {
        this.resetQRCanvas()
        wx.showToast({
          title: '转换失败',
          icon: 'none'
        })
      }
    })
  },

  resetQRCanvas: function () {
    this.setData({
      previewMode: false
    })
  }
})
