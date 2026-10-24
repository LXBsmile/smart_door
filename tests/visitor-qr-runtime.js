const assert = require('assert')
const CryptoJS = require('CryptoJS/aes')
const util = require('../utils/util')

const RealDate = Date
const realRandom = Math.random

class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length) {
      super(...args)
      return
    }
    super('2026-07-31T23:50:00+08:00')
  }
}

global.Date = FixedDate
Math.random = function () {
  return 0
}

try {
  const phone = 13800138000
  const duration = {
    min: 20,
    hour: 1
  }
  const visitorContent = util.getCustomQRCodeContentForDoor(phone, duration)
  const directContent = util.getQRCodeContentForDoor(phone, 'A102', duration)

  assert.strictEqual(visitorContent, directContent)
  assert.strictEqual(visitorContent.slice(0, 4), 'A102')
  assert.strictEqual(visitorContent.slice(14, 24), '1A0801010A')
  assert.strictEqual(visitorContent.slice(24, 28), '0000')

  const payload = visitorContent.slice(4, -2)
  let checksum = parseInt(payload.slice(0, 2), 16)
  for (let index = 2; index < payload.length; index += 2) {
    checksum ^= parseInt(payload.slice(index, index + 2), 16)
  }
  checksum ^= 0x19
  assert.strictEqual(visitorContent.slice(-2), checksum.toString(16).padStart(2, '0').toUpperCase())

  const encrypted = util.encodeForDoorQR(visitorContent)
  assert.match(encrypted, /^[0-9A-F]{32}$/)
  const key = CryptoJS.enc.Utf8.parse('aabbccddeeffgghhiijjkkllmmnnoopp')
  const iv = CryptoJS.enc.Utf8.parse('aabbccddeeffgghh')
  const encryptedBase64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Hex.parse(encrypted))
  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  }).toString(CryptoJS.enc.Hex).toUpperCase()
  assert.strictEqual(decrypted, visitorContent)
  assert.strictEqual('FF66' + encrypted, ('FF66' + encrypted).toUpperCase())

  assert.strictEqual(util.getCustomQRCodeContentForDoor('', duration), '')
  console.log('PASS: visitor QR runtime protocol matches QROpen.')
} finally {
  global.Date = RealDate
  Math.random = realRandom
}
