const app = getApp()
const util = require('../../utils/util')
Page({
  data: {
    date: '',
    time: '',
    valiDate: '',
    disabled: true,
    name: '',
    tel: '',
    counts: '1',
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index: '0',
    dateDis: true,
    startYear: '1990',
    endYear: '2100',
    inputYear: '',
    monthArray: [''],
    monthIndex: 0,
    dayArray: [''],
    dayIndex: 0,
    timeArray: [''],
    fullTimeArray: ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'],
    timeIndex: 0,
    validity: '2019-02-02 00:00:00',
    fullArray: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32']
  },
  onShow: function () {
    util.refreshUserInfo()
  },
  onLoad: function (options) {
    var that = this
    var user = app.globalData.userInfo
    var courts = util.getJson('GetCourts', {}, function (res) {
      if (res.Groups && res.Groups.length < 1) {
        util.noticeArea('index');
        return
      }
      if (res.Status == 'success') {
        if (!res.Groups[app.globalData.courtindex]) {
          app.globalData.courtindex = 0
        }
        that.setData({
          courts: res.Groups,
          thisCourtName: res.Groups[app.globalData.courtindex].GroupName,
          thisCourtID: res.Groups[app.globalData.courtindex].f_id,
          index: app.globalData.courtindex
        })
        util.getJson('GetBackEndUserInfo', { CourtID: that.data.thisCourtID }, function (res2) {
          if (res2.Status == 'success') {
            var mydate = new Date(res2.f_validity.replace(/-/g, '/') + ':00:00')
            //var mydate = new Date('2018/05/23 00:00:00')
            that.setData({
              validity: mydate
            })
            var now = new Date()
            var target = that.data.validity
            //console.log(target.getHours())
            if (now.getFullYear() == target.getFullYear() && now.getMonth() == target.getMonth() && now.getDate() == target.getDate() && (now.getHours() < target.getHours() || target.getHours() == 0)) {
              util.notice('请注意', '您的权限将在今天过期')
              that.setData({
                dateDis: false,
                startYear: new Date().getFullYear(),
                endYear: that.data.validity.getFullYear(),
                inputYear: new Date().getFullYear()
              })
              that.judgeMonth()
            } else if (that.data.validity < new Date()) {
              util.notice('', '抱歉，您的权限已过期，不能分享钥匙')
              that.setData({
                dateDis: true,
                inputYear: '',
                monthArray: [''],
                monthIndex: 0,
                dayArray: [''],
                dayIndex: 0,
                timeArray: [''],
                timeIndex: 0
              })
            } else {
              that.setData({
                dateDis: false,
                startYear: new Date().getFullYear(),
                endYear: that.data.validity.getFullYear(),
                inputYear: new Date().getFullYear()
              })
              that.judgeMonth()
            }
          } else {
            util.notice('获取有效日期失败', res2.Result)
          }
        })

      } else {
        util.notice('加载小区信息失败', res.Result)
      }
    })
  },
  bindYearChange: function (e) {
    var that = this
    that.setData({
      inputYear: e.detail.value
    })
    that.judgeMonth()
  },
  bindMonthChange: function (e) {
    var that = this
    that.setData({
      monthIndex: e.detail.value
    })
    that.judgeDay()
  },
  bindDayChange: function (e) {
    var that = this
    that.setData({
      dayIndex: e.detail.value
    })
  },
  bindTimeChange: function (e) {
    var that = this
    that.setData({
      timeIndex: e.detail.value
    })
    console.log(that.data.inputYear + '=' + that.data.monthIndex + '=' + that.data.dayIndex + '-' + that.data.timeIndex)
  },
  formSubmit: function (e) {
    //console.log('form发生了submit事件，携带数据为：', e.detail.value)
    var that = this
    var date = new Date()
    var nowtime = ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2)
    var time2 = '' + that.data.inputYear + that.data.monthArray[that.data.monthIndex] + that.data.dayArray[that.data.dayIndex] + that.data.timeArray[that.data.timeIndex] + '00'
    var content = 'time=' + nowtime + '&f_openid=' + app.globalData.openId + '&f_unionid=' + app.globalData.userInfo.f_UnionID + '&f_fkName=' + e.detail.value.name + '&f_tel=' + e.detail.value.tel + '&f_validity=' + time2 + '&f_useNum=' + e.detail.value.counts + '&f_courtid=' + this.data.thisCourtID
    console.log(content)
    var url = '【智慧云门禁】分享了一把钥匙给你，点击链接进行绑定。http://szcjwzn.cn/open.php?type=6&content=' + util.encode(content)
    //console.log(url)
    wx.setClipboardData({
      data: url,
      success: function (res) {
        wx.showToast({
          title: '分享链接已复制',
          icon: 'success',
          duration: 2000,
          mask: true,
          complete: function () {
            setTimeout(function () {
              wx.redirectTo({
                url: '/pages/index/index'
              })
            }, 1500)
          }
        })
      }
    })
  },
  formReset: function (e) {
  },
  inputname: function (e) {
    var that = this
    that.setData({
      name: e.detail.value
    })
    that.judgeDisable()
  },
  inputtel: function (e) {
    var that = this
    that.setData({
      tel: e.detail.value
    })
    that.judgeDisable()
  },
  inputcounts: function (e) {
    var that = this
    that.setData({
      counts: e.detail.value
    })
    that.judgeDisable()
  },
  selectcourt: function (e) {
    var index = e.detail.value
    var that = this
    that.setData({
      thisCourtName: that.data.courts[index].GroupName,
      thisCourtID: that.data.courts[index].f_id,
      index: index
    })
    app.globalData.courtindex = index
    util.getJson('GetBackEndUserInfo', { CourtID: that.data.thisCourtID }, function (res2) {
      if (res2.Status == 'success') {
        var mydate = new Date(res2.f_validity.replace(/-/g, '/') + ':00:00')
        that.setData({
          validity: mydate
        })
        var now = new Date()
        var target = that.data.validity
        if (now.getFullYear() == target.getFullYear() && now.getMonth() == target.getMonth() && now.getDate() == target.getDate() && (now.getHours() < target.getHours() || target.getHours() == 0)) {
          util.notice('请注意', '您的权限将在今天过期')
          that.setData({
            dateDis: false,
            startYear: new Date().getFullYear(),
            endYear: that.data.validity.getFullYear(),
            inputYear: new Date().getFullYear()
          })
          that.judgeMonth()
        } else if (that.data.validity < new Date()) {
          util.notice('', '抱歉，您的权限已过期，不能分享钥匙')
          that.setData({
            dateDis: true,
            inputYear: '',
            monthArray: [''],
            monthIndex: 0,
            dayArray: [''],
            dayIndex: 0,
            timeArray: [''],
            timeIndex: 0
          })
        } else {
          that.setData({
            dateDis: false,
            startYear: new Date().getFullYear(),
            endYear: that.data.validity.getFullYear(),
            inputYear: new Date().getFullYear()
          })
          that.judgeMonth()
        }
        that.judgeDisable()
        //console.log(nowdate+":"+that.data.valiDate)
      } else {
        util.notice('获取有效日期失败', res2.Result)
      }
    })
  },
  judgeMonth: function () {
    var that = this
    var ma = []
    if (that.data.inputYear == that.data.validity.getFullYear()) {
      ma = that.data.fullArray.slice(0, that.data.validity.getMonth() - 31)
    } else {
      ma = that.data.fullArray.slice(0, 12)
    }
    if (that.data.inputYear == new Date().getFullYear()) {
      ma = ma.slice(new Date().getMonth())
    }
    var mi = ma.indexOf(that.data.monthArray[that.data.monthIndex])
    if (mi < 0) {
      mi = (parseInt('0' + that.data.monthArray[that.data.monthIndex]) > parseInt(ma[ma.length - 1])) ? (ma.length - 1) : 0
    }
    that.setData({
      monthArray: ma,
      monthIndex: mi
    })
    that.judgeDay()
  },
  judgeDay: function () {
    var that = this
    var da
    var thisYear = that.data.inputYear
    var thisMonth = that.data.monthArray[that.data.monthIndex]
    if (thisYear == that.data.validity.getFullYear() && thisMonth == that.data.validity.getMonth() + 1) {
      da = that.data.fullArray.slice(0, that.data.validity.getDate() - 32)
    } else {
      if ('01,03,05,07,08,10,12'.indexOf(thisMonth) > -1) {
        da = that.data.fullArray.slice(0, 31)
      } else if (thisMonth == '02') {
        if (((thisYear % 4) == 0) && ((thisYear % 100) != 0) || ((thisYear % 400) == 0)) {//闰年
          da = that.data.fullArray.slice(0, 29)
        } else {
          da = that.data.fullArray.slice(0, 28)
        }
      } else {
        da = that.data.fullArray.slice(0, 30)
      }
    }
    if (thisYear == new Date().getFullYear() && thisMonth == new Date().getMonth() + 1) {
      da = da.slice(new Date().getDate() - 1)
    }
    var di = da.indexOf(that.data.dayArray[that.data.dayIndex])
    if (di < 0) {
      di = (parseInt('0' + that.data.dayArray[that.data.dayIndex]) > parseInt(da[da.length - 1])) ? (da.length - 1) : 0
    }
    that.setData({
      dayArray: da,
      dayIndex: di,
      timeArray: that.data.fullTimeArray
    })
    //console.log(that.data.startYear + "\n" + that.data.endYear + "\n" + that.data.monthArray + "\n" + that.data.dayArray+"\n"+that.data.timeArray)
  },
  judgeDisable: function () {
    var that = this
    if (that.data.name.trim().length > 0 && that.data.tel.trim().length > 10 && !that.data.dateDis && that.data.counts.trim().length > 0) {
      that.setData({
        disabled: false
      })
    } else {
      that.setData({
        disabled: true
      })
    }
  },
  onPullDownRefresh: function () {
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})