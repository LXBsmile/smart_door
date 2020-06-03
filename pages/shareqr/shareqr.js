// pages/shareqr/shareqr.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js")
const config = app.getConfig();
var info = wx.getSystemInfoSync();
Page({
  data:{
    validity:null,
    inputDate:'',
    imgURL:'',
    msg:'',
    disableqr:true,
    max_height: config.APP_CONFIG.QR_HEIGHT + 50,
    qr_width: config.APP_CONFIG.QR_WIDTH + 100,
    qr_height: info.windowHeight - 100,
    previewImage: false,
    firstIn:true
  },
  onShow: function () {
    
    util.refreshUserInfo();
    if (!this.data.firstIn){
      this.generateQR();
    }
    
  },
  onLoad:function(option){
    var that=this;
    setTimeout(function(){
      that.data.firstIn = false;
    },100)    
    
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
    if(!this.data.previewImage){
      wx.showLoading({
        title: '二维码生成中',
        mask: true
      })
    }

    var that=this
    var content='Time:'+this.data.inputDate.substr(2)+',Type:A2,Value:'+this.data.msg
    var title='有效期: '+this.data.inputDate.substr(0,4)+'-'+this.data.inputDate.substr(4,2)+'-'+this.data.inputDate.substr(6,2)+' '+this.data.inputDate.substr(8,2)+':'+this.data.inputDate.substr(10)    
    QR.api.draw(content, 'mycanvas', config.APP_CONFIG.QR_WIDTH, config.APP_CONFIG.QR_HEIGHT, {
      x: Math.round((info.windowWidth - config.APP_CONFIG.QR_WIDTH) / 2),
      y: 0
    },function(){
      setTimeout(function(){
        that.data.imgURL='1';
        if(!that.data.previewImage){
          wx.showToast({
            title: '生成成功',
            duration: 1000,
            mask: true
          })
        }      
      },300)
    })
    if(this.data.previewImage){      
      var context = wx.createCanvasContext('mycanvas');
      context.setTextAlign('center');
      context.setTextBaseline('top')
      context.setFontSize(14);
      context.fillText(`有效日期`, Math.round((info.windowWidth) / 2), config.APP_CONFIG.QR_HEIGHT +38);
      context.draw(true);      
      this.drawTxt({
        context: context,
        x: Math.round((info.windowWidth) / 2),
        y: config.APP_CONFIG.QR_HEIGHT+58,
        maxWidth: config.APP_CONFIG.QR_WIDTH+10,
        scale: 1,
        fontSize: 11,
        text: `${that.data.inputDate.substring(0, 4)}年${that.data.inputDate.substring(4, 6)}月${that.data.inputDate.substring(6, 8)}日 ${that.data.inputDate.substring(8, 10)}时${that.data.inputDate.substring(10, 12)}分` 
      });
      context.draw(true);
    }
  },
  showQR() {
    if (this.data.imgURL == '') return
    if (this.data.previewImage) return;
    var _this = this;
    this.setData({
      previewImage: true
    });
    this.generateQR();
    var t = setTimeout(() => {
      wx.canvasToTempFilePath({
        canvasId: 'mycanvas',
        fileType: 'jpg',
        quality: 1,
        success(res) {
          wx.previewImage({
            current: '1', // 当前显示图片的http链接
            urls: [res.tempFilePath], // 需要预览的图片http链接列表
            success() {
              clearTimeout(t)
              var tt = setTimeout(() => {
                _this.setData({
                  previewImage: false
                });
                clearTimeout(tt);
              }, 500)
            }
          })
        },
        fail() {
          wx.showToast({
            title: '转换失败',
            icon: 'success',
            duration: 2000
          })

        }
      })
    }, 160)
  },
  drawTxt: function ({
    context,
    scale = 1,
    text = 'test text',
    fillStyle = '#000',
    broken = true,
    ...rest
  }) {
    if (!context) throw Error('请传入绘制上下文环境context')
    // 默认设置
    let origin = {
      x: 0,
      y: 0,
      lineHeight: 12,
      maxWidth: 630,
      fontSize: 28
    }

    // 比例计算正确的尺寸
    for (let item in rest) {
      rest[item] *= scale
    }

    // 获取计算后的值
    let {
      x,
      y,
      lineHeight,
      maxWidth,
      fontSize
    } = {
      ...origin,
      ...rest
    }

    // 设置字体样式
    context.setTextAlign('center')
    context.setTextBaseline('top')
    context.setFillStyle(fillStyle)
    context.setFontSize(fontSize)

    // broken: true  如果不考虑英文单词的完整性 适用于所有情况
    // broken: false  考虑英文单词的完整性 仅适用于纯英文
    //【TODO: 中英混排且考虑单词截断...】

    let splitChar = broken ? '' : ' '

    let arrText = text.split(splitChar)
    let line = ''
    let linesCount = 0

    for (var n = 0; n < arrText.length; n++) {
      let testLine = line + arrText[n] + splitChar
      let testWidth = context.measureText(testLine).width
      if (testWidth > maxWidth && n > 0) {
        // 一行已经绘制完成
        linesCount++
        context.fillText(line, x, y)
        line = arrText[n] + splitChar
        y += lineHeight
      } else {
        // 一行还未绘制完成
        line = testLine
      }
    }

    linesCount++
    context.fillText(line, x, y)
    return linesCount * lineHeight
  },
})