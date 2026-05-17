const config = require('../config')
const CryptoJS = require('CryptoJS/aes')
const _doorQrKey = CryptoJS.enc.Utf8.parse('aabbccddeeffgghhiijjkkllmmnnoopp');
const _doorQrIv = CryptoJS.enc.Utf8.parse('aabbccddeeffgghh');
let showing = false;
let userInfoRefreshPending = false
let userInfoRefreshQueue = []
let backEndUserInfoRefreshQueueMap = {}
let courtConfigurationInfoRefreshQueueMap = {}
let requestFailNoticeMap = {}
const REQUEST_CACHE_BY_PARAMS = {
  GetBackEndUserInfo: true,
  GetCourtByID: true,
  GetCourtConfigurationInfo: true,
  GetCourtNoticeByID: true,
  GetFamilyMembers: true,
  GetMyShareKeyList: true,
  GetUserBalanceValidate: true,
  GetUserMJTKLog: true,
  GetUserPayLog: true,
  GetVisitorsKeyList: true,
  KeyList: true
}

function normalizeRequestCacheValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeRequestCacheValue)
  }
  if (value && typeof value === 'object') {
    const normalized = {}
    Object.keys(value).sort().forEach(function (key) {
      if (key === 'TransactionID' || key === 'Format' || key === 'DataBaseURL') {
        return
      }
      const nextValue = normalizeRequestCacheValue(value[key])
      if (nextValue !== undefined) {
        normalized[key] = nextValue
      }
    })
    return normalized
  }
  return value
}

function stableSerializeCacheValue(value) {
  if (Array.isArray(value)) {
    return '[' + value.map(stableSerializeCacheValue).join(',') + ']'
  }
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stableSerializeCacheValue(value[key])
    }).join(',') + '}'
  }
  return JSON.stringify(value)
}

function hashCacheKey(text) {
  let hash = 2166136261
  const source = String(text || '')
  for (let i = 0; i < source.length; i++) {
    hash ^= source.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16)
}

function getRequestCacheKey(json) {
  const transactionCode = String(json && json.TransactionCode || '').trim()
  if (!transactionCode) return ''
  if (!REQUEST_CACHE_BY_PARAMS[transactionCode]) {
    return transactionCode
  }

  const payload = normalizeRequestCacheValue(json || {})
  const serialized = stableSerializeCacheValue(payload)
  return transactionCode + ':' + hashCacheKey(serialized)
}

function persistAppSession() {
  const app = getApp()
  if (app && typeof app.persistSession === 'function') {
    app.persistSession()
  }
}

function isRegisteredUser(user) {
  if (!user) return false
  return !!(user.f_OpenID && user.f_UnionID)
}

function activateUserSession(openId, user) {
  const app = getApp()
  if (!app || !app.globalData) return false

  const resolvedOpenId = String(
    openId ||
    user?.f_OpenID ||
    app.globalData.openId ||
    ''
  ).trim()

  if (resolvedOpenId) {
    app.globalData.openId = resolvedOpenId
  }
  app.globalData.userInfo = user || null
  app.globalData.isRegisted = isRegisteredUser(user)

  if (typeof app.setLoginHint === 'function') {
    app.setLoginHint(resolvedOpenId, user)
  }

  persistAppSession()
  return app.globalData.isRegisted
}

function getCurrentCourt(app) {
  if (!app || !app.globalData) return null
  if (app.thisCourt && app.thisCourt.f_id) return app.thisCourt
  const groups = Array.isArray(app.globalData.groups) ? app.globalData.groups : []
  const index = Number(app.globalData.courtindex || 0)
  return groups[index] || groups[0] || null
}

function getStoredUserInfo() {
  const app = getApp()
  if (!app || !app.globalData) return null
  return app.globalData.userInfo || null
}

function applyCachedBackEndUserInfo(courtId) {
  const app = getApp()
  if (!app || !app.globalData) return null

  const cache = app.globalData.backendUserInfoMap && typeof app.globalData.backendUserInfoMap === 'object'
    ? app.globalData.backendUserInfoMap
    : {}
  const key = String(courtId || '').trim()
  const cached = key ? (cache[key] || null) : null

  app.globalData.backendUserInfo = cached

  return cached
}

function applyCachedCourtConfigurationInfo(courtId) {
  const app = getApp()
  if (!app || !app.globalData) return null

  const cache = app.globalData.courtConfigurationInfoMap && typeof app.globalData.courtConfigurationInfoMap === 'object'
    ? app.globalData.courtConfigurationInfoMap
    : {}
  const key = String(courtId || '').trim()
  const cached = key ? (cache[key] || null) : null

  app.globalData.courtConfigurationInfo = cached

  return cached
}

function syncCurrentCourt(app, court, index) {
  if (!app || !app.globalData) return null
  const nextCourt = court || {}
  let nextIndex = typeof index === 'number' ? index : 0
  if (nextIndex < 0) nextIndex = 0

  if (typeof app.setCurrentCourt === 'function') {
    app.setCurrentCourt(nextCourt, nextIndex)
  } else {
    app.globalData.courtindex = nextIndex
    app.globalData.currentCourtId = nextCourt.f_id || ''
    app.globalData.currentCourtName = nextCourt.GroupName || ''
    app.thisCourt = nextCourt
    persistAppSession()
  }

  applyCachedBackEndUserInfo(nextCourt.f_id)
  applyCachedCourtConfigurationInfo(nextCourt.f_id)
  return nextCourt
}

