// pages/reg2/reg2.js
const app = getApp()
var util = require('../../utils/util')
Page({
  data: {
    id:0
  },
  onLoad: function (options) {
    var that=this
    that.setData({
      id: options.id
    })
  //每隔一秒刷新一下数据，如果有更新则跳到主页。
    var interval= setInterval(function(){
      util.getJson('GetUserInfo', { 'f_OpenID': app.globalData.openId }, function (res2) {
        wx.stopPullDownRefresh()
        if (res2.Status == 'success') {
           if (res2.User.f_UnionID != null && res2.User.f_UnionID != '') {
             clearInterval(interval);
             wx.reLaunch({
               url: '/pages/index/index',
             })
          }
        }
      })
    },1000)

  },
  onReady: function () {
    var that=this
    setTimeout(function(){
      app.globalData.userInfo = null
      wx.redirectTo({
        url: '/pages/index/index',
      })
    },10000)
  }
})