const appService = require('../../utils/services/appService')
const util = require('../../utils/util')

Page({
  data: {
    devid: '',
    courtId: '',
    devName: '',
    openMode: false
  },
  onLoad: function (options) {
    const devid = options.devid || ''
    const courtId = options.courtid || ''
    const devName = this.decodeText(options.devname)
    const result = appService.getDoorControl(devid, courtId, devName)
    this.setData({
      devid: devid,
      courtId: courtId,
      devName: devName,
      openMode: !!result.OpenMode
    })
  },
  decodeText: function (value) {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  },
  setOpenMode: function (e) {
    this.setData({
      openMode: e.currentTarget.dataset.value === 'true'
    })
  },
  submit: function () {
    appService.saveDoorControl({
      devid: this.data.devid,
      courtId: this.data.courtId,
      f_devName: this.data.devName,
      openMode: this.data.openMode
    }).then(function () {
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      })
      setTimeout(function () {
        wx.navigateBack({
          delta: 1
        })
      }, 600)
    }).catch(function (result) {
      util.notice('保存失败', (result && result.Result) || '')
    })
  }
})
