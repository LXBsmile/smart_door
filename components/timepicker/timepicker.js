// components/timepicker/timepicker.js
Component({
  options:{multipleSlots: true},
  properties: {
    enddate:String
  },
  methods: {
    _outputTime(){
      var that=this
      var time2 = ''+that.data.inputYear+that.data.monthArray[that.data.monthIndex]+that.data.dayArray[that.data.dayIndex]+that.data.timeArray[that.data.timeIndex]+that.data.minArray[that.data.minIndex]
      this.triggerEvent('outputTime',time2)
    },
      //年改变
    bindYearChange: function (e) {
      var that = this
      that.setData({
        inputYear: e.detail.value
      })
      that.judgeMonth()
      this._outputTime()
    },
    //月改变
    bindMonthChange: function (e) {
      var that = this
      that.setData({
        monthIndex: e.detail.value
      })
      that.judgeDay()
      this._outputTime()
    },
    //日改变
    bindDayChange: function (e) {
      var that = this
      that.setData({
        dayIndex: e.detail.value
      })
      this._outputTime()
    },
    //时间改变
    bindTimeChange: function (e) {
      var that = this
      that.setData({
        timeIndex: e.detail.value
      })
      this._outputTime()
      //console.log(that.data.inputYear + '=' + that.data.monthIndex + '=' + that.data.dayIndex + '-' + that.data.timeIndex)
    },
    //分钟改变
    bindMinChange: function (e) {
      var that = this
      that.setData({
        minIndex: e.detail.value
      })
      this._outputTime()
      //console.log(that.data.inputYear + '=' + that.data.monthIndex + '=' + that.data.dayIndex + '-' + that.data.timeIndex)
    },
    //判断月区间
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
      if(mi<0){
        mi=(parseInt('0'+that.data.monthArray[that.data.monthIndex]) > parseInt(ma[ma.length - 1]))?(ma.length-1):0
      }
      that.setData({
        monthArray: ma,
        monthIndex: mi
      })
      that.judgeDay()
    },
    //判断日区间
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
      if(di<0){
        di=(parseInt('0'+that.data.dayArray[that.data.dayIndex]) > parseInt(da[da.length - 1]))?(da.length-1):0
      }
      that.setData({
        dayArray: da,
        dayIndex: di
      })
      //console.log(that.data.startYear + "\n" + that.data.endYear + "\n" + that.data.monthArray + "\n" + that.data.dayArray + "\n" + that.data.timeArray)
    }
  },
  data: {
    validity:'2100-12-12 00:00:00',
    dateDis:false,
    startYear:'2000',
    endYear:'2100',
    inputYear: '',
    monthArray: [''],
    monthIndex: 0,
    dayArray: [''],
    dayIndex: 0,
    timeArray: [''],
    timeIndex: 0,
    minArray:[''],
    minIndex:0,
    fullTimeArray: ['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'],
    fullMinArray:['00','01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32','33','34','35','36','37','38','39','40','41','42','43','44','45','46','47','48','49','50','51','52','53','54','55','56','57','58','59'],
    fullArray:['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','32']
  },
  ready:function(){
    var that=this
    this.setData({
        validity:new Date(this.data.enddate.replace(/-/g, '/'))
    })
    if(that.data.validity<new Date()){
      that.setData({
        dateDis:true,
        inputYear: '',
        monthArray: [''],
        monthIndex: 0,
        dayArray: [''],
        dayIndex: 0,
        timeArray: [''],
        timeIndex: 0,
        minArray:[''],
        minIndex:0
      })
      return
    }
    that.setData({
      startYear: new Date().getFullYear(),
      endYear: that.data.validity.getFullYear(),
      inputYear: new Date().getFullYear(),
      timeArray: that.data.fullTimeArray,
      minArray: that.data.fullMinArray
    })
    that.setData({
      timeIndex: that.data.timeArray.length - 1,
      minIndex: that.data.minArray.length - 1
    })
    this.judgeMonth()
  }
})
