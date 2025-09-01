// pages/anno/anno.js如果要做new和为访问的区分，就将new替换成一张白色图片
const util = require('../../utils/util')
const app = getApp()
Page({
  data: {
    annos: [],
    thisCourtName:'',
    thisCourtID:'',
    courts:{},
    disablelist:{},
    thisTime:null,
    index:'0'
  },
  onLoad: function (options) {
    var that = this
    var courts = util.getJson('GetCourts', {}, function (res) {
      if (res.Status == 'success') {
        if (res.Groups.length < 1) {
          util.notice('加载小区失败', '小区列表为空', function () {
            wx.redirectTo({
              url: '/pages/index/index',
            })
          })
          return
        }
        if(!res.Groups[app.globalData.courtindex]){
          app.globalData.courtindex=0
        }
        that.setData({
          courts: res.Groups,
          thisCourtName: res.Groups[app.globalData.courtindex].GroupName,
          thisCourtID: res.Groups[app.globalData.courtindex].f_id,
          index: app.globalData.courtindex
        })
        that.getNotice()
      } else {
        
        util.notice('加载小区信息失败', res.Result)
      }
    })
  },
  onReady: function () {
  },
  onShow: function () {
    util.refreshUserInfo()
    var that=this
    that.getVisited()
  },
  onHide: function () {
  },
  onUnload: function () {
  },
  onPullDownRefresh: function () {
    var that=this
    that.getNotice()
    wx.stopPullDownRefresh()
  },
  onReachBottom: function () {
  },
  onShareAppMessage: function () {
  },
  getNotice:function(){//刷新本地缓存的消息
    var that=this
    util.getJson('GetCourtNoticeByID', { 'CourtID': that.data.thisCourtID }, function (res2) {
      if (res2.Status == 'success') {
        var tt=new Date().getTime()
        that.setData({
          annos: res2.Notice,
          thisTime:tt
        })
        that.getVisited()
      } else {
        util.notice('获取小区公告失败', res2.Result)
      }
    })
  },
  setVisited:function(e){
    //console.log(e.currentTarget.dataset.id)
    var that = this
    var list = that.data.disablelist
    list[e.currentTarget.dataset.id]=true
    wx.setStorage({
      key: 'disablelist',
      data: list
    })
  },
  getVisited:function(){
    var that=this
    wx.getStorage({
      key: 'disablelist',
      success: function (res2) {
        that.setData({
          disablelist: res2.data
        })
      }
    })
  },
  selectcourt: function (e) {
    var index = e.detail.value
    var that = this
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id,
      index:index
    })
    app.globalData.courtindex=index
    that.getNotice()
  }
})