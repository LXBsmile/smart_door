const app = getApp()
const util = require('../../utils/util')
const QR = require('../../utils/qrcode.js')

const HEADER = 'FF66'
const VISITOR_QR_SIZE = 150
const CANVAS_TEXT_HEIGHT = 50
const CANVAS_CLEAR_WIDTH = 1000
const info = wx.getSystemInfoSync()

Page({
  data: {
    hour: 0,
    min: 10,
    vdate: '',
    max_height: VISITOR_QR_SIZE + CANVAS_TEXT_HEIGHT,
    qr_width: VISITOR_QR_SIZE + 100,
    qr_height: Math.max(info.windowHeight - 100, VISITOR_QR_SIZE + CANVAS_TEXT_HEIGHT),
    previewImage: false,
    qrReady: false,
    invalidPhoneHandled: false
  },

  onShow: function () {
    if (this.data.invalidPhoneHandled) return
    this._getVDate()
    this.createCustomQR()
  },

  onHide: function () {
    if (!this.data.previewImage && !this.data.invalidPhoneHandled) {
      wx.navigateBack({})
    }
  },

  getVisitorPhone: function () {
    const phone = String(app.globalData.userInfo?.f_Tel || '').trim()
    return /^\d+$/.test(phone) ? phone : ''
  },

  handleInvalidPhone: function () {
    if (this.data.invalidPhoneHandled) return
    this.setData({
      invalidPhoneHandled: true,
      qrReady: false
    })
    wx.showModal({
      title: '提示',
      content: '手机号无效，无法生成访客二维码',
      showCancel: false,
      complete: function () {
        wx.navigateBack({
          delta: 1
        })
      }
    })
  },

  createCustomQR: function () {
    const phone = this.getVisitorPhone()
    if (!phone) {
      this.handleInvalidPhone()
      return
    }

    this._getVDate()
    const qrContent = util.getCustomQRCodeContentForDoor(parseInt(phone), {
      min: this.data.min,
      hour: this.data.hour
    })
    if (!qrContent) {
      this.handleInvalidPhone()
      return
    }

    const content = HEADER + util.encodeForDoorQR(qrContent)
    const that = this
    QR.api.draw(content, 'mycanvas1', VISITOR_QR_SIZE, VISITOR_QR_SIZE, {
      x: Math.round((info.windowWidth - VISITOR_QR_SIZE) / 2),
      y: 0,
      border_width: CANVAS_CLEAR_WIDTH
    }, function () {
      that.drawCanvasText()
      that.setData({
        qrReady: true
      })
    })
  },

  drawCanvasText: function () {
    const context = wx.createCanvasContext('mycanvas1')
    context.setTextAlign('center')
    context.setTextBaseline('top')
    context.setFillStyle('#000')
    context.setFontSize(10)
    context.fillText('有效时间至:' + this.data.vdate, Math.round(info.windowWidth / 2), VISITOR_QR_SIZE - 12)
    this.drawTxt({
      context: context,
      x: Math.round(info.windowWidth / 2),
      y: VISITOR_QR_SIZE,
      maxWidth: VISITOR_QR_SIZE,
      scale: 1,
      fontSize: 10,
      text: '出示本二维码，由10CM以上距离慢慢靠近摄像头。'
    })
    context.draw(true)
  },

  drawTxt: function ({
    context,
    scale = 1,
    text = 'test text',
    fillStyle = '#000',
    broken = true,
    ...rest
  }) {
    if (!context) throw Error('请传入绘制上下文环境context')
    const origin = {
      x: 0,
      y: 0,
      lineHeight: 12,
      maxWidth: 630,
      fontSize: 28
    }

    for (const item in rest) {
      rest[item] *= scale
    }

    let {
      x,
      y,
      lineHeight,
      maxWidth,
      fontSize
    } = {
      ...origin,
      ...rest
    }

    context.setTextAlign('center')
    context.setTextBaseline('top')
    context.setFillStyle(fillStyle)
    context.setFontSize(fontSize)

    const splitChar = broken ? '' : ' '
    const arrText = text.split(splitChar)
    let line = ''
    let linesCount = 0

    for (let n = 0; n < arrText.length; n++) {
      const testLine = line + arrText[n] + splitChar
      const testWidth = context.measureText(testLine).width
      if (testWidth > maxWidth && n > 0) {
        linesCount++
        context.fillText(line, x, y)
        line = arrText[n] + splitChar
        y += lineHeight
      } else {
        line = testLine
      }
    }

    linesCount++
    context.fillText(line, x, y)
    return linesCount * lineHeight
  },

  showQR: function () {
    if (!this.data.qrReady || this.data.previewImage) return
    const that = this
    this.setData({
      previewImage: true
    })

    const timer = setTimeout(function () {
      wx.canvasToTempFilePath({
        canvasId: 'mycanvas1',
        fileType: 'jpg',
        quality: 1,
        success: function (res) {
          wx.previewImage({
            current: res.tempFilePath,
            urls: [res.tempFilePath],
            complete: function () {
              clearTimeout(timer)
              setTimeout(function () {
                that.setData({
                  previewImage: false
                })
              }, 500)
            }
          })
        },
        fail: function () {
          clearTimeout(timer)
          that.setData({
            previewImage: false
          })
          wx.showToast({
            title: '转换失败',
            icon: 'none',
            duration: 2000
          })
        }
      })
    }, 160)
  },

  _getVDate: function () {
    const date = new Date()
    const hour = Number(this.data.hour) || 0
    const min = Number(this.data.min) || 0
    if (min) {
      date.setMinutes(date.getMinutes() + min)
    }
    if (hour) {
      date.setHours(date.getHours() + hour)
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const expiryHour = String(date.getHours()).padStart(2, '0')
    const expiryMin = String(date.getMinutes()).padStart(2, '0')
    this.setData({
      vdate: year + '/' + month + '/' + day + ' ' + expiryHour + ':' + expiryMin
    })
  },

  changeHour: function (event) {
    this.setData({
      hour: event.detail.value
    })
    this._getVDate()
  },

  changeMin: function (event) {
    this.setData({
      min: event.detail.value
    })
    this._getVDate()
  }
})

