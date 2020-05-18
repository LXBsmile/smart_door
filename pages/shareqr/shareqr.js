// pages/shareqr/shareqr.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js")
Page({
  data:{
    validity:null,
    inputDate:'',
    imgURL:'',
    msg:'',
    disableqr:true
  },
  onLoad:function(option){
    if(option.msg==''&&option.msg==null){
      wx.navigateBack({
        delta:1
      })
      return
    }
    var date=new Date()
    this.setData({
      validity:(option.val+':00:00'),
      msg:option.msg,
      inputDate:("00"+date.getFullYear()).substr(-4)+("00"+(date.getMonth()+1)).substr(-2)+("00"+date.getDate()).substr(-2)+"2359"
    })
    if(new Date()<=new Date(this.data.validity.replace(/-/g,'/'))){
      this.setData({
        disableqr:false
      })
    }
  },
  onReady:function(){
    this.timepicker = this.selectComponent("#timepicker");
  },
  changeTime:function(e){
    this.setData({inputDate:e.detail})
  },
  generateQR:function(){
    wx.showLoading({
      title: '二维码生成中',
      mask:true
    })
    var that=this
    var content='Time:'+this.data.inputDate.substr(2)+',Type:A2,Value:'+this.data.msg
    var title='有效期: '+this.data.inputDate.substr(0,4)+'-'+this.data.inputDate.substr(4,2)+'-'+this.data.inputDate.substr(6,2)+' '+this.data.inputDate.substr(8,2)+':'+this.data.inputDate.substr(10)
    console.log(content)
    QR.api.draw(content, 'mycanvas', 300, 300,title,function(){
      setTimeout(function(){
        wx.canvasToTempFilePath({
          canvasId: 'mycanvas',
          success: function (res) {
            that.setData({
              imgURL: res.tempFilePath
            })
            wx.showToast({
              title: '生成成功',
              duration: 1000,
              mask: true
            })
          },
          fail: function () {
            console.log('调用失败')
          }
        })
      },500)
    })
  },
  previewImg: function (e) {
    var img = this.data.imgURL;
    if(img=='')return
    wx.previewImage({
      urls: [img] // 需要预览的图片http链接列表
    });
  }
})