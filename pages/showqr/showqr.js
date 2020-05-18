// pages/showqr/showqr.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js")
var timeflag=false
var timeInial=false;
var timeEclaps = 0;
var timer
var flag = false
Page({
  data: {
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index:'0',
    bright:0.3,
    hideCanvas:false,
    backend:{}
  },
  onReady:function(){
  },
  onShow:function(options){
    timeflag=true
    var that = this
    var user = app.globalData.userInfo;

    util.refreshGroups(function(){

      that.setData({
        courts: app.globalData.groups,
        index: app.globalData.courtindex
      })
      that.setData({
        thisCourtName: app.globalData.groups[app.globalData.courtindex].GroupName,
        thisCourtID: app.globalData.groups[app.globalData.courtindex].f_id
      })

      that.drawQR(that.data.thisCourtID)
      if (!timeInial) {
        timeInial = true;
        setInterval(function () {
          if (timeflag == true) {
            timeEclaps += 1;
            console.log('每三十秒一轮回' + timeEclaps);
            if (timeEclaps == 30)//没三十秒一轮回
            {
              timeEclaps = 0;
              if (that.data.thisCourtID != -1){
              that.drawQR(that.data.thisCourtID);
              }

            }
          }
        }, 1000)
      }
    })

  },
  onUnload:function(){
    /*var that=this
    that.setData({
      hideCanvas:true
    })*/
    clearTimeout(timer)
  },
  onHide:function(){
    timeflag = false
    clearTimeout(timer)
  },
  onPullDownRefresh: function () {
    clearTimeout(timer)
    this.drawQR(this.data.thisCourtID)
    setTimeout(function(){
      wx.stopPullDownRefresh()
    },1000)
  },

  bindtapToRefreshUsers:function(){
    var that = this;
    util.refreshGroups(function () {     
      if (app.globalData.groups.length>0){
        app.globalData.groups.push({ "f_id": "20", "GroupName": "AAA示范小区--test", "f_notice": null, "f_unit": "AAA示范小区测试", "f_tel": "0755-88888888", "f_address": "中国。深圳", "f_mail": "szcjwzn@163.com", "f_Web": "cjwkj.com", "f_introduce": null })
        console.log(app.globalData.groups)
        that.setData({
          courts: app.globalData.groups,
          index: 999
        })
        console.log("****************************")
        console.log(that.data.courts);
        that.setData({
          thisCourtName: app.globalData.groups[app.globalData.courtindex].GroupName,
          thisCourtID: app.globalData.groups[app.globalData.courtindex].f_id,
          //index: app.globalData.courtindex
        })

      }
    })
  },
  selectcourt: function (e) {
    var that = this;
    var index = e.detail.value
    console.log(e)
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id
    })
    if (that.data.thisCourtID != -1){
      that.drawQR(that.data.thisCourtID)
    }
    
  },
  drawQR: function(courtID){
    var that = this
    util.getJson('GetBackEndUserInfo', {CourtID:courtID},function(res){
      if(res.Status=='success'){
        if (res.f_cardMsg!=''&&res.f_cardMsg!=null){
          that.setData({backend:res})
          var date = new Date()
          var content = 'Time:' + ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2) + ',Type:A1,Value:' + res.f_cardMsg
          /*wx.setScreenBrightness({
            value: 0.8,
          })*/
          console.log(content)
          QR.api.draw(content, 'mycanvas', 300, 300);
          /*if (!that.data.hideCanvas && timeflag) {
            that.drawQR(that.data.thisCourtID)
          }*/
          //if (!that.data.hideCanvas&&timeflag){
            //timer=setTimeout(function () {
             // if (!that.data.hideCanvas&&timeflag) {
               // that.drawQR(that.data.thisCourtID)
             // }
           // }, 30000)
          //}
        }else{
          that.setData({
            hideCanvas: true
          })
          /*util.notice('','抱歉，您没有权限!',function(e){
            wx.navigateBack({
              delta:-1
            })
          })*/
        }
      }else{
        util.notice('获取权限码失败',res.Result)
      }
    })
  },
  gotoshareqr:function(){
    if(flag){
      flag=false
      setTimeout(function(){flag = true}, 1000)
      if (new Date() > new Date(this.data.backend.f_validity.replace(/-/g, '/') + ':00:00')) {
        wx.showModal({
          content: '您的权限已过期',
          showCancel: false
        })
        return
      }
      wx.navigateTo({
        url: '/pages/shareqr/shareqr?val=' + this.data.backend.f_validity + '&msg=' + this.data.backend.f_cardMsg,
      })
    }
  },
  switchtab1:function(){
    timeflag = false
    wx.redirectTo({
      url: '/pages/index/index',
    })
  },
  switchtab3:function(){
    timeflag = false;
    wx.redirectTo({
      url: '/pages/my/my',
    })
  }
})