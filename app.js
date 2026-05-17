var util = require('./utils/util')
const config = require('./config.js')
const appService = require('./utils/services/appService')

const STORE_KEY = 'store'

function normalizeStoredUserInfo(openId, userInfo) {
  if (!userInfo || typeof userInfo !== 'object') {
    return null
  }

  const storedOpenId = String(userInfo.f_OpenID || '').trim()
  const currentOpenId = String(openId || '').trim()

  if (storedOpenId && currentOpenId && storedOpenId !== currentOpenId) {
    return null
  }

  return userInfo
}

function createDefaultGlobalData() {
  return {
    isRegisted: false,
    userInfo: null,
    openId: null,
    groups: [],
    courtindex: 0,
    offline: false,
    networkType: '4g',
    currentCourtId: '',
    currentCourtName: '',
    backendUserInfo: null,
    backendUserInfoMap: {},
    courtConfigurationInfo: null,
    courtConfigurationInfoMap: {},
    loginHintOpenId: null,
    loginHintUserInfo: null,
    loginHintIsRegistered: false
  }
}

App({
  appService,
  onLaunch: function () {
    var _this = this
    this.restoreSession()

    wx.getNetworkType({
      success: function (res3) {
        _this.globalData.offline = res3.networkType == 'none'
        _this.globalData.networkType = res3.networkType
        if (_this.globalData.offline) {
          return
        }
        _this.prefetchLoginHint()
      }
    })

    wx.onNetworkStatusChange(function (res) {
      _this.globalData.offline = !res.isConnected
      _this.globalData.networkType = res.networkType
      if (res.isConnected) {
        _this.prefetchLoginHint()
      }
    })
  },
  onHide: function () {
    this.persistSession()
  },
  onShow: function () {
    this.restoreSession()
    this.requestCurrentCourtConfiguration()
  },
  persistSession() {
    const storedUserInfo = this.globalData.userInfo && typeof this.globalData.userInfo === 'object'
      ? this.globalData.userInfo
      : null
    const isRegisted = !!this.globalData.isRegisted && util.isRegisteredUser(storedUserInfo)

    wx.setStorageSync(STORE_KEY, {
      openId: this.globalData.openId,
      courtindex: this.globalData.courtindex || 0,
      userInfo: storedUserInfo,
      isRegisted: isRegisted
    })
  },
  restoreSession() {
    const saved = wx.getStorageSync(STORE_KEY) || {}
    const openId = saved.openId || null
    const storedUserInfo = normalizeStoredUserInfo(openId, saved.userInfo)

    this.globalData.openId = openId
    this.globalData.courtindex = typeof saved.courtindex === 'number' ? saved.courtindex : 0
    this.globalData.userInfo = storedUserInfo
    this.globalData.isRegisted = !!(
      storedUserInfo &&
      util.isRegisteredUser(storedUserInfo) &&
      saved.isRegisted !== false
    )
  },
  hasLoginSession() {
    return !!(
      this.globalData.openId &&
      this.globalData.isRegisted &&
      util.isRegisteredUser(this.globalData.userInfo)
    )
  },
  setLoginHint(openId, user) {
    const matchedUser = util.isRegisteredUser(user) ? user : null
    const resolvedOpenId = String(
      openId ||
      matchedUser?.f_OpenID ||
      this.globalData.loginHintOpenId ||
      this.globalData.openId ||
      ''
    ).trim()

    this.globalData.loginHintOpenId = resolvedOpenId || null
    this.globalData.loginHintUserInfo = matchedUser
    this.globalData.loginHintIsRegistered = !!matchedUser

    return matchedUser
  },
  prefetchLoginHint(func) {
    if (this.globalData.offline) {
      if (typeof func === 'function') {
        func(this.globalData.loginHintUserInfo || null)
      }
      return
    }

    if (this.loginHintPending) {
      if (typeof func === 'function') {
        this.loginHintQueue.push(func)
      }
      return
    }

    this.loginHintPending = true

    const finish = (openId, user) => {
      const matchedUser = this.setLoginHint(openId, user)
      this.loginHintPending = false

      const queue = Array.isArray(this.loginHintQueue)
        ? this.loginHintQueue.slice()
        : []
      this.loginHintQueue = []

      if (typeof func === 'function') {
        func(matchedUser)
      }

      queue.forEach((callback) => {
        if (typeof callback === 'function') {
          callback(matchedUser)
        }
      })
    }

    util.getOpenIdPromise().then((openId) => {
      util.getUserInfo(openId).then((res) => {
        if (res && res.Status === 'success') {
          finish(openId, res.User || null)
          return
        }
        finish(openId, null)
      }).catch(() => {
        finish(openId, null)
      })
    }).catch(() => {
      finish(this.globalData.openId || null, null)
    })
  },
  activateLoginFromHint() {
    const user = this.globalData.loginHintUserInfo || null
    const openId = String(
      this.globalData.loginHintOpenId ||
      user?.f_OpenID ||
      this.globalData.openId ||
      ''
    ).trim()

    if (!openId || !util.isRegisteredUser(user)) {
      return null
    }

    this.globalData.openId = openId
    this.globalData.userInfo = user
    this.globalData.isRegisted = true
    this.persistSession()

    return user
  },
  requestCurrentCourtConfiguration(func) {
    const courtId = this.globalData.currentCourtId || this.thisCourt?.f_id || ''
    if (!courtId || !util.isRegisteredUser(this.globalData.userInfo)) {
      if (typeof func === 'function') func(null)
      return
    }
    util.requestCourtConfigurationInfo(courtId, func)
  },
  setCurrentCourt(court, index) {
    const nextCourt = court || {}
    const nextIndex = typeof index === 'number' ? index : 0
    const courtId = nextCourt.f_id || ''
    const previousCourtId = this.globalData.currentCourtId || ''
    const backendMap = this.globalData.backendUserInfoMap && typeof this.globalData.backendUserInfoMap === 'object'
      ? this.globalData.backendUserInfoMap
      : {}
    const configurationMap = this.globalData.courtConfigurationInfoMap && typeof this.globalData.courtConfigurationInfoMap === 'object'
      ? this.globalData.courtConfigurationInfoMap
      : {}
    this.globalData.courtindex = nextIndex
    this.globalData.currentCourtId = courtId
    this.globalData.currentCourtName = nextCourt.GroupName || ''
    this.globalData.backendUserInfo = courtId ? (backendMap[courtId] || null) : null
    this.globalData.courtConfigurationInfo = courtId ? (configurationMap[courtId] || null) : null
    this.thisCourt = nextCourt
    this.persistSession()
    if (courtId && courtId !== previousCourtId) {
      this.requestCurrentCourtConfiguration()
    }
  },
  loginHintPending: false,
  loginHintQueue: [],
  globalData: createDefaultGlobalData(),
  getConfig() {
    return config
  },
  clearData() {
    this.globalData = createDefaultGlobalData()
    this.thisCourt = {}
    this.loginHintPending = false
    this.loginHintQueue = []
    wx.clearStorageSync()
  },
  thisCourt: {}
})
