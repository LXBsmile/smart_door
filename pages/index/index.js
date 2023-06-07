const app = getApp()
var util = require('../../utils/util')
var flag = false
Page({
  data: {
    hiddenmodal: true,
    password: '',
    result: '',
    isRegisted: false
  },
  onShow: function () {

  },
  onReady: function () {
    setTimeout(function () {
      flag = true
    }, 500)
    //flag=false
    //setTimeout(function(){flag = true}, 2000)
  },
  onLoad: function () {
    util.refreshUserInfo(() => {
      this.setData({
        isRegisted: app.globalData.isRegisted
      })
    }, false)
  },
  onPullDownRefresh: function () {
    app.globalData.userInfo = null
    util.refreshUserInfo()
  },
  onShareAppMessage: function (obj) {},
  clickMenu: function (e) {
    if (flag) {
      flag = false
      setTimeout(function () {
        flag = true
      }, 1000)
      var page = e.currentTarget.id
      if (app.globalData.offline && e.currentTarget.dataset.online) {
        wx.showModal({
          title: '无网络',
          content: '无网络，请连接网络后再试！',
        })
        return;
      }
      if (!app.globalData.isRegisted) {
        wx.showModal({
          title: '提示',
          content: '需要您登录/注册授权用户信息才能正常使用，是否立即登录/注册？',
          success(res) {
            if (res.confirm) {
              wx.redirectTo({
                url: '/pages/register/register?type=0',
              })
            }
          }
        })
      } else {
        if (page == 'showQR') {
          this.getScan()
        } else {

          wx.navigateTo({
            url: '/pages/' + page + '/' + page,
          })
        }
      }
    }
  },
  getScan: function () {
    var that = this
    wx.scanCode({
      onlyFromCamera: false,
      success: function (res) {
        var parameter = res.result.split("?")
        if (parameter[0] != 'http://szcjwzn.cn/open.php' || parameter.length != 2) {
          util.notice('扫码失败', '解析二维码信息失败')
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
          util.notice('请重新尝试', '程序错误：' + err.message)
          return
        }
        if (p.type == '1') {
          util.scanopendoor(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, app.globalData.userInfo.f_id, p.Court, p.devid, p.time, p.secret, p.door, function (res) {
            if (res.Status == 'success') {
              if (res.Code == 'SHOWDEDUCTTIP') {
                wx.showModal({
                  title: `提示`,
                  content: `本次需要扣费${res.Deduction}元，确认是否执行?`,
                  success(res2) {
                    if (res2.confirm) {
                      util.scanopendoor(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, app.globalData.userInfo.f_id, p.Court, p.devid, p.time, p.secret, p.door, function (res3) {
                        if (res3.Status == 'success') {
                          util.notice('权限验证成功', '如果有疑问请联系小区管理员')
                        } else {
                          util.notice('验证失败', res3.Result)
                        }
                      }, "");
                    } else {

                    }
                  }
                })
              } else {
                util.notice('权限验证成功', '如果有疑问请联系小区管理员')
              }
            } else {
              util.notice('验证失败', res.Result)
            }
          }, "PRE-DEDUCT")
        } else if (p.type == '2') {
          util.scanshowpassword(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, app.globalData.userInfo.f_id, p.Court, p.devid, p.time, p.secret, p.m, function (res) {
            if (res.Status == 'success') {

              that.setData({
                password: res.Result,
                hiddenmodal: false
              })
            } else {
              util.notice('获取密码失败', res.Result)
            }
          })
        } else if (p.type == '3') {
          util.applypermission(app.globalData.userInfo.f_OpenID, app.globalData.userInfo.f_UnionID, p.userid, p.time, p.secret, p.data, function (res) {
            if (res.Status == 'success') {
              util.notice('扫码成功', '请等待授权！')
            } else {
              util.notice('添加权限失败', res.Result)
            }
          })
        } else if (p.type == '5') {
          util.notice('无效的类型', '请通过手机号或微信扫码添加成员')
        } else {
          util.notice('无效的类型', '二维码参数错误')
        }
      },
      complete: function () {
        //wx.hideLoading()
      }
    })
  },
  confirm: function () {
    var that = this
    that.setData({
      hiddenmodal: true,
      password: ''
    })
  },
  switchtab2: function () {
    if (flag) {
      flag = false
      setTimeout(function () {
        flag = true
      }, 1000)
      wx.redirectTo({
        url: '/pages/showqr/showqr',
      })
    }
  },
  switchtab3: function () {
    if (flag) {
      flag = false
      setTimeout(function () {
        flag = true
      }, 1000)
      wx.redirectTo({
        url: '/pages/my/my',
      })
    }
  }
})