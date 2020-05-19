// pages/charge/charge.js
const app = getApp()
const util = require('../../utils/util')
Page({
  data: {
    disabled:true,
    thisCourtName:'',
    thisCourtID:'',
    now1:'',
    now2:'',
    now3:'',
    total:'',
    bee:0,
    beeBase:0
  },
  onLoad: function (options) {
    var that = this
    util.getJson('CalculateExtendCourtFee', { Months: '1', CourtID: options.courtid }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          thisCourtName: options.courtname,
          thisCourtID: options.courtid,
          baseMoney: res.BaseMoney,
          beeBase: res.ServiceCharge
        })
      } else {
        util.notice('获取费用信息失败', res.Result, function () {
          wx.navigateBack({
            delta: 1,
          })
        })
      }
    })
  },
  onReady: function () {
  },
  onShow: function () {
    util.refreshUserInfo()
  },
  onHide: function () {
  },
  onUnload: function () {
  },
  onPullDownRefresh: function () {
  },
  onReachBottom: function () {
  },
  onShareAppMessage: function () {
  },
  inputMoney: function (e) {
    var that = this
    var dis=(e.detail.value>0)?false:true
    var newbee=0;
    if(e.detail.value==''||that.data.beeBase=='0'){
      newbee=0;
    } else if ((e.detail.value * that.data.beeBase * 0.01).toFixed(2)<=0){
      newbee=0.01;
    }else{
      newbee = (e.detail.value * that.data.beeBase * 0.01).toFixed(2);
    }
    that.setData({
      total: e.detail.value,
      bee: newbee,
      now1:'',
      now2:'',
      now3:'',
      disabled:dis
    })
  },
  set50:function(){
    var that=this
    that.setData({
      total:'50',
      bee: (50 * that.data.beeBase * 0.01).toFixed(2),
      now1:'now',
      now2:'',
      now3:'',
      disabled:false
    })
  },
  set100: function () {
    var that = this
    that.setData({
      total: '100',
      bee: (100 * that.data.beeBase * 0.01).toFixed(2),
      now1: '',
      now2: 'now',
      now3: '',
      disabled:false
    })
  }, 
  set200: function () {
    var that = this
    that.setData({
      total: '200',
      bee: (200 * that.data.beeBase * 0.01).toFixed(2),
      now1: '',
      now2: '',
      now3: 'now',
      disabled:false
    })
  },
  chargeMoney:function(){
    var that=this
    util.getJson('PreMakeBillForUser', { CourtID: that.data.thisCourtID, TotalMoeny: parseFloat(that.data.total) + parseFloat(that.data.bee)},function(res){
      if(res.Status=='success'){
        wx.requestPayment({
          timeStamp: res.timeStamp,
          nonceStr: res.nonceStr,
          package: 'prepay_id='+res.Prepay_ID,
          signType: res.signType,
          paySign: res.paySign,
          success:function(e){
            util.getJson('UpdateRechargeForUser', { TotalMoney: that.data.total,AmountMoney: parseFloat(that.data.total) + parseFloat(that.data.bee), CourtID: that.data.thisCourtID,outTradeNo:res.outTradeNo},function(res2){
              if(res2.Status=='success'){
                wx.showToast({
                  title: '充值成功',
                  icon: 'success',
                  duration: 1500,
                  complete: function () {
                    setTimeout(function () {
                      wx.navigateBack({
                        delta: 1
                      })
                    }, 1500)
                  }
                })
              }else{
                util.notice('充值发生错误','请与管理员联系：'+res2.Result,function(){
                  wx.navigateBack({
                    delta:1
                  })
                })
              }
            })
            //console.log(e)
          },
          fail:function(e){
            //console.log(e)
            if(e.errMsg.indexOf('cancel')<0){
              util.notice('充值失败', e.errMsg)
            }
          }
        })
      }else{
        util.notice('生成订单失败',res.Result)
      }
    })
  }
})