function rememberCourtGroups(groups, options) {
  const app = getApp()
  if (!app || !app.globalData) return null
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})

  const list = Array.isArray(groups) ? groups : []
  app.globalData.groups = list

  let currentIndex = list[app.globalData.courtindex] ? app.globalData.courtindex : 0
  const preferredCourtId = String(
    opts.courtId ||
    app.globalData.currentCourtId ||
    app.thisCourt?.f_id ||
    ''
  ).trim()
  if (preferredCourtId) {
    const matchedIndex = list.findIndex(function (item) {
      return String(item?.f_id || '') === preferredCourtId
    })
    if (matchedIndex > -1) {
      currentIndex = matchedIndex
    }
  }
  const currentCourt = list[currentIndex] || {}
  return syncCurrentCourt(app, currentCourt, currentIndex)
}

function getStoredCourtState(options) {
  const app = getApp()
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})
  if (!app || !app.globalData) {
    return {
      groups: [],
      index: 0,
      currentCourt: null
    }
  }

  const groups = Array.isArray(app.globalData.groups) ? app.globalData.groups : []
  if (!groups.length) {
    return {
      groups: [],
      index: 0,
      currentCourt: null
    }
  }

  let nextIndex = Number(app.globalData.courtindex || 0)
  const preferredCourtId = String(opts.courtId || '').trim()
  if (preferredCourtId) {
    const matchedIndex = groups.findIndex(function (item) {
      return String(item?.f_id || '') === preferredCourtId
    })
    if (matchedIndex > -1) {
      nextIndex = matchedIndex
    }
  }

  if (!Number.isInteger(nextIndex) || nextIndex < 0 || !groups[nextIndex]) {
    nextIndex = 0
  }

  return {
    groups,
    index: nextIndex,
    currentCourt: syncCurrentCourt(app, groups[nextIndex] || {}, nextIndex)
  }
}

function ensureCourtState(func, options) {
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})
  const app = getApp()
  const goRegist = opts.goRegist !== false
  const force = !!opts.force

  function finish() {
    if (func) func(getStoredCourtState(opts))
  }

  const stored = getStoredCourtState(opts)
  if (!force && stored.currentCourt) {
    if (func) func(stored)
    return
  }

  function refreshCourts() {
    refreshCourtList(function () {
      finish()
    }, opts)
  }

  if (!app.globalData.openId || !isRegisteredUser(app.globalData.userInfo)) {
    refreshUserInfo(refreshCourts, goRegist, true)
    return
  }

  refreshCourts()
}

function getStoredBackEndUserInfo(options) {
  const app = getApp()
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})
  if (!app || !app.globalData) return null

  const courtId = String(opts.courtId || getCurrentCourt(app)?.f_id || app.globalData.currentCourtId || '').trim()
  const cache = app.globalData.backendUserInfoMap && typeof app.globalData.backendUserInfoMap === 'object'
    ? app.globalData.backendUserInfoMap
    : {}

  if (courtId && cache[courtId]) {
    if (String(getCurrentCourt(app)?.f_id || app.globalData.currentCourtId || '') === courtId) {
      applyCachedBackEndUserInfo(courtId)
    }
    return Object.assign({}, cache[courtId])
  }

  const currentBackEndUserInfo = app.globalData.backendUserInfo && typeof app.globalData.backendUserInfo === 'object'
    ? app.globalData.backendUserInfo
    : null

  if (currentBackEndUserInfo && (!courtId || String(currentBackEndUserInfo.CourtID || '') === courtId)) {
    return Object.assign({}, currentBackEndUserInfo)
  }

  return null
}

function getStoredCourtConfigurationInfo(options) {
  const app = getApp()
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})
  if (!app || !app.globalData) return null

  const courtId = String(opts.courtId || getCurrentCourt(app)?.f_id || app.globalData.currentCourtId || '').trim()
  const cache = app.globalData.courtConfigurationInfoMap && typeof app.globalData.courtConfigurationInfoMap === 'object'
    ? app.globalData.courtConfigurationInfoMap
    : {}

  if (courtId && cache[courtId]) {
    if (String(getCurrentCourt(app)?.f_id || app.globalData.currentCourtId || '') === courtId) {
      applyCachedCourtConfigurationInfo(courtId)
    }
    return Object.assign({}, cache[courtId])
  }

  const currentCourtConfigurationInfo = app.globalData.courtConfigurationInfo && typeof app.globalData.courtConfigurationInfo === 'object'
    ? app.globalData.courtConfigurationInfo
    : null

  if (currentCourtConfigurationInfo && (!courtId || String(currentCourtConfigurationInfo.CourtID || '') === courtId)) {
    return Object.assign({}, currentCourtConfigurationInfo)
  }

  return null
}

function flushQueuedUserInfo(user, res) {
  const queue = userInfoRefreshQueue.slice()
  userInfoRefreshQueue = []

  queue.forEach(function (item) {
    if (!item) return
    if (item.syncBackend && isRegisteredUser(user)) {
      refreshBackEndUserInfo(function () {
        if (item.func) item.func(user, res)
      }, {
        force: !!item.force
      })
      return
    }
    if (item.func) item.func(user, res)
  })
}

function flushQueuedBackEndUserInfo(courtId, res) {
  const key = String(courtId || '').trim()
  const queue = key && Array.isArray(backEndUserInfoRefreshQueueMap[key])
    ? backEndUserInfoRefreshQueueMap[key]
    : []

  if (key) {
    delete backEndUserInfoRefreshQueueMap[key]
  }

  queue.forEach(function (callback) {
    if (callback) callback(res)
  })
}

