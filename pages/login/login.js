// pages/login/login.js
const app = getApp()
const util = require('../../utils/util')
const appService = require('../../utils/services/appService')

Page({
  data: {
    protocols: [],
    showProtocolConfirm: false,
    directLoginAvailable: false,
    maskedPhone: '',
    protocolActionText: '手机号授权登录',
    primaryButtonText: '一键授权登录',
    cardDesc: '请先勾选协议，再进行手机号快捷授权登录。'
  },
  onShow() {
    this.syncLoginEntry()
    this.preparePageLoginState()
  },
  getBackendResultMessage(res) {
    const result = res && res.Result
    if (!result) return ''
    if (typeof result === 'string') return result
    if (typeof result === 'object') {
      const message = result.errmsg || result.message || result.Result
      if (message) return String(message)
      try {
        return JSON.stringify(result)
      } catch (e) {
        return ''
      }
    }
    return String(result)
  },
  finishAuthFlow(user, backendRes) {
    if (util.isRegisteredUser(user)) {
      wx.reLaunch({
        url: '/pages/index/index',
      })
      return
    }
    if (user && user.f_id) {
      wx.redirectTo({
        url: '/pages/reg2/reg2?id=' + encodeURIComponent(user.f_id),
      })
      return
    }
    util.notice('登录失败', this.getBackendResultMessage(backendRes) || '未获取到完整用户信息，请稍后重试')
  },
  getUserPhone(user) {
    const source = user || {}
    return String(
      source.f_Tel ||
      source.f_tel ||
      source.Tel ||
      source.tel ||
      source.Phone ||
      source.phone ||
      ''
    ).trim()
  },
  maskPhone(phone) {
    const value = String(phone || '').replace(/\s/g, '')
    if (value.length <= 7) return value
    return value.slice(0, 3) + '****' + value.slice(-4)
  },
  syncLoginEntry(user) {
    const currentUser = user === undefined
      ? (app.globalData.userInfo || app.globalData.loginHintUserInfo)
      : user
    const hasLoginSession = !!(
      app.globalData.openId &&
      app.globalData.isRegisted &&
      util.isRegisteredUser(app.globalData.userInfo)
    )
    const hasLoginHint = !!(
      app.globalData.loginHintOpenId &&
      util.isRegisteredUser(currentUser)
    )
    const directLoginAvailable = hasLoginSession || hasLoginHint
    const phoneUser = currentUser || app.globalData.userInfo || app.globalData.loginHintUserInfo
    const phone = this.getUserPhone(phoneUser) || this.getUserPhone(app.globalData.backendUserInfo)
    const maskedPhone = directLoginAvailable ? this.maskPhone(phone) : ''

    this.setData({
      directLoginAvailable,
      maskedPhone,
      primaryButtonText: directLoginAvailable ? '登录' : '一键授权登录',
      cardDesc: directLoginAvailable
        ? '已识别当前微信账号，确认号码并勾选协议后可直接登录。'
        : '请先勾选协议，再进行手机号快捷授权登录。'
    })
  },
  preparePageLoginState() {
    if (typeof app.prefetchLoginHint !== 'function') {
      return
    }

    app.prefetchLoginHint((user) => {
      this.syncLoginEntry(user)
    })
  },
  ensureProtocolAgreement(agreedByDialog) {
    if (this.data.protocols.length === 1) {
      if (this.data.showProtocolConfirm) {
        this.setData({
          showProtocolConfirm: false
        })
      }
      return true
    }

    if (!agreedByDialog) {
      this.showProtocolConfirm()
      return false
    }

    this.setData({
      protocols: ['1'],
      showProtocolConfirm: false
    })
    return true
  },
  loadCurrentUser(openId) {
    return util.getUserInfo(openId).then(res => {
      if (res && res.Status === 'success') {
        const user = res.User || null
        app.globalData.userInfo = user
        app.globalData.isRegisted = util.isRegisteredUser(user)
        if (typeof app.setLoginHint === 'function') {
          app.setLoginHint(openId, user)
        }
        app.persistSession && app.persistSession()
        this.syncLoginEntry(user)
        return user || {}
      }
      return {}
    }).catch(() => ({}))
  },
  finishLoginByRegisterResult(res) {
    const that = this
    if (res && res.Status == 'success') {
      util.refreshUserInfo(function (user, userInfoRes) {
        that.syncLoginEntry(user)
        that.finishAuthFlow(user, userInfoRes)
      }, false, true, true)
      return
    }

    const result = String(res && res.Result ? res.Result : '')
    util.notice('登录失败', result || '请稍后重试')
  },
  handleDirectLogin(e) {
    const agreedByDialog = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.agree === '1'
    if (!this.ensureProtocolAgreement(agreedByDialog)) {
      return
    }

    const currentUser = app.globalData.userInfo || null
    if (app.globalData.openId && app.globalData.isRegisted && util.isRegisteredUser(currentUser)) {
      this.finishAuthFlow(currentUser)
      return
    }

    const activatedUser = typeof app.activateLoginFromHint === 'function'
      ? app.activateLoginFromHint()
      : null
    if (util.isRegisteredUser(activatedUser)) {
      this.syncLoginEntry(activatedUser)
      this.finishAuthFlow(activatedUser)
      return
    }

    if (typeof app.prefetchLoginHint !== 'function') {
      util.notice('登录失败', '当前微信未查询到已注册信息，请使用手机号授权登录')
      return
    }

    app.prefetchLoginHint((user) => {
      const nextUser = util.isRegisteredUser(user) && typeof app.activateLoginFromHint === 'function'
        ? app.activateLoginFromHint()
        : null
      this.syncLoginEntry(nextUser || user)
      if (util.isRegisteredUser(nextUser)) {
        this.finishAuthFlow(nextUser)
        return
      }
      util.notice('登录失败', '当前微信未查询到已注册信息，请使用一键授权登录')
    })
  },
  gotPhoneNumber(e) {
    const agreedByDialog = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.agree === '1'
    if (!this.ensureProtocolAgreement(agreedByDialog)) {
      return
    }
    if (!appService.isApiAvailable('phoneAuthorization')) {
      util.notice('登录失败', appService.getApiUnavailableMessage('phoneAuthorization'))
      return
    }
    if (e.detail.errMsg && e.detail.errMsg.indexOf('fail') > -1) {
      util.showErr('您已取消手机号授权，请重新发起授权登录')
      return
    }
    if (!e.detail.code) {
      util.notice('登录失败', '微信手机号授权凭证为空')
      return
    }
    const that = this
    util.getOpenIdPromise().then(openId => {
      app.globalData.openId = openId
      app.persistSession && app.persistSession()
      return that.loadCurrentUser(openId).then(user => {
        return appService.getPhoneNumberByCode({
          openId: openId,
          unionId: user.f_UnionID,
          phoneCode: e.detail.code
        }).then(phoneResult => {
          return appService.registerUserWithPhone({
            openId: openId,
            tel: phoneResult.PhoneNumber,
            profile: user
          })
        })
      })
    }).then(res => {
      that.finishLoginByRegisterResult(res)
    }).catch(err => {
      util.notice('登录失败', err?.Result || '请稍后重试')
    })
  },
  checkboxChange(e) {
    this.setData({
      protocols: e.detail.value
    })
  },
  showProtocolConfirm() {
    this.setData({
      protocolActionText: this.data.directLoginAvailable ? '登录' : '手机号授权登录',
      showProtocolConfirm: true
    })
  },
  showOtherPhoneProtocolConfirm() {
    this.setData({
      protocolActionText: '其他号码授权登录',
      showProtocolConfirm: true
    })
  },
  closeProtocolConfirm() {
    this.setData({
      showProtocolConfirm: false
    })
  },
  noop() {
  }
})
