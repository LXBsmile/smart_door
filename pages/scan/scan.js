// pages/scan/scan.js
const app = getApp()
var util = require('../../utils/util')
var showScan = false
Page({
  data: {
    result: '',
    password: '',
    hiddenmodal: true,
    goneFlag: false,
    count: 0
  },
  onReady: function() {
    var that = this
    setTimeout(function() {
      that.getScan()
    }, 50)
  },
  onPullDownRefresh: function() {
    this.getScan()
    wx.stopPullDownRefresh()
  },
  onTabItemTap: function() {
    wx.hideTabBar()
    var that = this
    if (showScan) {
      setTimeout(function() {
        that.getScan()
      }, 50)
    }
  },
  getScan: function() {
    var that = this
    showScan = true
    if (!app.globalData.userInfo) {
      wx.redirectTo({
        url: 'pages/index/index',
      })
      return
    }
    wx.scanCode({
      onlyFromCamera: false,
      success: function(res) {
        //console.log('Scan...success')
        var parameter = res.result.split("?")
        if (parameter[0] != 'http://szcjwzn.cn/open.php' || parameter.length != 2) {
          that.gotoIndex('扫码失败', '二维码信息错误')
          return
        }
        try {
          var params = parameter[1].split("&")
          var p = {}
          for (var i = 0; i < params.length; i++) {
            var param = params[i].split("=")
            p[param[0]] = param[1]
          }
          console.log(p.Court + p.devid + p.time + p.secret + p.door)
        } catch (err) {
          that.gotoIndex('请重新尝试', '程序错误：' + err.message)
        }
        if (p.type == '1') {
          util.scanopendoor(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, app.globalData.userInfo.f_id, p.Court, p.devid, p.time, p.secret, p.door, function(res) {
            if (res.Status == 'success') {
              if (res.Code == 'SHOWDEDUCTTIP') {
                wx.showModal({
                  title: `提示`,
                  content: `本次需要扣费${res.Deduction}元，确认是否执行?`,
                  success(res2) {
                    if (res2.confirm) {
                      util.scanopendoor(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, app.globalData.userInfo.f_id, p.Court, p.devid, p.time, p.secret, p.door, function(res3) {
                        if (res3.Status == 'success') {
                          that.gotoIndex('权限验证成功', '如果有疑问请联系小区管理员')
                        } else {
                          that.gotoIndex('验证失败', res3.Result)
                        }
                      }, "");
                    } else {
                     
                    }
                  }
                })
              } else {
                that.gotoIndex('权限验证成功', '如果有疑问请联系小区管理员')
              }
            } else {
              that.gotoIndex('验证失败', res.Result)
            }
          }, "PRE-DEDUCT")
        } else if (p.type == '2') {
          util.scanshowpassword(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, app.globalData.userInfo.f_id, p.Court, p.devid, p.time, p.secret, p.m, function(res) {
            if (res.Status == 'success') {
              that.setData({
                password: res.Result,
                hiddenmodal: false
              })
            } else {
              that.gotoIndex('获取密码失败', res.Result)
            }
          })
        } else if (p.type == '3') {
          util.applypermission(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, p.userid, p.time, p.secret, p.data, function(res) {
            if (res.Status == 'success') {
              that.gotoIndex('扫码成功', '请等待授权！')
            } else {
              that.gotoIndex('添加权限失败', res.Result)
            }
          })
        } else if (p.type == '5') {
          that.gotoIndex('无效的类型', '请通过手机号或微信扫码添加成员')
        } else {
          that.gotoIndex('无效的类型', '解析二维码信息失败')
        }
      },
      fail: function(err) {
        wx.showTabBar()
        //console.log('Scan...fail')
        showScan = true
        that.setData({
          goneFlag: true
        })
        wx.redirectTo({
          url: '/pages/index/index'
        })
        //that.gotoIndex('请重新尝试','扫码失败')//不知道为啥，用this调用不到
      },
      complete: function() {
        //console.log('Scan...complete')
      }
    })
  },
  scanCode: function() {
    var that = this
    wx.scanCode({
      success: function(res) {
        that.setData({
          result: res.result
        })
      },
      fail: function(res) {}
    })
  },
  gotoIndex: function(title, content) { //显示弹窗确认后返回首页
    wx.showTabBar()
    var that = this
    wx.showModal({
      title: title,
      content: content,
      showCancel: false,
      confirmText: "确定",
      complete: function() {
        showScan = true
        that.setData({
          goneFlag: true
        })
        wx.redirectTo({
          url: '/pages/index/index'
        })
      }
    })
  },
  confirm: function() {
    var that = this
    showScan = true
    that.setData({
      hiddenmodal: true,
      password: ''
    })
    wx.redirectTo({
      url: '/pages/index/index'
    })
  }
})