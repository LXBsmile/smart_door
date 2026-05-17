const util = require('../util')
const featureMock = require('../featureMock')

const LIFT_SETTING_STORAGE_KEY = 'feature_lift_settings'
const KEY_LIST_CACHE_KEY = 'feature_key_list_cache'
const VISITOR_PASS_DETAIL_STORAGE_KEY = 'feature_current_visitor_pass_detail'
const DEFAULT_HOME_BANNER = '/images/banner.png'
const DEVICE_TYPE_LIFT = '梯控'
const DEVICE_TYPE_DOOR = '门禁'
const DEVICE_MODE_CONTROL = '05'
const DEVICE_MODE_OPEN = '04'

const API_SUPPORT = Object.freeze({
  phoneAuthorization: true,
  liftExecute: false,
  passRecord: true,
  paymentRecord: true
})
const API_UNAVAILABLE_MESSAGE = Object.freeze({
  phoneAuthorization: '手机号快捷登录接口暂未接入，请使用账号登录继续',
  liftExecute: '楼层下发接口暂未接入',
  passRecord: '通行记录接口暂未接入',
  paymentRecord: '缴费记录接口暂未接入'
})

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return {
      globalData: {}
    }
  }
}

function isApiAvailable(name) {
  return !!API_SUPPORT[name]
}

function getApiUnavailableMessage(name) {
  return API_UNAVAILABLE_MESSAGE[name] || '功能暂未开放'
}

function buildUnavailableResult(name, extra) {
  return Object.assign({
    Status: 'fail',
    Result: getApiUnavailableMessage(name)
  }, extra || {})
}

function rejectUnavailableApi(name, extra) {
  return Promise.reject(buildUnavailableResult(name, extra))
}

function parseMaybeJson(value) {
  if (!value || typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return value
  }
}

function isBackendEnabled(value) {
  return value === true || value === 'True'
}

function getBackEndUserInfo(courtId) {
  const app = getAppSafe()
  const cache = app.globalData.backendUserInfoMap && typeof app.globalData.backendUserInfoMap === 'object'
    ? app.globalData.backendUserInfoMap
    : {}
  const key = String(courtId || app.thisCourt?.f_id || app.globalData.currentCourtId || '').trim()

  if (key && cache[key]) {
    return Object.assign({}, cache[key])
  }
  const current = app.globalData.backendUserInfo
  if (!current || typeof current !== 'object') {
    return null
  }
  if (!key || String(current.CourtID || '') === key) {
    return Object.assign({}, current)
  }
  return null
}

function getCourtConfigurationInfo(courtId) {
  const info = util.getStoredCourtConfigurationInfo({
    courtId
  })
  return info ? Object.assign({}, info) : null
}

function normalizeAdImageSrc(value) {
  const text = String(value || '').trim()
  if (!text) return DEFAULT_HOME_BANNER
  if (/^(data:image\/|https?:\/\/|\/)/i.test(text)) return text

  const compact = text.replace(/\s/g, '')
  let mime = 'image/png'
  if (compact.indexOf('/9j/') === 0) {
    mime = 'image/jpeg'
  } else if (compact.indexOf('R0lGOD') === 0) {
    mime = 'image/gif'
  } else if (compact.indexOf('UklGR') === 0) {
    mime = 'image/webp'
  }
  return 'data:' + mime + ';base64,' + compact
}

function isPayOpen(courtId) {
  const courtConfigurationInfo = getCourtConfigurationInfo(courtId) || {}
  return isBackendEnabled(courtConfigurationInfo.f_OpenPay)
}

function getHomeBanner(courtId) {
  const courtConfigurationInfo = getCourtConfigurationInfo(courtId) || {}
  return {
    image: normalizeAdImageSrc(courtConfigurationInfo.f_Adimage)
  }
}

function getHomeViewModel(isRegisted, courtId) {
  const backendInfo = getBackEndUserInfo(courtId) || {}
  const menus = []

  if (!isRegisted) {
    menus.push({
      id: 'keyslist',
      name: '钥匙列表',
      image: '/images/home_yslb.png'
    }, {
      id: 'visitorme',
      name: '我是访客',
      image: '/images/me.png',
      iconBg: '#61adf6'
    }, {
      id: 'visitormanage',
      name: '访客管理',
      image: '/images/home_fxys.png'
    }, {
      id: 'showQR',
      name: '扫一扫',
      image: '/images/code3.png',
      online: true
    }, {
      id: 'cardcode',
      name: '卡号码',
      image: '/images/qxm.png'
    })
  } else {
    if (isBackendEnabled(backendInfo.f_RemoteControl)) {
      menus.push({
        id: 'keyslist',
        name: '钥匙列表',
        image: '/images/home_yslb.png'
      })
    }
    menus.push({
      id: 'visitorme',
      name: '我是访客',
      image: '/images/me.png',
      iconBg: '#61adf6'
    })
    if (isBackendEnabled(backendInfo.f_VisitorManagement)) {
      menus.push({
        id: 'visitormanage',
        name: '访客管理',
        image: '/images/home_fxys.png'
      })
    }
    menus.push({
      id: 'showQR',
      name: '扫一扫',
      image: '/images/code3.png',
      online: true
    })
    if (isBackendEnabled(backendInfo.f_SubCard1)) {
      menus.push({
        id: 'cardcode',
        name: '卡号码',
        image: '/images/qxm.png'
      })
    }
  }

  return {
    banner: getHomeBanner(courtId),
    announcement: featureMock.getAnnouncement(),
    menus,
    canOfflinePermission: isBackendEnabled(backendInfo.f_OfflinePermission)
  }
}