function flushQueuedCourtConfigurationInfo(courtId, res) {
  const key = String(courtId || '').trim()
  const queue = key && Array.isArray(courtConfigurationInfoRefreshQueueMap[key])
    ? courtConfigurationInfoRefreshQueueMap[key]
    : []

  if (key) {
    delete courtConfigurationInfoRefreshQueueMap[key]
  }

  queue.forEach(function (callback) {
    if (callback) callback(res)
  })
}

function resetBackEndUserInfo() {
  const app = getApp()
  if (!app || !app.globalData) return

  app.globalData.backendUserInfo = null
  app.globalData.backendUserInfoMap = {}
}

function resetCourtConfigurationInfo() {
  const app = getApp()
  if (!app || !app.globalData) return

  app.globalData.courtConfigurationInfo = null
  app.globalData.courtConfigurationInfoMap = {}
}

function rememberBackEndUserInfo(res, courtId) {
  const app = getApp()
  if (!app || !app.globalData || !res || typeof res !== 'object') return res

  const currentCourt = getCurrentCourt(app)
  const resolvedCourtId = String(courtId || res.CourtID || currentCourt?.f_id || '').trim()
  const normalized = Object.assign(
    {},
    res,
    resolvedCourtId ? { CourtID: resolvedCourtId } : {}
  )

  const cache = app.globalData.backendUserInfoMap && typeof app.globalData.backendUserInfoMap === 'object'
    ? app.globalData.backendUserInfoMap
    : {}

  if (resolvedCourtId) {
    cache[resolvedCourtId] = normalized
  }
  app.globalData.backendUserInfoMap = cache

  if (!currentCourt || !currentCourt.f_id || String(currentCourt.f_id) === resolvedCourtId) {
    app.globalData.backendUserInfo = normalized
  }

  return normalized
}

function rememberCourtConfigurationInfo(res, courtId) {
  const app = getApp()
  if (!app || !app.globalData || !res || typeof res !== 'object') return res

  const currentCourt = getCurrentCourt(app)
  const resolvedCourtId = String(courtId || res.CourtID || currentCourt?.f_id || '').trim()
  const normalized = Object.assign(
    {},
    res,
    resolvedCourtId ? { CourtID: resolvedCourtId } : {}
  )

  const cache = app.globalData.courtConfigurationInfoMap && typeof app.globalData.courtConfigurationInfoMap === 'object'
    ? app.globalData.courtConfigurationInfoMap
    : {}

  if (resolvedCourtId) {
    cache[resolvedCourtId] = normalized
  }
  app.globalData.courtConfigurationInfoMap = cache

  if (!currentCourt || !currentCourt.f_id || String(currentCourt.f_id) === resolvedCourtId) {
    app.globalData.courtConfigurationInfo = normalized
  }

  return normalized
}

function redirectToAuthPage(url) {
  const pages = getCurrentPages()
  const currentRoute = pages.length ? ('/' + pages[pages.length - 1].route) : ''
  const targetRoute = url.split('?')[0]
  if (currentRoute === targetRoute) return
  if (pages.length) {
    wx.redirectTo({
      url
    })
    return
  }
  wx.reLaunch({
    url
  })
}
//----------通用请求---------------
function buildRequestFailResult(json, message, err) {
  const result = {
    Status: 'fail',
    Result: message || '接口请求失败，请稍后重试',
    TransactionCode: json && json.TransactionCode
  }
  if (err) {
    result.Error = err
  }
  return result
}

function finishRequestFail(json, func, message, err, options) {
  const opts = options || {}
  if (!opts.silent) {
    wx.hideLoading()
  }
  const result = buildRequestFailResult(json, message, err)
  if (typeof func === 'function') {
    func(result)
    return
  }
  wx.showModal({
    title: '请求失败',
    content: result.Result,
    showCancel: false
  })
}

function getRequestFailMessage(res, fallback) {
  return String(
    res && res.Result
      ? res.Result
      : (fallback || '接口请求失败，请稍后重试')
  )
}

function noticeRequestFailOnce(key, title, res, fallback) {
  const noticeKey = String(key || '').trim()
  const now = Date.now()
  const lastNoticeAt = noticeKey ? Number(requestFailNoticeMap[noticeKey] || 0) : 0

  if (noticeKey && now - lastNoticeAt < 8000) {
    return
  }

  if (noticeKey) {
    requestFailNoticeMap[noticeKey] = now
  }
  if (showing) return
  showing = true
  wx.showModal({
    title: title || '请求失败',
    content: getRequestFailMessage(res, fallback),
    showCancel: false,
    confirmText: '确定',
    complete: function () {
      showing = false
    }
  })
}

