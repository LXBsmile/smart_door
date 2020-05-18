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