// pages/my/my.js
const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js");
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
var flag = false

function hasValue(value) {
  return value !== undefined && value !== null && value !== ''
}

Page({
  data: {
    thisuser: {},
    gender: '',
    nickname: '',
    name: '',
    maskedName: '',
    userid: '',
    allcourts: [],
    thiscourt: {},
    thisCourtName: '',
    thisCourtID: '',
    pickerIndex: 0,
    showCourtPicker: false,
    hasCourtList: false,
    members: [],
    hiddenmodal: true,
    hiddenmodal2: true,
    inputedID: '',
    isMain: false,
    groupindex: 0,
    index: '0',
    isRegisted: app.globalData.isRegisted,
    maskedTel: '',
    passRecords: [],
    paymentRecords: [],
    money: featureMock.DEBUG_OPEN_PERMISSION ? '1999' : '',
    validity: featureMock.DEBUG_OPEN_PERMISSION ? '2025-12-31 00' : '',
    showDelay: false,
    showRecharge: false,
    showBalance: false,
    showValidity: false,
    showMembers: false,
    canVisitorManage: false,
    canOfflinePermission: false,
    bindType: '',
    userTagText: '',
    isAdmin: false,
    debugOpen: featureMock.DEBUG_OPEN_PERMISSION,
    statusBarHeight: 20,
    navBarHeight: 64,
    navContentHeight: 44,
    navRightSpace: 100
  },
  onLoad: function (options) {
    this.initCustomNav()
    //setTimeout(function(){flag = true}, 2000)
  },
  onReady: function () {
    setTimeout(function () {
      flag = true
    }, 500)
  },
  onShow: function () {
    var that = this
    util.refreshUserInfoOnTabShow(function () {
      that.refreshMyPageData({
        refreshCached: true
      })
    })
  },
  refreshMyPageData: function (options) {
    const opts = options || {}
    if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
      this.resetGuestInfo()
      if (this.data.debugOpen) {
        this.setData({
          passRecords: [],
          paymentRecords: []
        })
      }
      return
    }

    var that = this
    that.setData({
      isRegisted: app.globalData.isRegisted,
      userid: app.globalData.userInfo?.f_id || '',
      maskedTel: that.maskPhone(app.globalData.userInfo?.f_Tel),
      thisuser: app.globalData.userInfo || {},
      nickname: '',
      name: '',
      maskedName: ''
    })
    that.applyMyPageConfig()
    that.syncCourtPickerState()
    if (that.data.thisuser.f_Tel != app.globalData.userInfo?.f_Tel) {
      if (!app.globalData.offline) {
        that.setData({
          thisuser: app.globalData.userInfo,
          maskedTel: this.maskPhone(app.globalData.userInfo?.f_Tel)
        })
      }

    }
    if (that.data.groupindex != app.globalData.courtindex) {
      that.setData({
        groupindex: app.globalData.courtindex,
        index: app.globalData.courtindex,
        pickerIndex: Number(app.globalData.courtindex || 0)
      })
    }
    that.getMyInfo({
      refreshCached: !!opts.refreshCached
    })
  },
  onHide: function () { },
  onUnload: function () { },
  onPullDownRefresh: function () {
    var that = this
    if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
      that.resetGuestInfo()
      wx.stopPullDownRefresh()
      return
    }
    util.refreshUserInfo(function () {
      if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
        that.resetGuestInfo()
        wx.stopPullDownRefresh()
        return
      }
      that.setData({
        members: [],
        isMain: false
      })
      that.getMyInfo({
        refreshCached: true
      })
    }, false, false, true)
    setTimeout(function () {
      wx.stopPullDownRefresh()
    }, 1000)
  },
  initCustomNav: function () {
    let statusBarHeight = 20
    let navContentHeight = 44
    let navBarHeight = navContentHeight
    let navRightSpace = 100

    try {
      const systemInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      statusBarHeight = Number(systemInfo.statusBarHeight) || statusBarHeight

      if (wx.getMenuButtonBoundingClientRect) {
        const menuRect = wx.getMenuButtonBoundingClientRect()
        if (menuRect && menuRect.width) {
          const topGap = Math.max(menuRect.top - statusBarHeight, 4)
          navContentHeight = menuRect.height + topGap * 2
          navBarHeight = navContentHeight
          navRightSpace = Math.ceil((systemInfo.windowWidth || 375) - menuRect.left) + 8
        }
      }
    } catch (e) { }

    this.setData({
      statusBarHeight,
      navBarHeight,
      navContentHeight,
      navRightSpace
    })
  },
  syncCourtPickerState: function (storedState) {
    const stored = storedState || util.getStoredCourtState()
    if (!stored.currentCourt) {
      this.setData({
        allcourts: [],
        thiscourt: {},
        thisCourtName: '',
        thisCourtID: '',
        pickerIndex: 0,
        showCourtPicker: false,
        hasCourtList: false
      })
      return stored
    }

    const hasCourtList = !!(stored.groups && stored.groups.length)
    this.setData({
      allcourts: stored.groups,
      thiscourt: stored.currentCourt,
      thisCourtName: stored.currentCourt.GroupName || '',
      thisCourtID: stored.currentCourt.f_id || '',
      pickerIndex: Number(stored.index || 0),
      groupindex: stored.index,
      index: String(stored.index),
      showCourtPicker: !!(app.globalData.isRegisted && hasCourtList),
      hasCourtList: hasCourtList
    })
    return stored
  },
  refreshCourtPickerState: function (options) {
    const that = this
    const opts = options || {}
    util.ensureCourtState(function (stored) {
      that.syncCourtPickerState(stored)
      if (stored.currentCourt) {
        that.applyMyPageConfig()
        that.loadCourtBackendInfo(stored.currentCourt.f_id, {
          refreshCached: true
        })
      }
    }, {
      courtId: that.data.thisCourtID || app.globalData.currentCourtId || app.thisCourt?.f_id || '',
      force: !!opts.force,
      showError: !!opts.force,
      goRegist: false
    })
  },
  getBalanceValidateCache: function (courtId) {
    const cache = this._balanceValidateInfoByCourtId && typeof this._balanceValidateInfoByCourtId === 'object'
      ? this._balanceValidateInfoByCourtId
      : {}
    const key = String(courtId || this.data.thiscourt.f_id || this.data.thisCourtID || '').trim()
    if (!key || !cache[key] || typeof cache[key] !== 'object') {
      return null
    }
    return Object.assign({}, cache[key])
  },
  applyMyPageConfig: function () {
    const courtId = this.data.thiscourt.f_id || this.data.thisCourtID || app.thisCourt?.f_id
    const config = appService.getMyPageConfig(courtId)
    const balanceValidateInfo = this.getBalanceValidateCache(courtId) || {}
    const hasBalanceValidity = hasValue(balanceValidateInfo.f_validity)
    const displayName = hasValue(config.name) ? String(config.name) : ''
    const userTagText = [
      config.isAdmin ? '管理员' : '',
      config.bindType || ''
    ].filter(Boolean).join(' · ')
    const nextData = {
      showDelay: config.showDelay,
      showRecharge: config.showRecharge,
      showBalance: config.showBalance,
      showValidity: config.showValidity,
      showMembers: config.showMembers,
      canVisitorManage: config.canVisitorManage,
      canOfflinePermission: config.canOfflinePermission,
      bindType: config.bindType || '',
      isAdmin: !!config.isAdmin,
      userTagText: userTagText,
      nickname: displayName,
      name: displayName,
      maskedName: this.maskName(displayName),
      validity: hasBalanceValidity
        ? balanceValidateInfo.f_validity
        : (hasValue(config.validity) ? config.validity : '--')
    }
    if (hasValue(balanceValidateInfo.f_money)) {
      nextData.money = balanceValidateInfo.f_money
    }
    this.setData(nextData)
  },
  resetGuestInfo: function () {
    this._balanceValidateInfoByCourtId = {}
    this._balanceValidatePendingCourtId = ''
    this.setData({
      isRegisted: false,
      allcourts: [],
      thiscourt: {},
      thisCourtName: '',
      thisCourtID: '',
      pickerIndex: 0,
      showCourtPicker: false,
      hasCourtList: false,
      members: [],
      isMain: false,
      money: '',
      validity: '',
      index: '0',
      bindType: '',
      userTagText: '',
      isAdmin: false,
      nickname: '',
      name: '',
      maskedName: '',
      thisuser: {},
      userid: '',
      maskedTel: '',
      showDelay: false,
      showRecharge: false,
      showBalance: false,
      showValidity: false,
      showMembers: false,
      canVisitorManage: false,
      canOfflinePermission: false
    })
  },
  maskPhone: function (tel) {
    const value = String(tel || '')
    if (value.length !== 11) return value
    return value.slice(0, 3) + '****' + value.slice(7)
  },
  maskName: function (name) {
    const value = String(name || '')
    if (!value) return ''
    return value.slice(0, 1) + '**'
  },
  loadCourtBackendInfo: function (courtId, options) {
    var that = this
    const opts = options || {}
    const forceRefresh = !!opts.refreshCached
    const resolvedCourtId = String(courtId || '').trim()
    const currentCourtId = function () {
      return String(that.data.thiscourt.f_id || that.data.thisCourtID || '').trim()
    }
    const normalizeBalanceValidateInfo = function (source) {
      const response = source && typeof source === 'object' ? source : {}
      const result = response.Result && typeof response.Result === 'object'
        ? response.Result
        : null
      const first = Array.isArray(response.Result) ? (response.Result[0] || {}) : null
      const info = result || first || response
      return info && typeof info === 'object' ? info : {}
    }
    if (!courtId) {
      that._balanceValidatePendingCourtId = ''
      that.setData({
        money: that.data.debugOpen ? '1999' : '',
        validity: that.data.debugOpen ? '2025-12-31 00' : '',
        bindType: '',
        userTagText: '',
        isAdmin: false
      })
      return
    }
    util.requestCourtConfigurationInfo(courtId, function () {
      if (String(that.data.thiscourt.f_id || '') !== String(courtId || '')) return
      that.applyMyPageConfig()
    }, {
      showError: true
    })
    const applyBalanceValidateInfo = function (source, backendInfo) {
      const info = normalizeBalanceValidateInfo(source)
      const backend = backendInfo || {}
      const money = hasValue(info.f_money) ? info.f_money : backend.f_money
      const validity = hasValue(info.f_validity) ? info.f_validity : backend.f_validity
      const canShowBalance = appService.getMyPageConfig(resolvedCourtId).showRecharge

      if (!that._balanceValidateInfoByCourtId || typeof that._balanceValidateInfoByCourtId !== 'object') {
        that._balanceValidateInfoByCourtId = {}
      }
      if (resolvedCourtId) {
        that._balanceValidateInfoByCourtId[resolvedCourtId] = {
          f_money: hasValue(info.f_money) ? info.f_money : '',
          f_validity: hasValue(info.f_validity) ? info.f_validity : ''
        }
      }

      that.setData({
        money: hasValue(money) ? money : (that.data.debugOpen ? '1999' : ''),
        validity: hasValue(validity) ? validity : (that.data.debugOpen ? '2025-12-31 00' : '--'),
        showBalance: canShowBalance && hasValue(money),
        showValidity: true
      })
    }
    const refreshBalanceValidateInfo = function (backendInfo) {
      if (that._balanceValidatePendingCourtId === resolvedCourtId) {
        return
      }
      that._balanceValidatePendingCourtId = resolvedCourtId
      util.getJson('GetUserBalanceValidate', {
        'CourtID': courtId
      }, function (res3) {
        if (that._balanceValidatePendingCourtId === resolvedCourtId) {
          that._balanceValidatePendingCourtId = ''
        }
        if (currentCourtId() !== resolvedCourtId) {
          return
        }
        if (res3 && res3.Status == 'success') {
          applyBalanceValidateInfo(res3, backendInfo)
          return
        }
        if (forceRefresh) {
          util.noticeRequestFailOnce('GetUserBalanceValidate:' + resolvedCourtId, '获取余额信息失败', res3, '请稍后重试')
        }
        applyBalanceValidateInfo(null, backendInfo)
      })
    }
    const applyBackEndUserInfo = function (res) {
      that.applyMyPageConfig()
      if (res && res.Status == 'success') {
        const backendInfo = appService.getBackEndUserInfo(courtId) || res || {}
        const backendName = hasValue(backendInfo.f_name) ? String(backendInfo.f_name) : ''
        const userTagText = [
          appService.isBackendEnabled(backendInfo.f_IsAdmin) ? '管理员' : '',
          backendInfo.f_type || ''
        ].filter(Boolean).join(' · ')
        that.setData({
          money: backendInfo.f_money != null ? backendInfo.f_money : (that.data.debugOpen ? '1999' : ''),
          validity: backendInfo.f_validity || (that.data.debugOpen ? '2025-12-31 00' : '--'),
          nickname: backendName,
          name: backendName,
          maskedName: that.maskName(backendName),
          bindType: backendInfo.f_type || '',
          isAdmin: appService.isBackendEnabled(backendInfo.f_IsAdmin),
          userTagText: userTagText,
          maskedTel: that.maskPhone(backendInfo.f_tel || app.globalData.userInfo?.f_Tel)
        })
        refreshBalanceValidateInfo(backendInfo)
        return
      }
      refreshBalanceValidateInfo({})
    }
    const cachedBackEndUserInfo = util.getStoredBackEndUserInfo({
      courtId: courtId
    })
    if (!forceRefresh && cachedBackEndUserInfo && cachedBackEndUserInfo.Status == 'success') {
      applyBackEndUserInfo(cachedBackEndUserInfo)
      return
    }
    util.refreshBackEndUserInfo(applyBackEndUserInfo, {
      courtId: courtId,
      force: forceRefresh,
      showError: forceRefresh
    })
  },
  getMyInfo: function (options) {
    var that = this
    const opts = options || {}
    if (!util.isRegisteredUser(app.globalData.userInfo) || !app.globalData.isRegisted) {
      that.resetGuestInfo()
      return
    }
    that.applyMyPageConfig()
    // 先加载已有信息
    // that.setData({
    //   thisuser: app.globalData.userInfo,
    //   gender: app.globalData.userInfo.f_gender == '1' ? '男' : '女',
    //   nickname: app.globalData.userInfo.f_nickname,
    //   tel: app.globalData.userInfo?.f_Tel,
    //   maskedTel: that.maskPhone(app.globalData.userInfo?.f_Tel),
    //   userid: app.globalData.userInfo.f_id,
    //   name: app.globalData.userInfo.f_nickname,
    //   maskedName: '',
    //   isRegisted: app.globalData.isRegisted,
    //   passRecords: [],
    //   paymentRecords: []
    // })
    util.ensureCourtState(function (stored) {
      if (!stored.currentCourt) {
        that.setData({
          allcourts: [],
          thiscourt: {
            GroupName: ''
          },
          thisCourtName: '',
          thisCourtID: '',
          pickerIndex: 0,
          showCourtPicker: false,
          hasCourtList: false
        })
        util.noticeArea()
        return
      }
      const hasCourtList = !!(stored.groups && stored.groups.length)
      that.setData({
        index: stored.index,
        pickerIndex: Number(stored.index || 0),
        allcourts: stored.groups,
        thiscourt: stored.currentCourt,
        thisCourtName: stored.currentCourt.GroupName || '',
        thisCourtID: stored.currentCourt.f_id || '',
        showCourtPicker: hasCourtList,
        hasCourtList: hasCourtList
      })
      that.applyMyPageConfig()
      that.loadCourtBackendInfo(that.data.thiscourt.f_id, {
        refreshCached: true
      })
      util.getJson('GetFamilyMembers', {
        'CourtID': that.data.thiscourt.f_id
      }, function (res2) {
        if (res2.Status == 'success') {
          that.setData({
            members: res2.Family,
            isMain: res2.IsMainFamilyMember
          })
        } else {
          util.notice("加载家庭成员信息失败", res2.Result)
        }
      })
    }, {
      courtId: that.data.thisCourtID || app.globalData.currentCourtId || app.thisCourt?.f_id || '',
      force: !!opts.refreshCached,
      showError: !!opts.refreshCached,
      goRegist: false
    })
  },
  modifytel: function () {
    if (app.globalData.offline) {
      wx.showModal({
        title: '无网络',
        content: '无网络，请连接网络后再试！',
      })
      return;
    }
    wx.navigateTo({
      url: '/pages/login/login',
    })
  },
  logout: function () {
    app.clearData();
    wx.reLaunch({
      url: '/pages/index/index',
    })
  },
  morecourts: function (e) {
    var that = this
    var index = e.detail.value
    const selectedCourt = that.data.allcourts[index]
    if (!selectedCourt) return
    that.setData({
      thiscourt: selectedCourt,
      thisCourtName: selectedCourt.GroupName,
      thisCourtID: selectedCourt.f_id,
      groupindex: index,
      index: String(index),
      pickerIndex: Number(index)
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(selectedCourt, Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = selectedCourt
    }
    that.applyMyPageConfig()
    that.loadCourtBackendInfo(that.data.thiscourt.f_id, {
      refreshCached: true
    })
    app.globalData.courtindex = index; //增加小区记忆
    util.getJson('GetFamilyMembers', {
      'CourtID': that.data.thiscourt.f_id
    }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          members: res.Family,
          isMain: res.IsMainFamilyMember
        })
      } else {
        util.notice("加载家庭成员信息失败", res.Result)
      }
    })
    util.refreshCourtList(function () {
      const stored = util.getStoredCourtState({
        courtId: selectedCourt.f_id
      })
      that.syncCourtPickerState(stored)
      if (stored.currentCourt) {
        that.applyMyPageConfig()
      }
    }, {
      courtId: selectedCourt.f_id,
      showError: true
    })
  },
  addmem: function () {
    this.setData({
      hiddenmodal: false
    })
  },
  confirm: function () {
    var that = this
    util.getJson('UpdateFamilyRelations', {
      'CourtID': that.data.thiscourt.f_id,
      'f_Tel': that.data.inputedID
    }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          hiddenmodal: true,
          inputedID: ''
        })
        util.getJson('GetFamilyMembers', {
          'CourtID': that.data.thiscourt.f_id
        }, function (res2) {
          if (res2.Status == 'success') {
            that.setData({
              members: res2.Family,
              isMain: res2.IsMainFamilyMember
            })
          } else {
            util.notice("加载家庭成员信息失败", res2.Result)
          }
        })
      } else if (res.ErrorCode == 'UserNotFound') {
        that.setData({
          hiddenmodal: true,
          inputedID: '',
          hiddenmodal2: false
        })
        util.refreshUserInfo(function () {
          that.drawQR(that.data.thiscourt.f_id, res.UserID)
        }, false, false, true)
      } else {
        util.notice('添加家庭成员失败', res.Result)
      }
    })
  },
  cancel: function () {
    this.setData({
      hiddenmodal: true,
      inputedID: ''
    })
  },
  complete2: function () {
    var that = this
    that.setData({
      hiddenmodal2: true
    })
    that.getMyInfo()
  },
  setMemberID: function (e) {
    var that = this
    that.setData({
      inputedID: e.detail.value
    })
  },
  deleteit: function (e) {
    var that = this
    //console.log(JSON.stringify(e))
    wx.showModal({
      title: '确定删除该成员？',
      content: e.target.dataset.it,
      success: function (res) {
        if (res.confirm) {
          util.getJson('DeleteMemberFromFamily', {
            'DeleteUnionID': e.target.dataset.id,
            'CourtID': that.data.thiscourt.f_id
          }, function (res) {
            if (res.Status == 'success') {
              util.getJson('GetFamilyMembers', {
                'CourtID': that.data.thiscourt.f_id
              }, function (res2) {
                if (res2.Status == 'success') {
                  that.setData({
                    members: res2.Family,
                    isMain: res2.IsMainFamilyMember
                  })
                } else {
                  util.notice("加载家庭成员信息失败", res2.Result)
                }
              })
            } else {
              util.notice('删除失败', res.Result)
            }
          })
        }
      }
    })

  },
  drawQR: function (groupID, userID) {
    var that = this
    const user = util.getStoredUserInfo() || app.globalData.userInfo || {}
    var date = new Date()
    var content = 'time=' + ("00" + date.getFullYear()).substr(-2) + ("00" + (date.getMonth() + 1)).substr(-2) + ("00" + date.getDate()).substr(-2) + ("00" + date.getHours()).substr(-2) + ("00" + date.getMinutes()).substr(-2) + '&tel=' + (user.f_Tel || '') + '&familyGroup=' + (user.f_UnionID || '') + '&group=' + groupID + '&userid=' + userID
    //console.log(content)
    var url = 'http://szcjwzn.cn/open.php?type=5&content=' + util.encode(content)
    //console.log(url)
    QR.api.draw(url, 'mycanvas', 200, 200);
    if (!that.data.hiddenmodal2) {
      setTimeout(function () {
        if (!that.data.hiddenmodal2) {
          that.drawQR(groupID, userID)
        }
      }, 180000)
    }
  },

  switchtab1: function () {
    if (flag) {
      wx.redirectTo({
        url: '/pages/index/index',
      })
    }
  },
  switchtab2: function () {
    if (!this.data.canOfflinePermission) return
    if (flag) {
      wx.redirectTo({
        url: '/pages/showqr/showqr',
      })
    }
  },
  gotoPassRecord: function () {
    if (!appService.isApiAvailable('passRecord')) {
      util.notice('提示', appService.getApiUnavailableMessage('passRecord'))
      return
    }
    wx.navigateTo({
      url: '/pages/passrecord/passrecord',
    })
  },
  gotoPaymentRecord: function () {
    if (!appService.isApiAvailable('paymentRecord')) {
      util.notice('提示', appService.getApiUnavailableMessage('paymentRecord'))
      return
    }
    wx.navigateTo({
      url: '/pages/paymentrecord/paymentrecord',
    })
  },
  gotoHelp2: function () {
    if (!this.data.hasCourtList) return
    wx.navigateTo({
      url: '/pages/help/help',
    })
  },
  gotoMembers: function () {
    if (!this.data.showMembers) return
    wx.navigateTo({
      url: '/pages/members/members',
    })
  },
  gotocharge: function () {
    if (!this.data.isRegisted || !this.data.showRecharge) return
    wx.navigateTo({
      url: '/pages/charge/charge?courtid=' + this.data.thiscourt.f_id + '&courtname=' + this.data.thiscourt.GroupName,
    })
  },
  gotodelay: function () {
    if (!this.data.isRegisted || !this.data.showDelay) return
    wx.navigateTo({
      url: '/pages/chargedelay/chargedelay?courtid=' + this.data.thiscourt.f_id + '&courtname=' + this.data.thiscourt.GroupName,
    })
  },
})
