// pages/my/my.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js");
var flag=false
Page({
  data: {
    thisuser:{},
    gender:'无',
    nickname:'无名',
    name:'无名',
    userid:'',
    allcourts:[],
    thiscourt:{},
    members: [],
    hiddenmodal:true,
    hiddenmodal2:true,
    inputedID: '',
    isMain: false,
    groupindex: 0,
    index:'0'
  },
  onLoad: function (options) {
    //setTimeout(function(){flag = true}, 2000)
  },
  onReady: function () {
    var that = this
    if (app.globalData.userInfo) {
      that.getMyInfo()
    } else {
      util.refreshUserInfo(function () {
        that.getMyInfo()
      })
    }
    setTimeout(function(){flag = true}, 500)
  },
  onShow: function () {
     if (!app.globalData.offline) {
      util.refreshUserInfo()
    }
  
    var that=this
    if (that.data.thisuser.f_Tel != app.globalData.userInfo.f_Tel){
      if (!app.globalData.offline) {
        that.setData({ thisuser: app.globalData.userInfo })
      }
     
    }
    if(that.data.groupindex!=app.globalData.courtindex){
      that.setData({
        groupindex: app.globalData.courtindex,
        index: app.globalData.courtindex
      })
    }
  },
  onHide: function () {
  },
  onUnload: function () {
  },
  onPullDownRefresh: function () {
    var that=this
    util.refreshUserInfo(function(){
      that.setData({
        members: [],
        isMain: false
      })
      that.getMyInfo()
    })
    setTimeout(function(){
      wx.stopPullDownRefresh()
    },1000
    )
  },
  getMyInfo:function(){
    var that = this
      //先将已有信息加载
      that.setData({
        thisuser: app.globalData.userInfo,
        gender: app.globalData.userInfo.f_gender == '1' ? '男' : '女',
        nickname: app.globalData.userInfo.f_nickname,
        tel: app.globalData.userInfo.f_Tel,
        userid: app.globalData.userInfo.f_id,
        name: app.globalData.userInfo.f_nickname
      })
      //加载小区信息
      var openid = app.globalData.userInfo.f_OpenID
      util.getJson('GetCourts', {}, function (res) {
        if (res.Status == 'success') {
          if (res.Groups.length < 1) {
            that.setData({
              allcourts:[],
              thiscourt: {"GroupName":""}
            })
            util.notice('加载小区失败', '小区列表为空')
            return
          }
          if(!res.Groups[app.globalData.courtindex]){
            app.globalData.courtindex=0
          }
          var index=app.globalData.courtindex
          that.setData({
            index:index,
            allcourts: res.Groups,
            thiscourt: res.Groups[index]
          })
          util.getJson('GetFamilyMembers', { 'CourtID': that.data.thiscourt.f_id }, function (res2) {
            if (res2.Status == 'success') {
              that.setData({
                members: res2.Family,
                isMain: res2.IsMainFamilyMember
              })
            } else {
              util.notice("加载家庭成员信息失败", res2.Result)
            }
          })
        } else {
          util.notice("加载小区信息失败", res.Result)
        }
      })
  },
  modifytel:function(){
    if (app.globalData.offline) {
      wx.showModal({
        title: '无网络',
        content: '无网络，请连接网络后再试！',
      })
      return;
    }
    wx.navigateTo({
      url: '/pages/register/register?type=1',
    })
  },
  morecourts:function(e){
    var that=this
    var index = e.detail.value
    that.setData({
      thiscourt: that.data.allcourts[index],
      groupindex:index,
      index:index
    })
    app.globalData.courtindex=index;//增加小区记忆
    var openid = app.globalData.userInfo.f_OpenID
    util.getJson('GetFamilyMembers', {'CourtID':that.data.thiscourt.f_id}, function (res) {
      if (res.Status == 'success') {
        that.setData({
          members: res.Family,
          isMain: res.IsMainFamilyMember
        })
      } else {
        util.notice("加载家庭成员信息失败",res.Result)
      }
    })
  },
  addmem:function(){
    this.setData({
      hiddenmodal: false
    })
  },
  confirm:function(){
    var that=this
    util.getJson('UpdateFamilyRelations', { 'CourtID': that.data.thiscourt.f_id,'f_Tel':that.data.inputedID},function(res){
      if(res.Status=='success'){
        that.setData({
          hiddenmodal: true,
          inputedID: ''
        })
        util.getJson('GetFamilyMembers', {'CourtID':that.data.thiscourt.f_id}, function(res2){
          if (res2.Status == 'success') {
            that.setData({
              members: res2.Family,
              isMain: res2.IsMainFamilyMember
            })
          } else {
            util.notice("加载家庭成员信息失败",res2.Result)
          }
        })
      } else if (res.ErrorCode =='UserNotFound'){
        that.setData({
          hiddenmodal: true,
          inputedID: '',
          hiddenmodal2:false
        })
        that.drawQR(that.data.thiscourt.f_id, res.UserID)
      }else{
        util.notice('添加家庭成员失败',res.Result)
      }
    })
  },
  cancel:function(){
    this.setData({
      hiddenmodal:true,
      inputedID: ''
    })
  },
  complete2:function(){
    var that=this
    that.setData({
      hiddenmodal2:true
    })
    that.getMyInfo()
  },
  setMemberID:function(e){
    var that=this
    that.setData({
      inputedID:e.detail.value
    })
  },
  deleteit:function(e){
    var that = this
    //console.log(JSON.stringify(e))
    wx.showModal({
      title: '确定删除该成员？',
      content: e.target.dataset.it,
      success:function(res){
        if(res.confirm){
        util.getJson('DeleteMemberFromFamily', { 'DeleteUnionID': e.target.dataset.id, 'CourtID': that.data.thiscourt.f_id }, function (res) {
          if (res.Status == 'success') {
            util.getJson('GetFamilyMembers', { 'CourtID': that.data.thiscourt.f_id }, function (res2) {
              if (res2.Status == 'success') {
                that.setData({
                  members: res2.Family,
                  isMain: res2.IsMainFamilyMember
                })
              } else {
                util.notice("加载家庭成员信息失败", res2.Result)
              }
            })
          } else {
            util.notice('删除失败', res.Result)
          }
        })
        }
      }
    })

  },
  drawQR:function(groupID,userID){
    var that=this
    var date = new Date()
    var content = 'time=' + ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2) + '&tel=' + app.globalData.userInfo.f_Tel + '&familyGroup=' + app.globalData.userInfo.f_UnionID + '&group=' + groupID + '&userid=' + userID
    //console.log(content)
    var url = 'http://szcjwzn.cn/open.php?type=5&content=' + util.encode(content)
    //console.log(url)
    QR.api.draw(url, 'mycanvas', 200, 200);
    if (!that.data.hiddenmodal2) {
      setTimeout(function(){
        if (!that.data.hiddenmodal2) {
          that.drawQR(groupID, userID)
        }
      },180000)
    }
  }
  /*,
  openpicker:function(){
    var that=this
    util.getJson('GetCourts', {}, function (res) {
      if (res.Status == 'success') {
        if (res.Groups.length < 1) {
          that.setData({
            allcourts: [],
            thiscourt: { "GroupName": "" }
          })
          util.notice('加载小区失败', '小区列表为空')
          return
        }
        var index = that.data.groupindex
        that.setData({
          allcourts: res.Groups
  })}})}*/
  ,switchtab1:function(){
    if(flag){
      wx.redirectTo({
        url: '/pages/index/index',
      })
    }
  },
  switchtab2:function(){
    if(flag){
      wx.redirectTo({
        url: '/pages/showqr/showqr',
      })
    }
  }
})