//发送请求
function wxrequest(json, func, retryCount = 0, executingCount = 0, options) {
  const opts = options || {}
  const cacheKey = !opts.noCache ? getRequestCacheKey(json) : ''
  if (!opts.silent) {
    wx.showLoading({
      title: '加载中',
      mask: true
    })
  }
  const app = getApp();
  var requestTime = new Date().getTime();
  if (app.globalData.offline && cacheKey) {
    var info = wx.getStorageSync(cacheKey);
    if (info != "") {
      if (typeof func === 'function') func(info);
      if (!opts.silent) {
        wx.hideLoading()
      }
      return;
    }
  }
  wx.request({
    url: config.myUrl,
    data: {
      'Content': JSON.stringify(json)
    },
    method: 'GET',
    header: {
      'content-type': 'application/json',
      'cache-control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    },
    dataType: 'JSON',
    success: function (res) {
      if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
        finishRequestFail(json, func, '接口请求失败，请稍后重试', res, opts)
        return
      }
      var b = null
      try {
        var a = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        b = typeof a === 'string' ? JSON.parse(a) : a
      } catch (e) {
        finishRequestFail(json, func, '接口数据解析失败，请稍后重试', e, opts)
        return
      }
      if (!b || typeof b !== 'object') {
        finishRequestFail(json, func, '接口数据异常，请稍后重试', b, opts)
        return
      }
      if (b.Status == 'executing') {
        if (executingCount >= 10) {
          finishRequestFail(json, func, '接口处理超时，请稍后重试', b, opts)
          return
        }
        setTimeout(function () {
          wxrequest(json, func, retryCount, executingCount + 1, opts)
        }, 1000)
        return
      }
      if (!opts.silent) {
        wx.hideLoading()
      }
      if (cacheKey) {
        wx.setStorageSync(cacheKey, b);
      }
      if (typeof func === 'function') func(b)
    },
    fail: function (err) {
      if (err.errMsg.indexOf('timeout') > 0) {
        if (retryCount < 2) {
          wxrequest(json, func, retryCount + 1, executingCount, opts)
          return
        }
        finishRequestFail(json, func, '接口请求超时，请稍后重试', err, opts)
      } else {
        wx.getNetworkType({
          success: function (res3) {
            if (res3.networkType == 'none') {
              finishRequestFail(json, func, '无网络，请连接网络后再试', err, opts)
            } else {
              finishRequestFail(json, func, '网络不给力，请重试', err, opts)
            }
          },
          fail: function (res3) {
            finishRequestFail(json, func, '无法获取当前网络状态，请稍后重试', err, opts)
          }
        })
      }
    },
    complete: function (allres) {
      // console.log('本次请求('+json.TransactionCode+')耗时：'+(new Date().getTime()-requestTime)/1000+'秒，状态为：'+allres.statusCode)
    }
  })
}

function promptFeatureLogin(options) {
  const opts = options || {}
  const loginUrl = opts.loginUrl || '/pages/login/login'
  if (showing) return false

  showing = true
  wx.showModal({
    title: opts.title || '未获取到数据',
    content: opts.content || '请确认管理中心是否已为您授权\n请登录后再试',
    cancelText: opts.cancelText || '暂不登录',
    confirmText: opts.confirmText || '立即登录',
    success(res) {
      if (!res.confirm) return
      wx.navigateTo({
        url: loginUrl,
      })
    },
    complete() {
      showing = false
    }
  })
  return true
}

function clearFeatureLoginPrompt(page) {
  if (!page || !page.__featureLoginPromptTimer) return
  clearTimeout(page.__featureLoginPromptTimer)
  page.__featureLoginPromptTimer = null
}

function scheduleFeatureLoginPrompt(page, options) {
  if (!page) return false
  const opts = options || {}
  const delay = Number(opts.delay)
  clearFeatureLoginPrompt(page)
  page.__featureLoginPromptTimer = setTimeout(function () {
    page.__featureLoginPromptTimer = null
    promptFeatureLogin(opts)
  }, Number.isFinite(delay) && delay >= 0 ? delay : 320)
  return true
}

function showLogin() {
  setTimeout(() => {
    if (showing) return;
    showing = true;
    wx.showModal({
      title: '未获取到数据',
      content: '请确认管理中心是否已为您授权\n请登录后再试',
      cancelText: '暂不登录',
      confirmText: '立即登录',
      success(res) {
        showing = false;
        if (res.confirm) {
          wx.redirectTo({
            url: '/pages/login/login',
          })
        }
      },
      fail() {
        showing = false;
      },
      complete() {
        showing = false;
      }
    })
  }, 500);
}
//通用访问函数
function showRegister() {
  setTimeout(() => {
    redirectToAuthPage('/pages/register/register?type=0')
  }, 100);
}

function showUnionBind(user) {
  const id = user && user.f_id
  if (!id) {
    showRegister()
    return
  }
  setTimeout(() => {
    redirectToAuthPage('/pages/reg2/reg2?id=' + encodeURIComponent(id))
  }, 100)
}

