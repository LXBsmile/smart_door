var config = require('./config')
var util = require('./utils/util')
App({
  onLaunch: function () {
    /*wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.userInfo']) {
          wx.authorize({
            scope: 'scope.userInfo',
            success(){
            },
            fail(){
            },
            complete() {
            }
            })
          }
      },
      fail(err){
      }
    })*/
  },
  onHide: function () {
    var self = this
    wx.setStorage({
      key: 'store',
      data: {
        courtindex:self.globalData.courtindex,
        thisCourt:self.thisCourt,
        openId:self.globalData.openId
      }
    })
  },
  onShow:function(){
    var self= this
    wx.getStorage({
      key: 'store',
      success: function (res2) {
        self.globalData.courtindex = res2.data.courtindex,
        self.globalData.openId=res2.data.openId,
        self.thisCourt=res2.data.thisCourt
      }
    })
  },
  globalData: {
    userInfo: null,//我的账户信息
    openId:null,//我的openid
    courtindex:0,
    groups:null
  },
  thisCourt:{}
})