function getCourtNotices(courtId) {
  return featureMock.getCourtNotices(courtId)
}

function getMyPageConfig(courtId) {
  const app = getAppSafe()
  const isRegisted = !!app.globalData.isRegisted
  const backendInfo = getBackEndUserInfo(courtId) || {}
  const openPay = isPayOpen(courtId)
  const moneyEnabled = isBackendEnabled(backendInfo.f_moneyEn)
  const showPayFeatures = isRegisted && openPay && moneyEnabled
  const validity = backendInfo.f_validity || ''
  const bindType = backendInfo.f_type || ''
  const money = backendInfo.f_money
  return {
    showMembers: isBackendEnabled(backendInfo.f_MemberManagement),
    showDelay: isRegisted && openPay,
    showRecharge: showPayFeatures,
    showBalance: moneyEnabled,
    showValidity: isRegisted,
    canVisitorManage: isBackendEnabled(backendInfo.f_VisitorManagement),
    canOfflinePermission: isBackendEnabled(backendInfo.f_OfflinePermission),
    isAdmin: isBackendEnabled(backendInfo.f_IsAdmin),
    money,
    validity,
    name: backendInfo.f_name,
    tel: backendInfo.f_tel,
    bindType,
    group: backendInfo.f_group,
    userNum: backendInfo.f_uerNum
  }
}

function getCardPageConfig(courtId) {
  const backendInfo = getBackEndUserInfo(courtId) || {}
  return {
    canCardCode: isBackendEnabled(backendInfo.f_SubCard1),
    canVisitorManage: isBackendEnabled(backendInfo.f_VisitorManagement)
  }
}

function getPermissionPageConfig(courtId) {
  const backendInfo = getBackEndUserInfo(courtId) || {}
  return {
    canOfflinePermission: isBackendEnabled(backendInfo.f_OfflinePermission),
    canVisitorManage: isBackendEnabled(backendInfo.f_VisitorManagement)
  }
}

function syncPhoneAuthorization() {
  return getPhoneNumberByCode.apply(null, arguments)
}

function pushPhoneCandidates(candidates, source) {
  if (!source || typeof source !== 'object') return
  candidates.push(source.PhoneNumber, source.phoneNumber, source.Phone, source.phone, source.f_Tel, source.Tel)
  const phoneInfo = source.phone_info || source.phoneInfo || source.PhoneInfo
  if (phoneInfo && typeof phoneInfo === 'object') {
    candidates.push(phoneInfo.phoneNumber, phoneInfo.purePhoneNumber, phoneInfo.PhoneNumber, phoneInfo.PurePhoneNumber)
  }
}

function getPhoneNumberFailMessage(res) {
  const result = res && res.Result
  const source = result && typeof result === 'object' ? result : null
  if (source && source.errcode !== undefined && Number(source.errcode) !== 0) {
    return source.errmsg || '获取手机号失败'
  }
  return '获取手机号失败'
}

function extractPhoneNumber(res) {
  const candidates = []
  pushPhoneCandidates(candidates, res)
  const result = res && res.Result
  if (result && typeof result === 'object') {
    pushPhoneCandidates(candidates, result)
  } else if (typeof result === 'string') {
    const text = result.trim()
    if (/^1\d{10}$/.test(text)) {
      candidates.push(text)
    } else if (text) {
      try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object') {
          pushPhoneCandidates(candidates, parsed)
          pushPhoneCandidates(candidates, parsed.Result)
        }
      } catch (e) { }
    }
  }
  for (let i = 0; i < candidates.length; i++) {
    const phone = String(candidates[i] || '').trim()
    if (/^1\d{10}$/.test(phone)) return phone
  }
  return ''
}

function getPhoneNumberByCode(payload) {
  const source = payload || {}
  const app = getAppSafe()
  const userInfo = app.globalData.userInfo || {}
  const requestData = {
    f_OpenID: String(source.openId || source.f_OpenID || app.globalData.openId || userInfo.f_OpenID || '').trim(),
    f_UnionID: String(source.unionId || source.f_UnionID || userInfo.f_UnionID || '').trim(),
    WeChatCode: String(source.phoneCode || source.WeChatCode || '').trim()
  }

  return new Promise((resolve, reject) => {
    util.getJson('GetPhoneNumber', requestData, function (res) {
      if (res && res.Status === 'success') {
        const phoneNumber = extractPhoneNumber(res)
        if (phoneNumber) {
          resolve({
            Status: 'success',
            PhoneNumber: phoneNumber,
            Response: res
          })
          return
        }
        reject({
          Status: 'fail',
          Result: getPhoneNumberFailMessage(res)
        })
        return
      }
      reject(res || {
        Status: 'fail',
        Result: '获取手机号失败'
      })
    })
  })
}

function registerUserWithPhone(payload) {
  const source = payload || {}
  const profile = source.profile || {}
  const app = getAppSafe()
  return new Promise((resolve) => {
    util.getJson('RegisterUser', {
      f_OpenID: String(source.openId || source.f_OpenID || app.globalData.openId || '').trim(),
      f_Tel: String(source.tel || source.f_Tel || '').trim(),
      f_gender: profile.f_gender || profile.gender || '',
      f_nickname: profile.f_nickname || profile.nickName || profile.nickname || '微信用户',
      f_headpic: profile.f_headpic || profile.avatarUrl || '',
      f_country: profile.f_country || profile.country || '',
      f_province: profile.f_province || profile.province || '',
      f_city: profile.f_city || profile.city || '',
      f_language: profile.f_language || profile.language || ''
    }, resolve)
  })
}

