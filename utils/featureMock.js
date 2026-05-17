const VISITOR_STORAGE_KEY = 'feature_visitor_records'
const DOOR_SETTING_STORAGE_KEY = 'feature_door_settings'
const DEBUG_OPEN_PERMISSION = false

function getAppSafe() {
  try {
    return getApp()
  } catch (e) {
    return {
      globalData: {
        userInfo: null,
        isRegisted: false
      }
    }
  }
}

function isManager() {
  if (DEBUG_OPEN_PERMISSION) return true
  const app = getAppSafe()
  const tel = app.globalData.userInfo?.f_Tel || ''
  return ['13400001469', '13800138000'].indexOf(tel) > -1
}

function getHomeMenus(isRegisted) {
  if (DEBUG_OPEN_PERMISSION) {
    return [{
      id: 'keyslist',
      name: '钥匙列表',
      image: '/images/home_yslb.png'
    }, {
      id: 'visitormanage',
      name: '访客管理',
      image: '/images/home_fxys.png'
    }, {
      id: 'visitorme',
      name: '我是访客',
      image: '/images/me.png'
    }, {
      id: 'showQR',
      name: '扫一扫',
      image: '/images/code3.png',
      online: true
    }, {
      id: 'cardcode',
      name: '卡号码',
      image: '/images/code.png'
    }]
  }
  const menus = [{
    id: isRegisted ? 'keyslist' : 'visitorme',
    name: isRegisted ? '钥匙列表' : '我是访客',
    image: isRegisted ? '/images/home_yslb.png' : '/images/home_fxys.png'
  }, {
    id: isRegisted ? 'visitormanage' : 'showQR',
    name: isRegisted ? '访客管理' : '扫一扫',
    image: isRegisted ? '/images/home_fxys.png' : '/images/code3.png',
    online: !isRegisted
  }]
  if (isRegisted) {
    menus.push({
      id: 'showQR',
      name: '扫一扫',
      image: '/images/code3.png',
      online: true
    }, {
      id: 'cardcode',
      name: '卡号码',
      image: '/images/code.png'
    })
  }
  return menus
}

function getCourtNotices(courtId) {
  const name = courtId === 'debug_court_1' ? '软件V8.26：上云测试' : '智慧云门禁演示小区'
  return [{
    f_noticeID: 'notice_' + (courtId || 'default') + '_1',
    f_noticeName: '智慧云门禁新版上线通知',
    f_noticeMsg: '<div><p>尊敬的业主：</p><p>“' + name + '” 已完成新版功能升级，公告中心、访客管理、权限码页面已同步优化。</p><p>如遇异常，请联系物业或管理中心处理。</p></div>',
    f_date: '2026-04-08'
  }, {
    f_noticeID: 'notice_' + (courtId || 'default') + '_2',
    f_noticeName: '访客通行功能调整说明',
    f_noticeMsg: '<div><p>访客二维码、临时密码与访客记录已统一整合。</p><p>已到访和未到访记录均可查看对应通行信息，请按页面提示使用。</p></div>',
    f_date: '2026-04-06'
  }, {
    f_noticeID: 'notice_' + (courtId || 'default') + '_3',
    f_noticeName: '系统维护提醒',
    f_noticeMsg: '<div><p>平台将定期进行服务维护，维护期间如遇到加载缓慢，请稍后重试。</p><p>感谢您的理解与配合。</p></div>',
    f_date: '2026-04-01'
  }]
}

function getAnnouncement(courtId) {
  const list = getCourtNotices(courtId)
  return list.length ? list[0].f_noticeName : '智慧云门禁新版上线啦！'
}

function getDebugCourts() {
  return [{
    f_id: 'debug_court_1',
    GroupName: '软件V8.26：上云测试'
  }]
}

function getDebugKeys() {
  return [{
    f_devNum: '20000001',
    f_devName: '1栋大门'
  }, {
    f_devNum: '80000001',
    f_devName: '1栋电梯'
  }, {
    f_devNum: '80000002',
    f_devName: '2栋B电梯'
  }, {
    f_devNum: '40000001',
    f_devName: '北区大门'
  }]
}

function getDebugQrContent(type) {
  const date = new Date()
  const time =
    ('00' + date.getFullYear()).substr(-2) +
    ('00' + (date.getMonth() + 1)).substr(-2) +
    ('00' + date.getDate()).substr(-2) +
    ('00' + date.getHours()).substr(-2) +
    ('00' + date.getMinutes()).substr(-2)
  return 'Time:' + time + ',Type:' + type + ',Value:DEBUG'
}

function normalizeFloorLabel(label) {
  const value = String(label || '').trim()
  if (!value) return ''
  return value.endsWith('层') ? value.slice(0, -1) : value
}

