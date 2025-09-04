// pages/keyslist/keyslist.js
const util = require('../../utils/util')
const app = getApp()
Page({
  data: {
    courts: [],
    thisCourtName: '',
    keys: [],
    thisCourtID: '',
    index: '0'
  },
  onShow: function () {
    util.refreshUserInfo()
    var that = this
    var user = app.globalData.userInfo
    util.getJson('GetCourts', {}, function (res) {
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
          thisCourtName: res.Groups[app.globalData.courtindex].GroupName,
          thisCourtID: res.Groups[app.globalData.courtindex].f_id,
          index: app.globalData.courtindex
        })
        that.getKeyList()
      } else {
        util.notice('加载小区信息失败', res.Result)
      }

    })

  },
  onPullDownRefresh: function () {
    this.getKeyList()
  },
  selectcourt: function (e) {
    var index = e.detail.value
    var that = this
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id
    })
    app.globalData.courtindex = index
    util.getJson('KeyList', {
      'CourtID': that.data.courts[index].f_id
    }, function (res2) {
      if (res2.Status == 'success') {
        that.setData({
          keys: res2.Keys
        })
      } else {
        util.notice('加载钥匙列表失败', res2.Result)
      }
    })

  },
  unlock: function (e) {
    var that = this
    if (app.globalData.offline) {
      wx.showModal({
        title: '无网络',
        content: '无网络，请连接网络后再试！',
      })
      return;
    }
    util.getJson('OpenDoorInSmallApp', {
      "Devid": e.target.id,
      "CourtID": this.data.thisCourtID,
      OperationCode: 'PRE-DEDUCT'
    }, function (res) {
      if (res.Status == 'success') {
        if (res.Code == 'SHOWDEDUCTTIP') {
          wx.showModal({
            title: `提示`,
            content: `本次需要扣费${res.Deduction}元，确认是否执行?`,
            success(res2) {
              if (res2.confirm) {
                util.getJson('OpenDoorInSmallApp', {
                  "Devid": e.target.id,
                  "CourtID": that.data.thisCourtID,
                  OperationCode: ''
                }, function (res3) {
                  if (res3.Status == 'success') {
                    wx.showToast({
                      title: '开门成功',
                      mask: true,
                      duration: 1500
                    })
                  } else {
                    util.notice('开门失败', res3.Result)
                  }
                })
              } else {

              }
            }
          })
        } else {
          wx.showToast({
            title: '开门成功',
            mask: true,
            duration: 1500
          })
        }

      } else {
        util.notice('开门失败', res.Result)
      }
    })
  },
  getKeyList: function () {
    var that = this
    util.getJson('KeyList', {
      'CourtID': that.data.thisCourtID
    }, function (res2) {
      if (res2.Status == 'success') {
        that.setData({
          keys: res2.Keys
        })
      } else {
        util.notice('加载钥匙列表失败', res2.Result)
      }
      wx.stopPullDownRefresh()
    })
  }
})