function getJson(action, obj, func, options) {
  var app = getApp()
  var json = {}
  for (var key in config.appJson) {
    json[key] = config.appJson[key]
  }


  const anonymousActions = [
    'GetOpenID',
    'GetUserInfo',
    'GetMobileMessageValidateSwitch',
    'GetPhoneNumber',
    'RegisterUser'
  ]
  if (anonymousActions.indexOf(action) === -1) {
    if (!app.globalData.openId) {
      return showLogin();
    }

    //若用户信息为空，则可能之前获取用户信息异常，重新获取用户信息
    // if (app.globalData.userInfo == null) {
    //   // return showLogin()
    //   return getOpenId(func);
    // }
    if (!isRegisteredUser(app.globalData.userInfo)) {
      if (!app.globalData.isRegisted) {
        if (func) {
          func({
            Status: 'fail',
            Result: '请先登录/注册'
          })
        }
        return
      }
      return refreshUserInfo(function (user) {
        if (!isRegisteredUser(user)) {
          if (func) {
            func({
              Status: 'fail',
              Result: '请先登录/注册'
            })
          }
          return
        }
        getJson(action, obj, func, options)
      }, true)
    }

    const uf = app.globalData.userInfo || {}

    json['f_OpenID'] = obj?.f_OpenID || app.globalData.openId || uf.f_OpenID
    json['f_UnionID'] = obj?.f_UnionID || uf.f_UnionID
  }
  json['TransactionCode'] = action
  json['TransactionID'] = guid()
  for (var key in obj) {
    json[key] = obj[key]
  }
  wxrequest(json, func, 0, 0, options)
}
function getOpenIdPromise() {
  const app = getApp();
  const openId = app.globalData.openId;

  return new Promise((resolve, reject) => {
    if (openId) {
      persistAppSession()
      resolve(openId);
      return
    }
    wx.login({
      success: function (res) {
        console.log('login', res);
        if (!res.code) {
          reject({
            Status: 'fail',
            Result: '微信登录凭证为空'
          })
          return
        }
        getJson('GetOpenID', {
          'WeChatCode': res.code
        }, r => {
          console.log('openId', r)
          if (!r || r.Status != 'success' || !r.Result) {
            reject(r || {
              Status: 'fail',
              Result: '获取openid失败'
            })
            return
          }
          app.globalData.openId = r.Result
          persistAppSession()
          resolve(r.Result)
        })
      },
      fail: function (err) {
        console.error('err', err)
        reject({
          Status: 'fail',
          Result: err && err.errMsg ? err.errMsg : '微信登录失败'
        })
        wx.showModal({
          title: '微信登录失败',
          content: '请重新登录',
          showCancel: false,
          confirmText: '重试',
          complete: function () {
            getOpenId()
          }
        })
      }
    })
  })
}
function getUserInfo(openId) {
  return new Promise((resolve, reject) => {
    getJson('GetUserInfo', {
      'f_OpenID': openId
    }, resolve)
  })
}
//--------全局变量设置--------------
//获取用户信息,func(返回的用户信息)
function refreshCourtList(func, options) {
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})
  const app = getApp()
  if (!app || !app.globalData || !app.globalData.openId || !isRegisteredUser(app.globalData.userInfo)) {
    if (func) func(null)
    return
  }

  getJson('GetCourts', {}, function (res) {
    if (res.Status == 'success') {
      const currentCourt = rememberCourtGroups(res.Groups || [], opts)
      if (func) func(currentCourt, res)
      return
    }
    if (opts.showError) {
      noticeRequestFailOnce('GetCourts', '加载小区失败', res, '请稍后重试')
    }
    if (func) func(null, res)
  })
}

function refreshBackEndUserInfo(func, options) {
  const app = getApp()
  const opts = typeof options === 'string' ? { courtId: options } : (options || {})
  const force = !!opts.force
  if (!app || !app.globalData || !app.globalData.openId || !isRegisteredUser(app.globalData.userInfo)) {
    resetBackEndUserInfo()
    resetCourtConfigurationInfo()
    if (func) func(null)
    return
  }

  function requestBackEndUserInfo(courtId) {
    if (!courtId) {
      if (func) func(null)
      return
    }

    const queueKey = String(courtId || '').trim()
    if (Array.isArray(backEndUserInfoRefreshQueueMap[queueKey])) {
      if (opts.showError) {
        backEndUserInfoRefreshQueueMap[queueKey].showError = true
      }
      if (func) backEndUserInfoRefreshQueueMap[queueKey].push(func)
      return
    }
    backEndUserInfoRefreshQueueMap[queueKey] = func ? [func] : []
    backEndUserInfoRefreshQueueMap[queueKey].showError = !!opts.showError

    getJson('GetBackEndUserInfo', {
      CourtID: courtId
    }, function (res) {
      const shouldShowError = !!(
        opts.showError ||
        backEndUserInfoRefreshQueueMap[queueKey]?.showError
      )
      if (res && res.Status == 'success') {
        rememberBackEndUserInfo(res, courtId)
      } else if (String(courtId) === String(getCurrentCourt(app)?.f_id || '')) {
        app.globalData.backendUserInfo = null
      }

      const nextRes = (res && res.Status == 'success')
        ? (getStoredBackEndUserInfo({ courtId }) || res)
        : res

      if (shouldShowError && (!res || res.Status != 'success')) {
        noticeRequestFailOnce('GetBackEndUserInfo:' + queueKey, '加载用户权限失败', res, '请稍后重试')
      }
      flushQueuedBackEndUserInfo(queueKey, nextRes)
    })
  }

  const courtId = String(opts.courtId || getCurrentCourt(app)?.f_id || app.globalData.currentCourtId || '').trim()
  if (courtId) {
    const cached = !force ? getStoredBackEndUserInfo({ courtId }) : null
    if (cached) {
      if (func) func(cached)
      return
    }
    requestBackEndUserInfo(courtId)
    return
  }

  refreshCourtList(function (currentCourt, res) {
    if (currentCourt && currentCourt.f_id) {
      requestBackEndUserInfo(currentCourt.f_id)
      return
    }
    if (func) func(res || null)
  })
}