function parseFloorMask(mask, floors) {
  const list = Array.isArray(floors) ? floors : []
  const source = String(mask || '').trim()
  if (!list.length) return []
  if (!source) return list.slice()

  const binary = source
    .replace(/^0x/i, '')
    .split('')
    .map(function (char) {
      const value = parseInt(char, 16)
      return (isNaN(value) ? 0 : value).toString(2).padStart(4, '0')
    })
    .join('')

  const padded = binary.length >= list.length
    ? binary.slice(0, list.length)
    : binary.padEnd(list.length, '0')

  const selected = list.filter(function (_, index) {
    return padded.charAt(index) === '1'
  })

  return selected.length ? selected : list.slice()
}

function normalizeFloorInfo(info) {
  const source = info && typeof info === 'object' ? info : {}
  const floors = (source.Floors || []).map(normalizeFloorLabel).filter(Boolean)
  return {
    raw: source,
    doorId: String(source.DoorId || '').trim(),
    floorMask: String(source.Floor || '').trim(),
    floors: floors,
    selectedFloors: parseFloorMask(source.Floor, floors)
  }
}

function normalizeSelectedFloorList(value) {
  let source = Array.isArray(value) ? value : []
  if (!source.length && value) {
    try {
      const parsed = JSON.parse(String(value || ''))
      source = Array.isArray(parsed) ? parsed : []
    } catch (e) {
      source = []
    }
  }
  return source.map(normalizeFloorLabel).filter(Boolean)
}

function normalizeKeyType(item) {
  const rawType = String(item.f_devType || '').trim()
  if (rawType === '梯控') return 'lift'
  if (rawType === '门禁') return 'door'
  return ''
}

function normalizeKeyItem(item, index) {
  const type = normalizeKeyType(item)
  const rawType = String(item.f_devType || '').trim()
  const floorInfo = normalizeFloorInfo(item.f_floorInfo)
  const selectedFloors = normalizeSelectedFloorList(item.f_SelectedMJorTK)
  const deviceNum = String(item.f_devNum || '').trim()
  const deviceId = String(item.f_devid || '').trim()
  const itemKey = [deviceId || 'dev', deviceNum || 'num', index || 0].join('_')

  return Object.assign({}, item, {
    f_devName: String(item.f_devName || '').trim(),
    f_devNum: deviceNum,
    f_devid: deviceId,
    type: type,
    typeName: rawType,
    floorInfo: Object.assign({}, floorInfo, {
      floors: floorInfo.floors,
      selectedFloors: selectedFloors
    }),
    itemKey: itemKey
  })
}

function filterKeys(list, filterType, keyword) {
  const key = (keyword || '').trim()
  return (list || []).map(function (item, index) {
    return normalizeKeyItem(item, index)
  }).filter(item => {
    const typeOk = !filterType || filterType === 'all' || item.type === filterType
    const keywordOk = !key || (item.f_devName || '').indexOf(key) > -1
    return typeOk && keywordOk
  })
}

function getFloorOptions() {
  const arr = ['-2', '-1']
  for (let i = 1; i <= 62; i++) {
    arr.push((i < 10 ? '0' : '') + i)
  }
  return arr
}

function getDoorSettings() {
  return wx.getStorageSync(DOOR_SETTING_STORAGE_KEY) || {}
}

function saveDoorSettings(data) {
  wx.setStorageSync(DOOR_SETTING_STORAGE_KEY, data)
}

function getVisitorRecords() {
  const stored = wx.getStorageSync(VISITOR_STORAGE_KEY)
  if (stored && stored.length) {
    return stored
  }
  const seed = [{
    id: 'visitor_seed_1',
    createTime: '2025-09-09 14:15:02',
    applyUser: '张三',
    courtName: '智慧云门禁演示小区',
    visitorName: '王五',
    visitorTel: '13800001234',
    expireTime: '2025年09月09日 00时00分',
    useCount: 10,
    password: '123456',
    status: 'done',
    statusText: '已到访',
    deviceNames: ['1栋大门'],
    deviceIds: ['20000001'],
    floorSelections: [],
    qrType: 'A8'
  }, {
    id: 'visitor_seed_2',
    createTime: '2025-09-09 14:20:05',
    applyUser: '李四',
    courtName: '瓦达2号小区',
    visitorName: '赵六',
    visitorTel: '13900005678',
    expireTime: '2025年09月09日 00时00分',
    useCount: 10,
    password: '234567',
    status: 'pending',
    statusText: '未到访',
    deviceNames: ['1栋电梯'],
    deviceIds: ['80000001'],
    floorSelections: [{
      deviceId: '80000001',
      deviceName: '1栋电梯',
      floors: ['01']
    }],
    qrType: 'A8'
  }]
  wx.setStorageSync(VISITOR_STORAGE_KEY, seed)
  return seed
}

function saveVisitorRecords(list) {
  wx.setStorageSync(VISITOR_STORAGE_KEY, list)
}