function getKeyListCache() {
  return wx.getStorageSync(KEY_LIST_CACHE_KEY) || {}
}

function saveKeyListCache(cache) {
  wx.setStorageSync(KEY_LIST_CACHE_KEY, cache)
}

function saveLiftSettingCache(devid, selectedFloors, openMode) {
  const deviceId = String(devid || '').trim()
  if (!deviceId) return

  const stored = wx.getStorageSync(LIFT_SETTING_STORAGE_KEY) || {}
  stored[deviceId] = {
    selectedFloors: Array.isArray(selectedFloors) ? selectedFloors : [],
    openMode: !!openMode
  }
  wx.setStorageSync(LIFT_SETTING_STORAGE_KEY, stored)
}

function cacheKeyList(courtId, list) {
  const cache = getKeyListCache()
  cache[String(courtId || '')] = list || []
  saveKeyListCache(cache)
}

function findCachedKeyItem(devid, courtId, devName) {
  const deviceId = String(devid || '').trim()
  if (!deviceId) return null

  const cache = getKeyListCache()
  const courtKey = String(courtId || '').trim()
  const deviceName = String(devName || '').trim()
  const matchItem = function (item) {
    if (String(item.f_devNum || '').trim() !== deviceId) return false
    return !deviceName || String(item.f_devName || '').trim() === deviceName
  }
  const matchDeviceId = function (item) {
    return String(item.f_devNum || '').trim() === deviceId
  }
  if (courtKey && Array.isArray(cache[courtKey])) {
    const hit = cache[courtKey].find(matchItem)
    if (hit) return hit
    const fallback = deviceName ? cache[courtKey].find(matchDeviceId) : null
    if (fallback) return fallback
  }

  const groups = Object.keys(cache)
  for (let i = 0; i < groups.length; i++) {
    const hit = (cache[groups[i]] || []).find(matchItem)
    if (hit) return hit
    const fallback = deviceName ? (cache[groups[i]] || []).find(matchDeviceId) : null
    if (fallback) return fallback
  }

  return null
}

function getKeyList(courtId) {
  return new Promise((resolve, reject) => {
    if (!courtId) {
      resolve([])
      return
    }
    util.getJson('KeyList', {
      CourtID: courtId
    }, function (res) {
      if (res.Status == 'success') {
        const list = (res.Keys || []).map(function (item, index) {
          return Object.assign(
            { courtId: String(courtId || '') },
            featureMock.normalizeKeyItem(item, index)
          )
        })
        cacheKeyList(courtId, list)
        resolve(list)
      } else {
        reject(res)
      }
    })
  })
}

function getVisitorTel() {
  const app = getAppSafe()
  const userInfo = app.globalData.userInfo || {}
  const backendInfo = getBackEndUserInfo() || {}
  return String(userInfo.f_Tel || backendInfo.f_tel || backendInfo.f_Tel || '').trim()
}

function buildVisitorsKeyListRequest() {
  const app = getAppSafe()
  const userInfo = app.globalData.userInfo || {}
  return {
    f_OpenID: String(app.globalData.openId || userInfo.f_OpenID || '').trim(),
    f_UnionID: String(userInfo.f_UnionID || '').trim(),
    f_Tel: getVisitorTel()
  }
}

function getVisitorsKeyList() {
  return new Promise((resolve, reject) => {
    const request = function () {
      const requestData = buildVisitorsKeyListRequest()
      util.getJson('GetVisitorsKeyList', requestData, function (res) {
        if (res && res.Status === 'success') {
          resolve(res)
          return
        }
        reject(res || {
          Status: 'fail',
          Result: '获取访客钥匙列表失败'
        })
      })
    }

    const app = getAppSafe()
    if (!util.isRegisteredUser(app.globalData.userInfo)) {
      util.refreshUserInfo(function () {
        if (!util.isRegisteredUser(getAppSafe().globalData.userInfo)) {
          reject({
            Status: 'fail',
            Result: '请先登录/注册'
          })
          return
        }
        util.refreshBackEndUserInfo(request)
      }, true, true)
      return
    }

    if (!getVisitorTel()) {
      util.refreshBackEndUserInfo(request)
      return
    }

    request()
  })
}

function getVisitorsKeyListRaw() {
  return new Promise((resolve, reject) => {
    util.getJson('GetVisitorsKeyList', buildVisitorsKeyListRequest(), function (res) {
      if (res && res.Status === 'success') {
        resolve(res)
        return
      }
      reject(res || {
        Status: 'fail',
        Result: '获取访客钥匙列表失败'
      })
    })
  })
}

function normalizeVisitorFloorLabel(label) {
  const value = String(label || '').trim()
  if (!value) return ''
  return /层$/.test(value) ? value : value + '层'
}

function normalizeVisitorDoorLabel(item) {
  if (typeof item === 'string') {
    return String(item).trim()
  }
  if (!item || typeof item !== 'object') {
    return ''
  }
  return String(item.Door || '').trim()
}

function dedupeStringList(list) {
  const seen = Object.create(null)
  const result = []
    ; (Array.isArray(list) ? list : []).forEach(function (item) {
      const value = String(item || '').trim()
      if (!value || seen[value]) return
      seen[value] = true
      result.push(value)
    })
  return result
}