function requestCourtConfigurationInfo(courtId, func, options) {
  const opts = options || {}
  const app = getApp()
  const globalData = app && app.globalData ? app.globalData : {}
  const resolvedCourtId = String(courtId || getCurrentCourt(app)?.f_id || globalData.currentCourtId || '').trim()

  if (!globalData.openId || !isRegisteredUser(globalData.userInfo) || !resolvedCourtId) {
    if (typeof func === 'function') func(null)
    return
  }
  if (globalData.offline) {
    if (typeof func === 'function') {
      func(getStoredCourtConfigurationInfo({
        courtId: resolvedCourtId
      }))
    }
    return
  }

  if (Array.isArray(courtConfigurationInfoRefreshQueueMap[resolvedCourtId])) {
    if (opts.showError) {
      courtConfigurationInfoRefreshQueueMap[resolvedCourtId].showError = true
    }
    if (typeof func === 'function') {
      courtConfigurationInfoRefreshQueueMap[resolvedCourtId].push(func)
    }
    return
  }
  courtConfigurationInfoRefreshQueueMap[resolvedCourtId] = typeof func === 'function' ? [func] : []
  courtConfigurationInfoRefreshQueueMap[resolvedCourtId].showError = !!opts.showError

  getJson('GetCourtConfigurationInfo', {
    CourtID: resolvedCourtId
  }, function (res) {
    const shouldShowError = !!(
      opts.showError ||
      courtConfigurationInfoRefreshQueueMap[resolvedCourtId]?.showError
    )
    const nextRes = res && res.Status == 'success'
      ? rememberCourtConfigurationInfo(res, resolvedCourtId)
      : res
    if (shouldShowError && (!res || res.Status != 'success')) {
      noticeRequestFailOnce('GetCourtConfigurationInfo:' + resolvedCourtId, '加载小区配置失败', res, '请稍后重试')
    }
    flushQueuedCourtConfigurationInfo(resolvedCourtId, nextRes)
  }, {
    silent: true
  })
}

function getOpenId(func, goRegist = true, refresh = true) {
  const app = getApp();
  var requestTime = new Date().getTime();
  if (app.globalData.offline) {
    var info = wx.getStorageSync("GetOpenID");
    if (info != "") {
      app.globalData.openId = info.Result
      persistAppSession()
      refresh && refreshUserInfo(func, goRegist);
      return;
    }
  }
  wx.login({
    success: function (res) {
      console.log('login', res);
      getJson('GetOpenID', {
        'WeChatCode': res.code
      }, function (res1) {
        if (res1.Status == 'success') {
          getApp().globalData.openId = res1.Result
          persistAppSession()
          refresh && refreshUserInfo(func, goRegist)
        } else {
          wx.showModal({
            title: '获取openid失败',
            content: res1.Result,
            showCancel: false,
            confirmText: '重试',
            complete: function () {
              getOpenId(func, goRegist)
            }
          })
        }
      })
    },
    fail: function (err) {
      // console.log(err)
      wx.showModal({
        title: '微信登录失败',
        content: '请重新登录',
        showCancel: false,
        confirmText: '重试',
        complete: function () {
          getOpenId()
        }
      })
    }
  })
}
//刷新用户信息,func(返回的用户信息)
function refreshUserInfo(func, goRegist = true, syncBackend = false, force = false) {
  var app = getApp()
  if (!app.globalData.openId) {
    app.globalData.isRegisted = false
    app.globalData.userInfo = null
    resetBackEndUserInfo()
    resetCourtConfigurationInfo()
    persistAppSession()
    if (goRegist) {
      showLogin()
    }
    if (func) func(null)
    return
  }

  const rawCachedUser = !force ? getStoredUserInfo() : null
  const hasMismatchedCachedUser = !!(
    rawCachedUser &&
    rawCachedUser.f_OpenID &&
    app.globalData.openId &&
    String(rawCachedUser.f_OpenID) !== String(app.globalData.openId)
  )
  if (hasMismatchedCachedUser) {
    app.globalData.userInfo = null
    app.globalData.isRegisted = false
    resetBackEndUserInfo()
    resetCourtConfigurationInfo()
    persistAppSession()
  }
  const cachedUser = hasMismatchedCachedUser ? null : rawCachedUser
  if (userInfoRefreshPending) {
    userInfoRefreshQueue.push({
      func,
      syncBackend,
      force
    })
    return
  }

  if (cachedUser) {
    app.globalData.userInfo = cachedUser
    app.globalData.isRegisted = isRegisteredUser(cachedUser)
    persistAppSession()
    if (!app.globalData.isRegisted) {
      resetBackEndUserInfo()
      resetCourtConfigurationInfo()
      if (goRegist) {
        if (cachedUser.f_OpenID && !cachedUser.f_UnionID) {
          showUnionBind(cachedUser)
        } else {
          showRegister()
        }
      }
      if (func) func(cachedUser)
      return
    }
    if (syncBackend) {
      refreshBackEndUserInfo(function () {
        if (func) func(cachedUser)
      }, {
        force
      })
      return
    }
    if (func) func(cachedUser)
    return
  }

  userInfoRefreshPending = true
  getJson('GetUserInfo', {
    'f_OpenID': app.globalData.openId
  }, function (res2) {
    wx.stopPullDownRefresh();

    if (res2.Status == 'success') {
      const user = res2.User || null
      if (!user || user.f_OpenID == null || user.f_OpenID == '') {
        app.globalData.isRegisted = false;
        app.globalData.userInfo = user
        resetBackEndUserInfo()
        resetCourtConfigurationInfo()
        persistAppSession()
        userInfoRefreshPending = false
        if (goRegist) {
          showRegister()
        }
        flushQueuedUserInfo(user, res2)
        if (func) func(user, res2)
        return
      }

      app.globalData.userInfo = user
      app.globalData.isRegisted = isRegisteredUser(user)
      persistAppSession()
      if (!app.globalData.isRegisted) {
        resetBackEndUserInfo()
        resetCourtConfigurationInfo()
        userInfoRefreshPending = false
        if (goRegist) {
          showUnionBind(user)
        }
        flushQueuedUserInfo(user, res2)
        if (func) func(user, res2)
        return
      }

      console.log(app.globalData)
      const finishWithUser = function () {
        userInfoRefreshPending = false
        if (func) func(user, res2)
        flushQueuedUserInfo(user, res2)
      }
      if (syncBackend) {
        refreshBackEndUserInfo(function () {
          finishWithUser()
        }, {
          force
        })
        return
      }
      finishWithUser()
    } else {
      userInfoRefreshPending = false
      flushQueuedUserInfo(null, res2)
      if (func) func(null, res2)
      wx.showModal({
        title: '获取用户信息失败',
        content: res2.Result,
        confirmText: '重试',
        success: function (modalRes) {
          if (!modalRes.confirm) {
            return
          }
          refreshUserInfo(func, goRegist, syncBackend, force)
        }
      })
    }
  })
}