function createVisitorRecord(data) {
  const list = getVisitorRecords()
  const now = new Date()
  const record = {
    id: 'visitor_' + now.getTime(),
    recordSn: 'SN' + now.getTime(),
    createTime: formatDateTime(now),
    applyUser: data.applyUser || '张三',
    courtName: data.courtName || '',
    visitorName: data.visitorName,
    visitorTel: data.visitorTel,
    expireTime: data.expireTime,
    useCount: data.useCount || 1,
    password: String(data.password || ''),
    status: 'pending',
    statusText: '未到访',
    deviceNames: data.deviceNames || [],
    deviceIds: data.deviceIds || [],
    floorSelections: data.floorSelections || [],
    qrType: 'A8'
  }
  list.unshift(record)
  saveVisitorRecords(list)
  return record
}

function createVisitorPassword() {
  return String(Math.floor(Math.random() * 900000 + 100000))
}

function findVisitorRecord(id) {
  const list = getVisitorRecords()
  return list.find(item => item.id === id) || list[0]
}

function filterVisitorRecords(status, keyword) {
  const key = (keyword || '').trim()
  return getVisitorRecords().filter(item => {
    const statusOk = !status || status === 'all' || item.status === status
    const keyOk = !key ||
      String(item.applyUser || '').indexOf(key) > -1 ||
      String(item.courtName || '').indexOf(key) > -1 ||
      String(item.visitorName || '').indexOf(key) > -1
    return statusOk && keyOk
  })
}

function getCardGuideLines() {
  return [
    '显示本二维码，由10CM以上距离慢慢靠近摄像头。',
    '本二维码程序需配合我司专用二维码读头使用。',
    '二维码为动态显示，复制、截图、转发无效。',
    '可设置访客二维码，截屏或转发给来访人员使用，并可限制其时间（1分钟-24小时）。'
  ]
}

function getVisitorPassGuideLines() {
  return [
    '1、出示此二维码 或 输入密码进行验证。',
    '2、可截屏 或 点击二维码 保存转发图片。',
    '3、超过截止时间 或 次数用完立即失效。'
  ]
}

function getPassRecordFilters() {
  return [
    { value: '30', label: '近30天内' },
    { value: '90', label: '近90天内' },
    { value: 'all', label: '全部' }
  ]
}

function getPassRecords(period, keyword) {
  const list = [
    { time: '25-09-09 14:15:02', name: 'A小区1栋大门', user: '张三', method: '手机远程' },
    { time: '25-09-09 14:16:05', name: '小区1栋大门', user: '张三', method: '扫码开门' },
    { time: '25-09-09 14:17:10', name: '小区1栋大门', user: '张三', method: '临时密码' },
    { time: '25-09-08 10:20:00', name: '2栋B电梯', user: '李四', method: '扫码开门' },
    { time: '25-09-07 09:08:11', name: '北区大门', user: '王五', method: '手机远程' }
  ]
  return filterRecordList(filterRecordsByRole(list, 'user'), period, keyword, ['name', 'user', 'method'])
}

function getPaymentRecords(period, keyword) {
  const list = [
    { time: '25-09-09 14:15:02', user: '张三', type: '充值', money: '100' },
    { time: '25-09-09 14:20:05', user: '张三', type: '延期', money: '100' },
    { time: '25-09-08 11:32:10', user: '李四', type: '充值', money: '200' },
    { time: '25-09-06 16:05:33', user: '王五', type: '延期', money: '50' }
  ]
  return filterRecordList(filterRecordsByRole(list, 'user'), period, keyword, ['user', 'type', 'money'])
}

function filterRecordsByRole(list, userKey) {
  if (DEBUG_OPEN_PERMISSION || isManager()) return list
  const app = getAppSafe()
  const currentName = app.globalData.userInfo?.f_nickname || ''
  if (!currentName) return []
  return list.filter(item => String(item[userKey] || '') === currentName)
}

function filterRecordList(list, period, keyword, keys) {
  const key = (keyword || '').trim()
  let current = list
  if (period === '30') current = list.slice(0, 2)
  if (period === '90') current = list.slice(0, 3)
  return current.filter(item => {
    return !key || keys.some(k => String(item[k] || '').indexOf(key) > -1)
  })
}

function formatDateTime(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
}

function pad(num) {
  return num < 10 ? '0' + num : '' + num
}

module.exports = {
  DEBUG_OPEN_PERMISSION,
  isManager,
  getHomeMenus,
  getAnnouncement,
  getCourtNotices,
  getDebugCourts,
  getDebugKeys,
  getDebugQrContent,
  normalizeKeyItem,
  filterKeys,
  getFloorOptions,
  getDoorSettings,
  saveDoorSettings,
  getVisitorRecords,
  saveVisitorRecords,
  createVisitorRecord,
  findVisitorRecord,
  filterVisitorRecords,
  getCardGuideLines,
  getVisitorPassGuideLines,
  getPassRecordFilters,
  getPassRecords,
  getPaymentRecords
}
