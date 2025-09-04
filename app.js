var util = require('./utils/util')
const config = require('./config.js')
App({
  onLaunch: function () {
    var _this = this;
    wx.getNetworkType({
      success: function (res3) {
        _this.globalData.offline = res3.networkType == "none";
      }
    });
    //初始化网络状态 
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
    wx.onNetworkStatusChange(function (res) {
      _this.globalData.offline = !res.isConnected;
      _this.globalData.networkType = res.networkType;
    })
  },
  onHide: function () {
    var self = this
    wx.setStorage({
      key: 'store',
      data: {
        courtindex: self.globalData.courtindex,
        thisCourt: self.thisCourt,
        openId: self.globalData.openId
      }
    })
  },
  onShow: function () {
    var self = this
    const res2 = wx.getStorageSync('store');
    self.globalData.courtindex = res2.courtindex;
    self.globalData.openId = res2.openId;
    self.thisCourt = res2.thisCourt;
  },
  globalData: {
    isRegisted: false,//是否已经注册过
    userInfo: null,//我的账户信息
    openId: null,//我的openid
    groups: null,
    courtindex: 0,
    offline: false,
    networkType: "4g"
  },
  getConfig() {
    return config;
  },
  clearData() {
    this.globalData = {
      isRegisted: false,//是否已经注册过
      userInfo: null,//我的账户信息
      openId: null,//我的openid
      groups: null,
      courtindex: 0,
      offline: false,
      networkType: "4g"
    }
    wx.clearStorageSync();
  },
  thisCourt: {}
})