function getVisitorFloorSelections(list, deviceId) {
  const target = String(deviceId || '').trim()
  const floors = (Array.isArray(list) ? list : []).filter(function (item) {
    return String(item?.deviceId || '').trim() === target
  }).reduce(function (arr, item) {
    return arr.concat(Array.isArray(item?.floors) ? item.floors : [])
  }, [])
  return dedupeStringList(floors)
}

function buildVisitorSelectedList(deviceId, courtId, floorSelections, deviceName) {
  const current = findCachedKeyItem(deviceId, courtId, deviceName)
  if (current?.type === 'lift') {
    const selectedFloors = getVisitorFloorSelections(floorSelections, deviceId)
    const floors = selectedFloors.length
      ? selectedFloors
      : getLiftSelectedFloors(current)
    const normalizedFloors = (floors || []).map(normalizeVisitorFloorLabel).filter(Boolean)
    return dedupeStringList(normalizedFloors)
  }

  const selectedDoorName = String(deviceName || '').trim()
  if (selectedDoorName) {
    return [selectedDoorName]
  }

  const doorList = dedupeStringList(getDoorSelectList(current).map(normalizeVisitorDoorLabel).filter(Boolean))
  if (doorList.length) {
    return doorList
  }

  const fallback = String(current?.f_devName || deviceId || '').trim()
  return fallback ? [fallback] : []
}

function buildVisitorSharedDevices(payload) {
  const source = payload || {}
  if (source.useBackendAllDevices) return []
  const courtId = String(source.courtId || '').trim()
  const floorSelections = Array.isArray(source.floorSelections) ? source.floorSelections : []
  const result = []
  const merged = Object.create(null)

  const selectedDevices = Array.isArray(source.devices) && source.devices.length
    ? source.devices
    : (Array.isArray(source.deviceIds) ? source.deviceIds : []).filter(Boolean).map(function (deviceId) {
      return {
        deviceId: deviceId
      }
    })

    ; selectedDevices.forEach(function (device) {
      const deviceNumber = String(device && (device.deviceId || device.f_devNum) || '').trim()
      const deviceName = String(device && (device.deviceName || device.f_devName) || '').trim()
      if (!deviceNumber) return

      const selectedList = buildVisitorSelectedList(deviceNumber, courtId, floorSelections, deviceName)
      if (!merged[deviceNumber]) {
        merged[deviceNumber] = {
          f_devicenumber: deviceNumber,
          f_selectedlist: []
        }
        result.push(merged[deviceNumber])
      }

      merged[deviceNumber].f_selectedlist = dedupeStringList(
        merged[deviceNumber].f_selectedlist.concat(selectedList)
      )
    })

  return result
}

function submitVisitorApply(payload) {
  const source = payload || {}
  const app = getAppSafe()
  const userInfo = app.globalData.userInfo || {}
  const openId = String(source.f_OpenID || app.globalData.openId || userInfo.f_OpenID || '').trim()
  const unionId = String(source.f_UnionID || userInfo.f_UnionID || '').trim()
  const courtId = String(source.courtId || app.thisCourt?.f_id || app.globalData.currentCourtId || '').trim()
  const requestData = {
    f_userid: resolveRequestUserId(source, courtId),
    f_OpenID: openId,
    f_UnionID: unionId,
    CourtID: courtId,
    f_useNum: String(source.useCount || '').trim(),
    f_validity: formatCompactDateTimeInput(source.validity, 12),
    f_fkName: String(source.visitorName || '').trim(),
    f_shareddevices: buildVisitorSharedDevices({
      courtId: courtId,
      deviceIds: source.deviceIds,
      devices: source.devices,
      useBackendAllDevices: source.useBackendAllDevices,
      floorSelections: source.floorSelections
    }),
    f_tel: String(source.visitorTel || '').trim()
  }

  return new Promise((resolve, reject) => {
    util.getJson('ShareKey2Visitors', requestData, function (res) {
      if (res && res.Status === 'success') {
        const result = parseMaybeJson(res.Result)
        if (result && typeof result === 'object' && result.Status && result.Status !== 'success') {
          reject({
            Status: 'fail',
            Result: result.Result || result.Message || '申请临时密码失败'
          })
          return
        }
        const rawPassword = result && typeof result === 'object'
          ? (result.Password || result.password || result.f_Password || result.Result || result.Value || res.Password || res.password || res.f_Password || '')
          : (result || res.Password || res.password || res.f_Password || '')
        const password = String(rawPassword === undefined || rawPassword === null ? '' : rawPassword).trim()
        if (!password) {
          reject({
            Status: 'fail',
            Result: '申请临时密码失败，未获取到密码'
          })
          return
        }
        resolve({
          Status: 'success',
          Response: res,
          Password: password,
          RequestData: requestData
        })
        return
      }
      reject(res || {
        Status: 'fail',
        Result: '申请临时密码失败'
      })
    }, {
      noCache: true
    })
  })
}

function normalizeDeviceMode(payload) {
  const source = payload || {}
  if (typeof source.openMode !== 'boolean') return DEVICE_MODE_OPEN
  return source.openMode ? DEVICE_MODE_OPEN : DEVICE_MODE_CONTROL
}