function refreshUserInfoOnTabShow(func, options) {
  const app = getApp()
  const opts = options || {}
  if (!app || !app.globalData) {
    if (typeof func === 'function') func(null)
    return
  }

  if (app.globalData.offline || !app.globalData.openId) {
    if (typeof func === 'function') func(app.globalData.userInfo || null)
    return
  }

  if (!app.globalData.isRegisted && !isRegisteredUser(app.globalData.userInfo)) {
    if (typeof func === 'function') func(app.globalData.userInfo || null)
    return
  }

  refreshUserInfo(func, false, !!opts.syncBackend, true)
}

function noticeArea(target) {
  notice('加载小区失败', '小区列表为空\n请等待管理中心授权!', function () {
    // target &&
    //   wx.redirectTo({
    //     url: `/pages/${target}/${target}`,
    //   })
  })
}
//通用提示
function notice(tit, cont, func) {
  wx.showModal({
    title: tit,
    content: cont,
    showCancel: false,
    confirmText: "确定",
    complete: func
  })
}
//提示：只显示内容和确定按钮
function showErr(err) {
  wx.showModal({
    content: err,
    showCancel: false,
    confirmText: "确定"
  })
}
//向自己的手机发送验证码
function sendIdentify(openid, code, tel, func) {
  var json = config.telJson
  json['Code'] = code
  json['f_OpenID'] = openid
  json['f_Tel'] = tel
  json['TransactionID'] = guid()
  wxrequest(json, func)
}
//获取用户的小区列表
/*function getCourts(openid,func){
  var json = config.getCourtsJson
  json['f_OpenID']=openid
  wxrequest(json,func)
}*/
//获取用户某小区的家庭成员
function getFamily(openid, courtid, func) {
  var json = config.getFamilyJson
  json['f_OpenID'] = openid
  json['CourtID'] = courtid
  json['TransactionID'] = guid()
  wxrequest(json, func)
}
//获取用户某小区的钥匙列表
function getKeyList(openid, courtid, func) {
  var json = config.keylistJson
  json['f_OpenID'] = openid
  json['CourtID'] = courtid
  json['TransactionID'] = guid()
  wxrequest(json, func)
}
//扫码1-在线
function scanopendoor(openid, unionid, userid, courtid, devid, time, secret, door, func, operationCode) {
  var json = config.scanJson1
  json['f_OpenID'] = openid
  json['f_unionID'] = unionid
  json['f_userid'] = userid
  json['CourtID'] = courtid
  json['Devid'] = devid
  json['Time'] = time
  json['Secret'] = secret
  json['InOutState'] = door
  json["OperationCode"] = operationCode
  json['TransactionID'] = guid()
  wxrequest(json, func)
}
//扫码2-离线/显示密码
function scanshowpassword(openid, unionid, userid, courtid, devid, time, secret, m, func) {
  var json = config.scanJson2
  json['f_OpenID'] = openid
  json['f_unionID'] = unionid
  json['f_userid'] = userid
  json['CourtID'] = courtid
  json['Devid'] = devid
  json['Time'] = time
  json['Secret'] = secret
  json['DynamicPassword'] = m
  json['TransactionID'] = guid()
  wxrequest(json, func)
}
//扫码3-注册权限
function applypermission(openid, unionid, userid, time, secret, courtid, func) {
  var json = config.scanJson3
  json['f_OpenID'] = openid
  json['f_UnionID'] = unionid
  json['UserID'] = userid
  json['Time'] = time
  json['Secret'] = secret
  json['CourtID'] = courtid
  json['TransactionID'] = guid()
  wxrequest(json, func)
}
//添加家庭成员
function addFamily(openid, userid, func) {
  var json = config.addFamilyJson
  json['f_OpenID'] = openid
  json['FamilyMemberID'] = userid
  json['TransactionID'] = guid()
  wxrequest(json, func)
}

//刷新小区信息


