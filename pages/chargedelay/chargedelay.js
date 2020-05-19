// pages/chargedelay/chargedelay.js
const app = getApp()
const util = require('../../utils/util')
Page({
  data: {
    disabled:true,
    thisCourtName: '',
    thisCourtID: '',
    now1: '',
    now2: '',
    now3: '',
    baseMoney:'',
    month:'',
    total: '0',
    bee:0,
    beeBase:0
  },
  onLoad: function (options) {
    var that = this
    util.getJson('CalculateExtendCourtFee', {Months:'1',CourtID:options.courtid},function(res){
      if(res.Status=='success'){
        that.setData({
          thisCourtName: options.courtname,
          thisCourtID: options.courtid,
          baseMoney: res.BaseMoney,
          beeBase: res.ServiceCharge
        })
      }else{
        util.notice('获取月费基数失败',res.Result,function(){
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
  inputMonth: function (e) {
    var that = this
    if(e.detail.value>60){
      that.setData({
        month:60,
        total: (60 * that.data.baseMoney).toFixed(2),
        bee: (0.6 * that.data.baseMoney * that.data.beeBase).toFixed(2),
        now1: '',
        now2: '',
        now3: '',
        disabled: false
      })
    }else if(e.detail.value<1){
      that.setData({
        total: '0',
        bee:0,
        now1: '',
        now2: '',
        now3: '',
        disabled: true
      })
    }else{
      var dis = (e.detail.value == '') ? true : false
      that.setData({
        month:e.detail.value,
        total: (that.data.baseMoney * e.detail.value).toFixed(2),
        bee: (that.data.baseMoney * e.detail.value*that.data.beeBase*0.01).toFixed(2),
        now1: '',
        now2: '',
        now3: '',
        disabled: dis
      })
      //console.log(that.data.baseMoney +''+ e.detail.value +''+ that.data.beeBase)
    }
  },
  set1: function () {
    var that = this
    that.setData({
      month:'1',
      total: that.data.baseMoney,
      bee: (that.data.baseMoney * that.data.beeBase * 0.01).toFixed(2),
      now1: 'now',
      now2: '',
      now3: '',
      disabled: false
    })
  },
  set2: function () {
    var that = this
    that.setData({
      month:'2',
      total: (2 * that.data.baseMoney).toFixed(2),
      bee: (that.data.baseMoney * that.data.beeBase * 0.02).toFixed(2),
      now1: '',
      now2: 'now',
      now3: '',
      disabled: false
    })
  },
  set6: function () {
    var that = this
    that.setData({
      month:'6',
      total: (6 * that.data.baseMoney).toFixed(2),
      bee: (that.data.baseMoney * that.data.beeBase * 0.06).toFixed(2),
      now1: '',
      now2: '',
      now3: 'now',
      disabled: false
    })
  },
  chargeDelay:function(){
    var that = this
    util.getJson('PreMakeBillForUser', { CourtID: that.data.thisCourtID, TotalMoeny: parseFloat(that.data.total) + parseFloat(that.data.bee)}, function (res) {
      if (res.Status == 'success') {
        wx.requestPayment({
          timeStamp: res.timeStamp,
          nonceStr: res.nonceStr,
          package: 'prepay_id=' + res.Prepay_ID,
          signType: res.signType,
          paySign: res.paySign,
          success: function (e) {
            util.getJson('ExtendValidateDateForUser', { Months: that.data.month, BaseMoney: that.data.baseMoney, TotalMoney: that.data.total, AmountMoney: parseFloat(that.data.total) + parseFloat(that.data.bee), CourtID: that.data.thisCourtID, outTradeNo: res.outTradeNo }, function (res2) {
              if (res2.Status == 'success') {
                wx.showToast({
                  title: '延期充值成功',
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
              } else {
                util.notice('延期充值发生错误', '请与管理员联系：' + res2.Result, function () {
                  wx.navigateBack({
                    delta: 1
                  })
                })
              }
            })
            //console.log(e)
          },
          fail: function (e) {
            //console.log(e)
            if (e.errMsg.indexOf('cancel') < 0) {
              util.notice('延期充值失败', e.errMsg)
            }
          }
        })
      } else {
        util.notice('生成订单失败', res.Result)
      }
    })
  }
})