function normalizeSelectedList(selectedFloors) {
  if (!Array.isArray(selectedFloors)) return []

  return selectedFloors.map(function (item) {
    const rawValue = String(item || '')
    const value = rawValue.trim()
    if (!value) return ''
    if (value.endsWith('层')) return value
    return rawValue.endsWith(' ') ? rawValue + '层' : value + '层'
  }).filter(Boolean)
}

function getDoorSelectList(item) {
  const source = item?.f_SelectedMJorTK || item?.f_SelectMJorTK || []
  if (Array.isArray(source)) return source
  if (!source) return []
  try {
    const parsed = JSON.parse(String(source || ''))
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

function buildSelectedDoorList(source, current) {
  const deviceName = String(source.f_devName || current?.f_devName || '').trim()
  if (!deviceName) return []
  return [{
    Door: deviceName,
    Mode: normalizeDeviceMode(source)
  }]
}

function buildSelectedList(source, current, deviceType) {
  if (deviceType === DEVICE_TYPE_DOOR) {
    return buildSelectedDoorList(source, current)
  }
  return normalizeRawFloorValues(source.selectedFloors)
}

function normalizeFloorValue(label) {
  const value = String(label || '').trim()
  if (!value) return ''
  return value.endsWith('层') ? value.slice(0, -1) : value
}

function normalizeSelectedFloorValues(value) {
  let source = Array.isArray(value) ? value : []
  if (!source.length && value) {
    try {
      const parsed = JSON.parse(String(value || ''))
      source = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      source = []
    }
  }
  return source.map(normalizeFloorValue).filter(Boolean)
}

function normalizeRawFloorValues(value) {
  let source = Array.isArray(value) ? value : []
  if (!source.length && value) {
    try {
      const parsed = JSON.parse(String(value || ''))
      source = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      source = []
    }
  }
  return source.map(function (item) {
    return String(item || '').trim()
  }).filter(Boolean)
}

function getLiftSelectedFloors(current) {
  return normalizeRawFloorValues(current?.f_SelectedMJorTK)
}

function getLiftFloorList(current) {
  const source = Array.isArray(current?.floorInfo?.raw?.Floors)
    ? current.floorInfo.raw.Floors
    : (Array.isArray(current?.f_floorInfo?.Floors) ? current.f_floorInfo.Floors : current?.floorInfo?.floors)

  return (Array.isArray(source) ? source : []).map(function (item) {
    return String(item || '').trim()
  }).filter(Boolean)
}

function getDoorOpenMode(current, devName) {
  const deviceName = String(devName || current?.f_devName || '').trim()
  if (!deviceName) {
    const mode = String(current?.f_DevMode || '').trim()
    return mode ? mode === DEVICE_MODE_OPEN : false
  }

  const selectedDoor = getDoorSelectList(current).find(function (item) {
    return String(item?.Door || '').trim() === deviceName
  })

  if (!selectedDoor) {
    const mode = String(current?.f_DevMode || '').trim()
    return mode ? mode === DEVICE_MODE_OPEN : false
  }

  const selectedMode = String(selectedDoor.Mode || '').trim()
  return selectedMode ? selectedMode === DEVICE_MODE_OPEN : false
}

function resolveDeviceType(source, current) {
  const rawType = String(source.deviceType || source.type || current?.type || current?.f_devType || '').trim()
  if (rawType === DEVICE_TYPE_LIFT || rawType === 'lift') return DEVICE_TYPE_LIFT
  if (rawType === DEVICE_TYPE_DOOR || rawType === 'door') return DEVICE_TYPE_DOOR
  return current?.type === 'lift' ? DEVICE_TYPE_LIFT : DEVICE_TYPE_DOOR
}

function resolveDeviceOpenMode(source, current, deviceType) {
  if (typeof source.openMode === 'boolean') {
    return source.openMode
  }
  if (deviceType === DEVICE_TYPE_DOOR) {
    return getDoorOpenMode(current, source.f_devName)
  }
  const mode = String(current?.f_DevMode || '').trim()
  return mode ? mode === DEVICE_MODE_OPEN : false
}

function resolveRequestUserId(source, courtId) {
  const backendInfo = getBackEndUserInfo(courtId) || {}
  return String(source?.f_userid || source?.userId || backendInfo.f_userid || '').trim()
}

function buildOpenDoorSelectedList(source, current, deviceType) {
  if (deviceType === DEVICE_TYPE_DOOR) {
    if (Array.isArray(source.MJSelectedList) && source.MJSelectedList.length) {
      return source.MJSelectedList
    }

    const deviceName = String(source.f_devName || current?.f_devName || '').trim()
    if (!deviceName) return []

    const selectedDoor = getDoorSelectList(current).find(function (item) {
      return String(item?.Door || '').trim() === deviceName
    })

    if (selectedDoor) {
      return [{
        Door: deviceName,
        Mode: String(selectedDoor.Mode || '') === DEVICE_MODE_OPEN ? DEVICE_MODE_OPEN : DEVICE_MODE_CONTROL
      }]
    }

    return buildSelectedDoorList({
      f_devName: deviceName,
      openMode: resolveDeviceOpenMode(source, current, deviceType)
    }, current)
  }

  if (Array.isArray(source.TKSelectedList) && source.TKSelectedList.length) {
    return source.TKSelectedList
  }
  if (Array.isArray(source.selectedFloors) && source.selectedFloors.length) {
    return normalizeRawFloorValues(source.selectedFloors)
  }
  return normalizeRawFloorValues(getLiftSelectedFloors(current))
}

function buildOpenDoorRequest(payload) {
  const source = payload || {}
  const deviceNumber = String(source.devid || source.Devid || '').trim()
  const requestedCourtId = String(source.courtId || source.CourtID || '').trim()
  const current = findCachedKeyItem(deviceNumber, requestedCourtId, source.f_devName)
  const app = getAppSafe()
  const courtId = String(requestedCourtId || current?.courtId || app.thisCourt?.f_id || app.globalData.currentCourtId || '').trim()
  const deviceType = resolveDeviceType(source, current)
  const requestData = {
    Devid: deviceNumber,
    CourtID: courtId,
    f_userid: resolveRequestUserId(source, courtId),
    OperationCode: String(source.operationCode || source.OperationCode || '').trim(),
    DeviceAction: String(source.deviceAction || source.DeviceAction || '00').trim()
  }
  const selectedList = buildOpenDoorSelectedList(source, current, deviceType)

  if (selectedList.length) {
    if (deviceType === DEVICE_TYPE_DOOR) {
      requestData.MJSelectedList = selectedList
    } else {
      requestData.TKSelectedList = selectedList
    }
  }

  return requestData
}

function setUpDeviceMode(payload) {
  const source = payload || {}
  const deviceNumber = String(source.devid || '').trim()
  const current = findCachedKeyItem(deviceNumber, source.courtId, source.f_devName)
  const app = getAppSafe()
  const courtId = String(source.courtId || current?.courtId || app.thisCourt?.f_id || app.globalData.currentCourtId || '').trim()
  const deviceType = resolveDeviceType(source, current)
  const requestData = {
    CourtID: courtId,
    f_userid: resolveRequestUserId(source, courtId),
    DeviceNumber: deviceNumber,
    DeviceType: deviceType,
    DeviceMode: normalizeDeviceMode(source)
  }
  const selectedList = buildSelectedList(source, current, deviceType)

  if (selectedList.length) {
    if (deviceType === DEVICE_TYPE_DOOR) {
      requestData.MJSelectedList = selectedList
    } else {
      requestData.TKSelectedList = selectedList
    }
  }

  if (!deviceNumber) {
    return Promise.reject({
      Status: 'fail',
      Result: '设备编号不能为空'
    })
  }
  if (!courtId) {
    return Promise.reject({
      Status: 'fail',
      Result: '请上传小区ID'
    })
  }

  return new Promise((resolve, reject) => {
    util.getJson('SetUpDeviceMode', requestData, function (res) {
      if (res && res.Status === 'success') {
        resolve(res)
        return
      }
      reject(res || {
        Status: 'fail',
        Result: '设置设备模式失败'
      })
    })
  })
}

function getVisitorRecords(filterType, keyword) {
  return featureMock.filterVisitorRecords(filterType, keyword)
}

function parseShareDeviceSummary(value) {
  if (String(value || '').trim().toUpperCase() === 'ALL') return '全部设备'
  let list = []
  if (Array.isArray(value)) {
    list = value
  } else if (value) {
    try {
      const parsed = JSON.parse(String(value))
      list = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      list = []
    }
  }

  return list.map(function (item) {
    const selected = Array.isArray(item && item.f_selectedlist) ? item.f_selectedlist.filter(Boolean) : []
    if (selected.length) return selected.join('、')
    return String(item && item.f_devicenumber || '').trim()
  }).filter(Boolean).join('，')
}

function formatVisitorValidity(value) {
  const text = String(value || '').trim()
  const digits = text.replace(/\D/g, '')
  if (digits.length < 12) return text
  return digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6, 8) + ' ' + digits.slice(8, 10) + ':' + digits.slice(10, 12)
}

function formatVisitorDateTime(value) {
  const text = String(value || '').trim()
  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (matched) {
    return matched[1] + '-' + matched[2] + '-' + matched[3] + ' ' + matched[4] + ':' + matched[5] + ':' + (matched[6] || '00')
  }
  return text
}

function mapShareKeyRecord(item) {
  const source = item || {}
  const status = Number(source.f_status)
  const visited = status === 1
  const createTime = formatVisitorDateTime(source.f_createdDateTime)
  return {
    id: String(source.f_visitid || ''),
    visitId: String(source.f_visitid || ''),
    userId: String(source.f_userid || ''),
    visitorName: String(source.f_fkName || ''),
    visitorTel: String(source.f_tel || ''),
    userName: String(source.f_username || ''),
    userTel: String(source.f_usertel || ''),
    courtId: String(source.f_groupid || ''),
    courtName: String(source.f_groupname || ''),
    expireTime: formatVisitorValidity(source.f_validity),
    useCount: Number(source.f_useNum || 0),
    sharedDevicesRaw: source.f_shareddevices || '',
    deviceSummary: parseShareDeviceSummary(source.f_shareddevices),
    password: String(source.f_Password || ''),
    status: visited ? 'done' : 'pending',
    statusText: visited ? '已到访' : '未到访',
    statusClass: visited ? 'done' : 'pending',
    createTime: createTime,
    createdTime: createTime,
    qrType: 'A8',
    raw: source
  }
}

function filterShareKeyRecords(list, filterType, keyword) {
  const type = String(filterType || 'all').trim()
  const text = String(keyword || '').trim().toLowerCase()
  return (Array.isArray(list) ? list : []).filter(function (item) {
    if (type === 'done' && item.status !== 'done') return false
    if (type === 'pending' && item.status !== 'pending') return false
    if (!text) return true
    return [item.visitorName, item.visitorTel, item.courtName, item.password, item.deviceSummary].some(function (value) {
      return String(value || '').toLowerCase().indexOf(text) > -1
    })
  })
}

function getMyShareKeyListRaw(payload) {
  const source = payload || {}
  const app = getAppSafe()
  const userInfo = app.globalData.userInfo || {}
  const requestData = {
    f_OpenID: String(source.f_OpenID || app.globalData.openId || userInfo.f_OpenID || '').trim(),
    f_UnionID: String(source.f_UnionID || userInfo.f_UnionID || '').trim(),
    f_userid: resolveRequestUserId(source, source.courtId)
  }

  return new Promise((resolve, reject) => {
    util.getJson('GetMyShareKeyList', requestData, function (res) {
      if (res && res.Status === 'success') {
        resolve(res)
        return
      }
      reject(res || {
        Status: 'fail',
        Result: '获取申请列表失败'
      })
    }, {
      noCache: true
    })
  })
}

function getMyShareKeyList(payload) {
  return getMyShareKeyListRaw(payload).then(function (res) {
    const list = Array.isArray(res && res.Result) ? res.Result : []
    return list.map(mapShareKeyRecord)
  })
}

function getVisitorRecord(id) {
  return featureMock.findVisitorRecord(id)
}

function saveVisitorPassDetail(detail) {
  const source = detail || {}
  wx.setStorageSync(VISITOR_PASS_DETAIL_STORAGE_KEY, source)
  return source
}

function getVisitorPassDetail(id) {
  const cached = wx.getStorageSync(VISITOR_PASS_DETAIL_STORAGE_KEY)
  const target = String(id || '').trim()
  if (cached && typeof cached === 'object') {
    const cachedId = String(cached.id || cached.visitId || '').trim()
    if (!target || !cachedId || cachedId === target) {
      return cached
    }
  }
  return getVisitorRecord(id)
}

function createVisitorRecord(payload) {
  const record = featureMock.createVisitorRecord(payload || {})
  return {
    Status: 'success',
    Record: record
  }
}

function buildRecordLogRequest(courtId, period, keyword, page, rows) {
  const days = Number(period)
  return {
    CourtID: courtId,
    f_userid: resolveRequestUserId({}, courtId),
    jqgridparam: {
      page: Number(page) || 1,
      rows: Number(rows) || 10
    },
    LastDays: days > 0 ? days : 0,
    FilterString: String(keyword || '').trim()
  }
}

function buildRecordLogResult(res) {
  const pager = res && res.Jqgridparam && typeof res.Jqgridparam === 'object'
    ? res.Jqgridparam
    : {}
  return {
    Logs: Array.isArray(res && res.Logs) ? res.Logs : [],
    Page: Number(pager.page) || 1,
    Total: Number(pager.total) || 0,
    Records: Number(pager.records) || 0,
    Rows: Number(pager.rows) || 0,
    Response: res
  }
}

function getPassRecords(period, keyword, courtId, page, rows) {
  if (!isApiAvailable('passRecord')) return Promise.resolve([])
  const app = getAppSafe()
  const resolvedCourtId = String(courtId || app.thisCourt?.f_id || app.globalData.currentCourtId || '').trim()
  if (!resolvedCourtId) return Promise.resolve([])

  return new Promise((resolve, reject) => {
    util.getJson('GetUserMJTKLog', buildRecordLogRequest(resolvedCourtId, period, keyword, page, rows), function (res) {
      if (res && res.Status === 'success') {
        resolve(buildRecordLogResult(res))
        return
      }
      reject(res || {
        Status: 'fail',
        Result: 'GetUserMJTKLog failed'
      })
    })
  })
}

function parsePaymentDate(value) {
  const text = String(value || '').trim()
  if (!text) return null
  const normalized = text
    .replace(/[年月]/g, '-')
    .replace(/[日]/g, ' ')
    .replace(/\//g, '-')
  const fullYearText = /^\d{2}-/.test(normalized) ? '20' + normalized : normalized
  const date = new Date(fullYearText.replace(/-/g, '/'))
  return isNaN(date.getTime()) ? null : date
}

function filterPaymentRecords(list, period, keyword) {
  const days = Number(period)
  const text = String(keyword || '').trim().toLowerCase()
  const now = new Date()
  return (Array.isArray(list) ? list : []).filter(function (item) {
    if (days > 0) {
      const date = parsePaymentDate(item.f_PayTime)
      if (date && now.getTime() - date.getTime() > days * 24 * 60 * 60 * 1000) {
        return false
      }
    }
    if (!text) return true
    return [item.f_PayTime, item.f_UserName, item.f_payType, item.f_PayMoney].some(function (value) {
      return String(value || '').toLowerCase().indexOf(text) > -1
    })
  })
}

function getPaymentRecords(period, keyword, courtId, page, rows) {
  if (!isApiAvailable('paymentRecord')) return Promise.resolve([])
  const app = getAppSafe()
  const resolvedCourtId = String(courtId || app.thisCourt?.f_id || app.globalData.currentCourtId || '').trim()
  if (!resolvedCourtId) return Promise.resolve([])

  return new Promise((resolve, reject) => {
    util.getJson('GetUserPayLog', buildRecordLogRequest(resolvedCourtId, period, keyword, page, rows), function (res) {
      if (res && res.Status === 'success') {
        resolve(buildRecordLogResult(res))
        return
      }
      reject(res || {
        Status: 'fail',
        Result: 'GetUserPayLog failed'
      })
    })
  })
}

function getLiftControl(devid, courtId) {
  const current = findCachedKeyItem(devid, courtId)
  const allFloors = getLiftFloorList(current)
  const selectedFloors = getLiftSelectedFloors(current)
  return {
    Status: 'success',
    Devid: devid,
    CourtID: courtId || current?.courtId || '',
    DoorId: current?.floorInfo?.doorId || '',
    Floors: allFloors,
    SelectedFloors: selectedFloors,
    OpenMode: String(current?.f_DevMode || '') === DEVICE_MODE_OPEN
  }
}

function saveLiftControl(payload) {
  return {
    Status: 'fail',
    Result: '梯控设置接口暂未接入'
  }
}

function executeLiftControl(payload) {
  const current = findCachedKeyItem(payload.devid, payload.courtId)
  return {
    Status: 'fail',
    Result: '楼层下发接口暂未接入',
    Devid: payload.devid,
    CourtID: payload.courtId || current?.courtId || '',
    DoorId: payload.doorId || current?.floorInfo?.doorId || '',
    SelectedFloors: payload.selectedFloors || [],
    OpenMode: !!payload.openMode
  }
}

function getDoorControl(devid, courtId, devName) {
  const current = findCachedKeyItem(devid, courtId, devName)
  return {
    Status: 'success',
    Devid: devid,
    CourtID: courtId || current?.courtId || '',
    OpenMode: getDoorOpenMode(current, devName)
  }
}

function saveDoorControl(payload) {
  return {
    Status: 'fail',
    Result: '门禁设置接口暂未接入'
  }
}

function openDoorInSmallApp(payload) {
  const requestData = buildOpenDoorRequest(payload)

  if (!requestData.Devid) {
    return Promise.reject({
      Status: 'fail',
      Result: 'DeviceNumber required'
    })
  }
  if (!requestData.CourtID) {
    return Promise.reject({
      Status: 'fail',
      Result: 'CourtID required'
    })
  }

  return new Promise((resolve, reject) => {
    util.getJson('OpenDoorInSmallApp', requestData, function (res) {
      if (res && res.Status === 'success') {
        resolve(res)
        return
      }
      reject(res || {
        Status: 'fail',
        Result: 'OpenDoorInSmallApp failed'
      })
    })
  })
}

function saveLiftControlWithApi(payload) {
  const source = payload || {}
  return setUpDeviceMode(Object.assign({}, source, {
    deviceType: DEVICE_TYPE_LIFT
  })).then(function (res) {
    saveLiftSettingCache(source.devid, source.selectedFloors, source.openMode)
    return res
  })
}

function executeLiftControlBlocked(payload) {
  const source = payload || {}
  const current = findCachedKeyItem(source.devid, source.courtId)
  return rejectUnavailableApi('liftExecute', {
    Devid: source.devid,
    CourtID: source.courtId || current?.courtId || '',
    DoorId: source.doorId || current?.floorInfo?.doorId || '',
    SelectedFloors: source.selectedFloors || [],
    OpenMode: !!source.openMode
  })
  return Promise.reject({
    Status: 'fail',
    Result: '楼层下发接口暂未接入',
    Devid: source.devid,
    CourtID: source.courtId || current?.courtId || '',
    DoorId: source.doorId || current?.floorInfo?.doorId || '',
    SelectedFloors: source.selectedFloors || [],
    OpenMode: !!source.openMode
  })
}

function saveDoorControlWithApi(payload) {
  const source = payload || {}
  return setUpDeviceMode(Object.assign({}, source, {
    deviceType: DEVICE_TYPE_DOOR
  })).then(function (res) {
    const deviceId = String(source.devid || '').trim()
    if (deviceId) {
      const settings = featureMock.getDoorSettings()
      settings[deviceId] = !!source.openMode
      featureMock.saveDoorSettings(settings)
    }
    return res
  })
}

function formatDateTime(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

function formatCompactDateTimeInput(value, length) {
  const text = String(value || '').trim()
  if (text) {
    const digits = text.replace(/\D/g, '')
    if (length === 12 && digits.length >= 12) return digits.slice(0, 12)
  }
  return ''
}

function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

module.exports = Object.assign({}, featureMock, {
  isApiAvailable,
  getApiUnavailableMessage,
  isBackendEnabled,
  getBackEndUserInfo,
  getCourtConfigurationInfo,
  getHomeBanner,
  getHomeViewModel,
  isPayOpen,
  getCourtNotices,
  getMyPageConfig,
  getCardPageConfig,
  getPermissionPageConfig,
  syncPhoneAuthorization,
  getPhoneNumberByCode,
  registerUserWithPhone,
  getKeyList,
  getVisitorsKeyList,
  getVisitorsKeyListRaw,
  submitVisitorApply,
  getVisitorRecords,
  filterShareKeyRecords,
  getMyShareKeyList,
  getMyShareKeyListRaw,
  getVisitorRecord,
  saveVisitorPassDetail,
  getVisitorPassDetail,
  createVisitorRecord,
  getPassRecords,
  getPaymentRecords,
  getLiftControl,
  setUpDeviceMode,
  openDoorInSmallApp,
  saveLiftControl: saveLiftControlWithApi,
  executeLiftControl: executeLiftControlBlocked,
  getDoorControl,
  saveDoorControl: saveDoorControlWithApi
})
