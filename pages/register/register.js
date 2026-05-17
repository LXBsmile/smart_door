// pages/register/register.js
const app = getApp()
const { getJson } = require('../../utils/util');
var util = require('../../utils/util')
var fivemin
Page({
  data: {
    tel: null,
    code: null,
    ramcode: '',
    ramcodetel: null,
    loading: false,
    loadingtext: '获取验证码',
    disabled2: false,
    checked3: '0',
    disabled3: true,
    disabledProtocol: true,
    checkProtocol: '0',
    regType: '0', //0是注册，1是修改
    isCode: false,
    typeName: '登录',
    type: '1',
    backBtnName: '返回',
    statusBarHeight: 40,
  },
  //加载时判断是修改或是注册，并获取短信验证标志
  onLoad: function (options) {
    const win = wx.getWindowInfo();
    this.setData({
      statusBarHeight: win.statusBarHeight
    })
    this.setData({
      type: options.type
    })
    // wx.setNavigationBarTitle({
    //   title: options.type == '1' ? '修改' : '注册'
    // })
    this.setData({
      regType: options.type,
      // typeName: options.type == '1' ? '修改' : '注册'
    });
    this.setData({
      backBtnName: options.type == '1' ? '返回' : '回首页'
    })
    this.getMsgStatus()
  },
  handleNavBack() {
    if (this.type == '1') {
      wx.navigateBack()
    } else {
      wx.redirectTo({
        url: '/pages/index/index',
      })
    }
  },
  //删除已填，获取验证标志
  onPullDownRefresh: function () {
    this.setData({
      tel: null,
      code: null
    })
    this.getMsgStatus()
  },
  //输入手机号监听
  setTel: function (e) {
    var that = this
    that.setData({
      tel: e.detail.value
    })
  },
  //输入验证码监听
  setCode: function (e) {
    var that = this
    that.setData({
      code: e.detail.value
    })
  },
  //发送验证码
  getCode: function (res1) {
    if (!res1.detail.userInfo) {
      util.showErr("您拒绝了授权“智慧云门禁”小程序，如果要继续注册，请允许授权")
      return
    }

    if (/^1\d{10}$/.test(this.data.tel)) {
      var that = this
      that.setData({
        loading: true,
        loadingtext: '正在发送',
        disabled2: true
      })
      var num = "";
      for (var i = 0; i < 6; i++) {
        num += Math.floor(Math.random() * 10);
      }
      //console.log(num)
      util.sendIdentify(app.globalData.openId, num, that.data.tel, function (res) {
        if (res.Status == 'success') {
          that.setData({
            loading: false,
            ramcode: num,
            ramcodetel: that.data.tel
          })
          //五分钟后清除此验证码，但是如果五分钟之内再次申请，那么第二次就不是5分钟了，所以申请时必须先清除定时器
          clearTimeout(fivemin)
          fivemin = setTimeout(function () {
            that.setData({
              ramcode: '',
              ramcodetel: ''
            })
          }, 300000)
          var num2 = 60
          var in1 = setInterval(function () {
            that.setData({
              loadingtext: ('重新发送(' + num2 + ')')
            })
            num2--
            if (num2 == 0) {
              clearInterval(in1)
              that.setData({
                loadingtext: '获取验证码',
                disabled2: false
              })
            }
          }, 1000)
        } else {
          util.notice('发送验证码错误', res.Result)
          that.setData({
            loading: false,
            loadingtext: '获取验证码',
            disabled2: false
          })
        }
      })
    } else {
      util.showErr('请输入正确的账号')
    }
  },
  //勾选协议
  checkboxChange: function (e) {
    var that = this;
    if (e.detail.value[0] == '1') {
      that.setData({
        checked3: '1',
        disabled3: false
      })
    } else {
      that.setData({
        checked3: '0',
        disabled3: true
      })
    }
  },
  checkboxProtocolChange: function (e) {
    var that = this;
    if (e.detail.value[0] == '1') {
      that.setData({
        checkProtocol: '1',
        disabledProtocol: false
      })
    } else {
      that.setData({
        checkProtocol: '0',
        disabledProtocol: true
      })
    }
  },
  checkboxAllChange: function (e) {
    const checked = e.detail.value[0] == '1'
    this.setData({
      checked3: checked ? '1' : '0',
      disabled3: !checked,
      checkProtocol: checked ? '1' : '0',
      disabledProtocol: !checked
    })
  },
  finishRegisterFlow: function (user, options) {
    const opts = options || {}
    if (util.isRegisteredUser(user)) {
      util.activateUserSession(user.f_OpenID || app.globalData.openId, user)
      if (opts.goBack) {
        wx.showToast({
          title: this.data.typeName + '成功',
          icon: 'success',
          duration: 2000,
          mask: true,
          complete: function () {
            setTimeout(function () {
              wx.navigateBack({
                delta: 1
              })
            }, 1500)
          }
        })
        return
      }
      wx.reLaunch({
        url: '/pages/index/index',
      })
      return
    }
    if (user && user.f_id) {
      wx.navigateTo({
        url: '/pages/reg2/reg2?id=' + encodeURIComponent(user.f_id),
      })
      return
    }
    util.notice(this.data.typeName + '失败', '未获取到完整用户信息，请稍后重试')
  },
  //点击注册或修改:验证授权-->验证手机号-->验证验证码-->对比验证码-->注册
  registerUser: function (res) {
    //console.log(JSON.stringify(res))
    var that = this
    if (!res.detail.userInfo) {
      util.showErr("您拒绝了授权“微云扫码开门”小程序，如果要继续注册，请允许授权")
      return
    }
    if ((!/^1\d{10}$/.test(that.data.tel))) {
      util.showErr('请输入正确的账号')
      return
    }
    if (that.data.isCode && !(/^\d{6}$/.test(that.data.code))) {
      util.showErr('请输入6位验证码')
      //console.log(this.data.ramcode)
      return
    }
    if (that.data.isCode && (that.data.code != that.data.ramcode || that.data.tel != that.data.ramcodetel)) {
      util.showErr('验证码错误，请重新获取')
      return
    }
    if (that.data.checked3 != '1') {
      util.showErr('请先阅读并同意《用户使用条款》')
      return
    }
    if (that.data.checkProtocol != '1') {
      util.showErr('请先阅读并同意《用户隐私协议》')
      return
    }
    util.getOpenIdPromise().then(openId => {
      app.globalData.openId = openId;
      app.persistSession && app.persistSession()
      var userInfo = res.detail.userInfo
      util.getJson('RegisterUser', {
        'f_OpenID': openId,
        'f_Tel': that.data.tel,
        'f_gender': userInfo.gender,
        'f_nickname': userInfo.nickName,
        'f_headpic': userInfo.avatarUrl,
        'f_country': userInfo.country,
        'f_province': userInfo.province,
        'f_city': userInfo.city,
        'f_language': userInfo.language
        //user['encryptedData'] = res.detail.encryptedData
        //user['iv'] = res.detail.iv
      }, function (res2) {
        if (res2.Status == 'success') {
          if (that.data.regType == '1') {
            util.refreshUserInfo(function (user) {
              that.finishRegisterFlow(user, {
                goBack: true
              })
            }, false, true, true)
          } else {
            util.refreshUserInfo(function (user) {
              that.finishRegisterFlow(user)
            }, false, true, true)
          }
        } else {
          const resultText = String(res2.Result || '')
          util.notice(that.data.typeName + '失败', resultText || '请稍后重试')
        }
      })
    }).catch(err => {
      util.notice(that.data.typeName + '失败', err?.Result || '微信登录失败')
    })



  },
  //获取 是否需要验证短信 的状态
  getMsgStatus: function () {
    var that = this
    util.getJson('GetMobileMessageValidateSwitch', {}, function (res2) {
      console.log('res', res2)
      if (res2.Status == 'success') {
        that.setData({
          isCode: res2.MobileMessageValidate
        })
      } else {
        wx.showModal({
          title: '验证标志获取失败',
          content: res2.Result,
          showCancel: true,
          confirmText: '重试',
          complete: function () {
            getMsgStatus()
          }
        })
      }
      wx.stopPullDownRefresh()
    })
  },
  onUnload() { }
})