//------内部js接口--------
//时间处理
function formatTime(date) {
  return date.getFullYear() + formatNumber(date.getMonth() + 1) + formatNumber(date.getDate()) + formatNumber(date.getHours()) + formatNumber(date.getMinutes()) + formatNumber(date.getSeconds())
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}
//获取guid
function guid() {
  return ('xxxxxxxx-xxxx-4xxx-yxxx-' + formatTime(new Date())).replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
function getTimeP(timeObj) {
  var date = new Date()
  if (timeObj && timeObj.min) {
    date.setMinutes(date.getMinutes() + timeObj.min)
  }
  if (timeObj && timeObj.hour) {
    date.setHours(date.getHours() + timeObj.hour)
  }
  var year = parseInt(date.getFullYear().toString().slice(1, 4)).toString(16)
  year = year.length == 1 ? '0' + year : year
  var month = parseInt((date.getMonth() + 1).toString()).toString(16)
  month = month.length == 1 ? '0' + month : month
  var day = parseInt(date.getDate().toString()).toString(16)
  day = day.length == 1 ? '0' + day : day
  var hour = parseInt(date.getHours().toString()).toString(16)
  hour = hour.length == 1 ? '0' + hour : hour
  var min = parseInt(date.getMinutes().toString()).toString(16)
  min = min.length == 1 ? '0' + min : min
  return '' + year + month + day + hour + min
}
function getRandomP() {
  var random = parseInt(String(Math.random() * (16 * 16 * 16 * 16 - 1))).toString(16)
  var zeroCount = 4 - random.length
  var zeroStr = ''
  for (let index = 0; index < zeroCount; index++) {
    zeroStr += '0'
  }
  return random.length < 4 ? zeroStr + random : random
}
function getCardByPhone(phone) {
  var phoneFactor = config.APP_CONFIG.PHONE_CONVERSION_FACTOR
  var phoneNumber = parseInt(phone)
  if (!phoneNumber) return ''
  var hexPhone = phoneNumber.toString(16)
  var array = []
  let convertFlag = hexPhone.length - 2
  for (let i = 5, arrayFlag = 4; i > 0; convertFlag -= 2, arrayFlag--, i--) {
    var p = hexPhone.substring(convertFlag, convertFlag + 2)
    var hexP = (parseInt(p, 16) ^ parseInt(phoneFactor[arrayFlag], 16)).toString(16)
    array[arrayFlag] = hexP.length == 2 ? hexP : '0' + hexP
  }
  return array.join('').toUpperCase()
}
function getQRCodeContent(phone, func, timeObj) {
  var card = getCardByPhone(phone)
  if (!card) return ''
  func = func || config.APP_CONFIG.FUNC_P
  var time = getTimeP(timeObj)
  var random = getRandomP()
  var tempStr = '' + card + time + random
  var vali = tempStr.substr(0, 2)
  for (let index = 2; index < tempStr.length; index += 2) {
    var next = tempStr.substr(index, 2)
    vali = (parseInt(vali, 16) ^ parseInt(next, 16)).toString(16)
  }
  vali = (parseInt(vali, 16) ^ parseInt(config.APP_CONFIG.VALI_NUM, 16)).toString(16)
  vali = vali.length == 1 ? '0' + vali : vali
  return ('' + func + tempStr + vali).toUpperCase()
}
//钥匙加密
function encode(content) {
  return ("" + CryptoJS.AES.encrypt(content, config.mykey)).replace(/\n/g, "")
}

function decode(content) {
  return (CryptoJS.AES.decrypt(content, config.mykey).toString(CryptoJS.enc.Utf8))
}

//卡号门禁QR专用加密（与QROpen版本一致，AES-CBC）
function encodeForDoorQR(content) {
  var c = CryptoJS.enc.Hex.parse(content);
  var r = CryptoJS.AES.encrypt(c, _doorQrKey, {
    iv: _doorQrIv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  return CryptoJS.enc.Hex.stringify(r.ciphertext).toUpperCase();
}

//卡号门禁QR内容生成（VALI_NUM与QROpen一致）
function getQRCodeContentForDoor(phone, func, timeObj) {
  var card = getCardByPhone(phone);
  if (!card) return '';
  func = func || config.APP_CONFIG.FUNC_P;
  var time = getTimeP(timeObj);
  var random = getRandomP();
  var tempStr = '' + card + time + random;
  var vali = tempStr.substr(0, 2);
  for (var index = 2; index < tempStr.length; index += 2) {
    var next = tempStr.substr(index, 2);
    vali = (parseInt(vali, 16) ^ parseInt(next, 16)).toString(16);
  }
  vali = (parseInt(vali, 16) ^ parseInt('19', 16)).toString(16);
  vali = vali.length == 1 ? '0' + vali : vali;
  return ('' + func + tempStr + vali).toUpperCase();
}

function base64_encode(str) {
  return ("" + CryptoJS.enc.Base64.stringify(str))
}

function base64_decode(str) {
  return ("" + CryptoJS.enc.Base64.parse(str))
}
//设置本js接口
module.exports = {
  getJson: getJson,
  getOpenIdPromise,
  getUserInfo,

  getOpenId: getOpenId,
  refreshUserInfo: refreshUserInfo,
  refreshUserInfoOnTabShow,
  refreshCourtList,
  refreshBackEndUserInfo,
  requestCourtConfigurationInfo,
  rememberCourtGroups,
  getStoredCourtState,
  ensureCourtState,
  getStoredUserInfo,
  getStoredBackEndUserInfo,
  getStoredCourtConfigurationInfo,
  rememberBackEndUserInfo,
  rememberCourtConfigurationInfo,
  resetBackEndUserInfo,
  resetCourtConfigurationInfo,

  formatTime: formatTime,
  formatNumber: formatNumber,
  getQRCodeContent,
  getQRCodeContentForDoor,
  encodeForDoorQR,
  getCardByPhone,
  encode: encode,
  decode: decode,
  base64_encode: base64_encode,
  base64_decode: base64_decode,

  //wxrequest:wxrequest
  showErr: showErr,
  notice: notice, //通用提示
  noticeArea,
  clearFeatureLoginPrompt,
  promptFeatureLogin,
  scheduleFeatureLoginPrompt,
  noticeRequestFailOnce,

  //getOpenIdByCode: getOpenIdByCode,
  //getUserByOpenId: getUserByOpenId,
  //getUserByCode: getUserByCode,
  //register:register,
  sendIdentify: sendIdentify,
  //getCourts: getCourts,
  getFamily: getFamily,
  getKeyList: getKeyList,
  scanopendoor: scanopendoor,
  scanshowpassword: scanshowpassword,
  applypermission: applypermission,
  addFamily: addFamily,
  isRegisteredUser: isRegisteredUser,
  activateUserSession: activateUserSession
}
