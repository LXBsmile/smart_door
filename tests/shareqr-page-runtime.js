const assert = require('assert')

const RealDate = Date
const realRandom = Math.random
let pageDefinition = null
let modalOptions = null
let navigateBackCount = 0

class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length) {
      super(...args)
      return
    }
    super('2026-07-31T23:50:00+08:00')
  }
}

const app = {
  globalData: {
    userInfo: {
      f_Tel: '13800138000'
    }
  }
}

global.Date = FixedDate
Math.random = function () {
  return 0
}
global.getApp = function () {
  return app
}
global.Page = function (definition) {
  pageDefinition = definition
}
global.wx = {
  getSystemInfoSync: function () {
    return {
      windowWidth: 375,
      windowHeight: 667
    }
  },
  showModal: function (options) {
    modalOptions = options
  },
  navigateBack: function () {
    navigateBackCount++
  }
}

try {
  const QR = require('../utils/qrcode.js')
  let drawCall = null
  QR.api.draw = function (content, canvasId, width, height, offset, callback) {
    drawCall = {
      content: content,
      canvasId: canvasId,
      width: width,
      height: height,
      offset: offset
    }
    callback()
  }

  require('../pages/cardshareqr/cardshareqr.js')
  assert.ok(pageDefinition)
  assert.strictEqual(pageDefinition.data.hour, 0)
  assert.strictEqual(pageDefinition.data.min, 10)
  assert.strictEqual(pageDefinition.data.max_height, 200)

  const page = Object.assign({}, pageDefinition, {
    data: Object.assign({}, pageDefinition.data),
    setData: function (update) {
      Object.assign(this.data, update)
    },
    drawCanvasText: function () {
      this.canvasTextDrawn = true
    }
  })

  page._getVDate()
  assert.strictEqual(page.data.vdate, '2026/08/01 00:00')

  page.setData({
    hour: 1,
    min: 20
  })
  page._getVDate()
  assert.strictEqual(page.data.vdate, '2026/08/01 01:10')

  page.createCustomQR()
  assert.ok(drawCall.content.startsWith('FF66'))
  assert.match(drawCall.content, /^FF66[0-9A-F]{32}$/)
  assert.strictEqual(drawCall.canvasId, 'mycanvas1')
  assert.strictEqual(drawCall.width, 150)
  assert.strictEqual(drawCall.height, 150)
  assert.strictEqual(drawCall.offset.x, 113)
  assert.strictEqual(drawCall.offset.y, 0)
  assert.strictEqual(drawCall.offset.border_width, 1000)
  assert.strictEqual(page.canvasTextDrawn, true)
  assert.strictEqual(page.data.qrReady, true)

  app.globalData.userInfo.f_Tel = ''
  page.setData({
    invalidPhoneHandled: false
  })
  page.createCustomQR()
  assert.strictEqual(page.data.invalidPhoneHandled, true)
  assert.strictEqual(page.data.qrReady, false)
  assert.strictEqual(modalOptions.showCancel, false)
  modalOptions.complete()
  assert.strictEqual(navigateBackCount, 1)

  console.log('PASS: cardshareqr page defaults, expiry display, drawing and phone guard.')
} finally {
  global.Date = RealDate
  Math.random = realRandom
  delete global.getApp
  delete global.Page
  delete global.wx
}
