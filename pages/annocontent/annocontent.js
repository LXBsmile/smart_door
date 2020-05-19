// pages/annocontent/annocontent.js
const util = require('../../utils/util')
Page({
  data: {
    f_noticeID:'',
    f_noticeName:'',
    f_noticeMsg:''
  },
  onLoad: function (options) {
    console.log(options)
    this.setData({
      f_noticeName:options.f_noticeName,//options.id,
      f_noticeMsg: options.f_noticeMsg//options.f_noticeMsg
    })
  },


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
  
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    util.refreshUserInfo()
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
  
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
  
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
  
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
  
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
  
  }
})