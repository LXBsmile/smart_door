// pages/keyslist/keyslist.js
const util=require('../../utils/util')
const app = getApp()
Page({
  data: {
    courts:[],
    thisCourtName:'',
    keys:[],
    thisCourtID:'',
    index:'0'
  },
  onShow: function () {
    var that=this
    var user = app.globalData.userInfo
    var courts = util.getJson('GetCourts', {},function(res){
      if(res.Status=='success'){
        if(res.Groups.length<1){
          util.notice('加载小区失败','小区列表为空',function(){
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
        that.getKeyList()
      }else{
        util.notice('加载小区信息失败',res.Result)
      }

    })
    
  },
  onPullDownRefresh: function () {
    this.getKeyList()
  },
  bindtapToRefreshUsers: function () {
    var that = this;
    util.refreshGroups(function () {
      if (app.globalData.groups.length > 0) {
        that.setData({
          courts: app.globalData.groups,
          index: app.globalData.courtindex
        })
        that.setData({
          thisCourtName: app.globalData.groups[app.globalData.courtindex].GroupName,
          thisCourtID: app.globalData.groups[app.globalData.courtindex].f_id
        })
      }

    })
  },
  selectcourt:function(e){
    var index=e.detail.value
    var that=this
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID:that.data.courts[index].f_id
    })
    app.globalData.courtindex=index
    util.getJson('KeyList', {'CourtID':that.data.courts[index].f_id}, function (res2) {
      if (res2.Status == 'success') {
        that.setData({
          keys: res2.Keys
        })
      } else {
        util.notice('加载钥匙列表失败' , res2.Result)
      }
    })
    
  },
  unlock: function (e){
    var that=this
    //console.log(e.target.id)
    util.getJson('OpenDoorInSmallApp', {"Devid": e.target.id,"CourtID":this.data.thisCourtID},function(res){
    if(res.Status=='success'){
      wx.showToast({
        title: '开门成功',
        mask:true,
        duration:1500
      })
    }else{
      util.notice('开门失败',res.Result)
    }
    })
  },
  getKeyList:function(){
    var that=this
    util.getJson('KeyList', { 'CourtID': that.data.thisCourtID }, function (res2) {
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