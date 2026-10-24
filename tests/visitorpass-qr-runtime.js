const assert = require('assert')
const Module = require('module')

let pageDefinition = null
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request.indexOf('utils/qrcode.js') !== -1) {
    return { api: { draw: function () {} } }
  }
  if (request.indexOf('utils/featureMock') !== -1) {
    return { getVisitorPassGuideLines: function () { return [] } }
  }
  if (request.indexOf('utils/services/appService') !== -1) {
    return { getVisitorPassDetail: function () { return null } }
  }
  return originalLoad.call(this, request, parent, isMain)
}
global.Page = function (definition) {
  pageDefinition = definition
}

try {
  require('../pages/visitorpass/visitorpass.js')
  assert.ok(pageDefinition)

  const content = pageDefinition.buildQrContent({
    expireTime: '2026-07-17 23:59',
    qrType: 'A8',
    password: '41471'
  })
  assert.strictEqual(content, 'Time:2607172359,Type:A8,Value:041471')

  assert.strictEqual(pageDefinition.getQrTime({
    expireTime: '2026年07月17日 23时59分'
  }), '2607172359')
  assert.strictEqual(pageDefinition.getQrTime({
    validity: '202607172359'
  }), '2607172359')
  assert.strictEqual(pageDefinition.getQrTime({
    raw: {
      f_validity: '2026-07-17 23:59:00'
    }
  }), '2607172359')
  assert.strictEqual(pageDefinition.getQrTime({
    validity: '2607172359'
  }), '2607172359')
  assert.strictEqual(pageDefinition.getQrTime({
    validity: '2026071723'
  }), '2607172300')
  console.log('PASS: visitor pass QR uses the record expiry time.')
} finally {
  Module._load = originalLoad
  delete global.Page
}
