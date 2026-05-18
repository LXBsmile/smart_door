const app = getApp()
const util = require('../../utils/util')
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')

const TEXT = {
  courtLoadFailed: '加载小区信息失败',
  keyLoadFailed: '加载钥匙列表失败',
  tip: '提示',
  chooseDeviceFirst: '请先选择设备',
  chooseFloorFirst: '请先选择电梯楼层'
}

Page({
  data: {
    pageMode: 'menu',
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index: '0',
    allKeys: [],
    keys: [],
    allApplications: [],
    applications: [],
    filterType: 'all',
    keyword: '',
    checkedAll: false,
    hasSelected: false,
    applyQuery: '',
    returnPage: '',
    selectedIds: [],
    selectedFloorSelections: [],
    selectionHydrated: false,
    canVisitorManage: false
  },
  ensureFeatureLogin: function () {
    if (this.data.pageMode === 'menu') {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    if (app.globalData.isRegisted && util.isRegisteredUser(app.globalData.userInfo)) {
      util.clearFeatureLoginPrompt(this)
      return true
    }
    this.setData({
      courts: [],
      thisCourtName: '',
      thisCourtID: '',
      index: '0',
      allKeys: [],
      keys: [],
      allApplications: [],
      applications: [],
      checkedAll: false,
      hasSelected: false,
      selectionHydrated: false,
      canVisitorManage: false
    })
    util.scheduleFeatureLoginPrompt(this)
    return false
  },

  onLoad: function (options) {
    options = options || {}
    this.applyPageMode(options.mode)
    this.setData({
      applyQuery: this.buildApplyQuery(options),
      returnPage: options.return ? options.return : '',
      selectedIds: this.parseSelectedIds(options.ids),
      selectedFloorSelections: this.parseFloorSelections(options.floors),
      selectionHydrated: false
    })
  },

  onShow: function () {
    this.applyPageTitle()
    if (!this.ensureFeatureLogin()) {
      return
    }
    this.refreshVisitorManageState()
    if (this.data.pageMode === 'select') {
      this.loadData()
      return
    }
    if (this.data.pageMode === 'applylist') {
      this.loadApplyList()
    }
  },

  onPullDownRefresh: function () {
    if (!this.ensureFeatureLogin()) {
      wx.stopPullDownRefresh()
      return
    }
    if (this.data.pageMode === 'select') {
      this.loadData()
      return
    }
    if (this.data.pageMode === 'applylist') {
      this.loadApplyList()
      return
    }
    wx.stopPullDownRefresh()
  },
  onHide: function () {
    util.clearFeatureLoginPrompt(this)
  },
  onUnload: function () {
    util.clearFeatureLoginPrompt(this)
  },
  showListLoading: function () {
    wx.showLoading({
      title: '加载中',
      mask: true
    })
  },
  hideListLoading: function () {
    wx.hideLoading()
  },

  applyPageMode: function (mode) {
    const pageMode = mode === 'select' || mode === 'applylist' ? mode : 'menu'
    this.setData({
      pageMode: pageMode
    })
    this.applyPageTitle(pageMode)
  },

  applyPageTitle: function (mode) {
    const pageMode = mode || this.data.pageMode
    wx.setNavigationBarTitle({
      title: pageMode === 'select' ? '选择设备' : (pageMode === 'applylist' ? '申请列表' : '访客管理')
    })
  },

  buildApplyQuery: function (options) {
    const keys = ['name', 'tel', 'counts', 'date', 'time']
    const arr = []
    keys.forEach(function (key) {
      if (options[key]) {
        arr.push(key + '=' + encodeURIComponent(options[key]))
      }
    })
    return arr.length ? '&' + arr.join('&') : ''
  },

  decodeText: function (value) {
    if (!value) return ''
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return value
    }
  },

  getVisitorManageState: function (courtId) {
    const backendInfo = appService.getBackEndUserInfo(courtId)
    return appService.isBackendEnabled(backendInfo?.f_VisitorManagement)
  },

  refreshVisitorManageState: function () {
    if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
      this.setData({
        canVisitorManage: false
      })
      return
    }
    const stored = util.getStoredCourtState()
    const courtId = String(stored.currentCourt?.f_id || this.data.thisCourtID || '').trim()
    this.setData({
      canVisitorManage: this.getVisitorManageState(courtId)
    })
    if (!courtId) return
    util.refreshBackEndUserInfo((res) => {
      if (String(stored.currentCourt?.f_id || this.data.thisCourtID || '') !== courtId) return
      if (!res || res.Status !== 'success') return
      this.setData({
        canVisitorManage: this.getVisitorManageState(courtId)
      })
    }, {
      courtId: courtId,
      force: true
    })
  },

  parseSelectedIds: function (value) {
    return this.decodeText(value).split(',').filter(Boolean)
  },

  parseFloorSelections: function (value) {
    const text = this.decodeText(value)
    if (!text) return []
    try {
      const list = JSON.parse(text)
      return Array.isArray(list) ? list : []
    } catch (e) {
      return []
    }
  },

  openModule: function (e) {
    const module = e.currentTarget.dataset.module
    if (module === 'visitor') {
      if (!this.data.canVisitorManage) return
      wx.navigateTo({
        url: '/pages/visitorme/visitorme?mode=visitor',
      })
      return
    }
    if (module === 'manage') {
      wx.navigateTo({
        url: '/pages/visitormanage/visitormanage?mode=applylist',
      })
      return
    }
    if (module === 'share') {
      wx.navigateTo({
        url: '/pages/sharekeys/sharekeys?from=visitormanage',
      })
    }
  },

  loadData: function () {
    var that = this
    util.ensureCourtState(function (stored) {
      if (!stored.currentCourt) {
        util.noticeArea('index')
        that.hideListLoading()
        wx.stopPullDownRefresh()
        return
      }
      that.setData({
        courts: stored.groups,
        thisCourtName: stored.currentCourt.GroupName,
        thisCourtID: stored.currentCourt.f_id,
        index: stored.index
      })
      that.getKeyList()
    })
  },

  getKeyList: function () {
    var that = this
    that.showListLoading()
    appService.getKeyList(that.data.thisCourtID).then(function (keys) {
      that.setData({
        allKeys: keys
      })
      that.applyFilter()
      that.hideListLoading()
      wx.stopPullDownRefresh()
    }).catch(function (res) {
      that.hideListLoading()
      util.notice(TEXT.keyLoadFailed, res.Result)
      wx.stopPullDownRefresh()
    })
  },

  selectcourt: function (e) {
    var index = e.detail.value
    this.setData({
      thisCourtName: this.data.courts[index].GroupName,
      thisCourtID: this.data.courts[index].f_id,
      index: index
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(this.data.courts[index], Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = this.data.courts[index]
    }
    this.getKeyList()
  },

  setFilter: function (e) {
    this.setData({
      filterType: e.currentTarget.dataset.type
    })
    this.showListLoading()
    if (this.data.pageMode === 'applylist') {
      this.applyApplicationFilter()
    } else {
      this.applyFilter()
    }
    this.hideListLoading()
  },

  inputKeyword: function (e) {
    this.setData({
      keyword: e.detail.value
    })
  },

  search: function () {
    this.showListLoading()
    if (this.data.pageMode === 'applylist') {
      this.applyApplicationFilter()
    } else {
      this.applyFilter()
    }
    this.hideListLoading()
  },

  loadApplyList: function () {
    var that = this
    that.showListLoading()
    appService.getMyShareKeyList().then(function (list) {
      that.setData({
        allApplications: list
      })
      that.applyApplicationFilter()
      that.hideListLoading()
      wx.stopPullDownRefresh()
    }).catch(function (res) {
      that.hideListLoading()
      util.notice('加载申请列表失败', res && res.Result ? res.Result : '请稍后重试')
      wx.stopPullDownRefresh()
    })
  },

  applyApplicationFilter: function () {
    const list = appService.filterShareKeyRecords(this.data.allApplications, this.data.filterType, this.data.keyword)
    this.setData({
      applications: list
    })
  },

  gotoAddApply: function () {
    if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
      util.clearFeatureLoginPrompt(this)
      util.promptFeatureLogin()
      return
    }
    wx.navigateTo({
      url: '/pages/visitorapply/visitorapply',
    })
  },

  openVisitorPass: function (e) {
    const item = this.data.applications[e.currentTarget.dataset.index]
    if (!item) return
    appService.saveVisitorPassDetail(item)
    wx.navigateTo({
      url: '/pages/visitorpass/visitorpass?id=' + encodeURIComponent(item.id || ''),
    })
  },

  applyFilter: function () {
    const that = this
    let list = featureMock.filterKeys(this.data.allKeys, this.data.filterType, this.data.keyword).map(function (item) {
      return that.createViewItem(item)
    })
    if (!this.data.selectionHydrated && this.data.selectedIds.length) {
      list = list.map(function (item) {
        return that.applySelectedState(item)
      })
    }
    this.setData({
      keys: list,
      checkedAll: list.length > 0 && list.every(function (item) { return that.isItemFullyChecked(item) }),
      hasSelected: this.hasAnySelected(list),
      selectionHydrated: this.data.selectionHydrated || this.data.selectedIds.length > 0
    })
  },

  createViewItem: function (item) {
    return Object.assign({}, item, {
      checked: false,
      floorExpanded: item.type === 'lift',
      floorItems: item.type === 'lift' ? this.buildFloorItems(item) : [],
      partialChecked: false
    })
  },

  applySelectedState: function (item) {
    const id = String(item.f_devNum || '')
    if (this.data.selectedIds.indexOf(id) === -1) return item

    item.checked = true
    if (item.type === 'lift') {
      item.floorExpanded = true
      if (!item.floorItems || !item.floorItems.length) {
        item.floorItems = this.buildFloorItems(item)
      }
      const selectedFloors = this.getSelectedFloors(id)
      const that = this
      item.floorItems = item.floorItems.map(function (floor) {
        floor.checked = selectedFloors.length
          ? selectedFloors.some(function (selected) { return that.isSameFloor(floor.label, selected) })
          : true
        return floor
      })
      item = this.syncPartialChecked(item)
    }
    return item
  },

  getSelectedFloors: function (deviceId) {
    const target = String(deviceId || '')
    const hit = (this.data.selectedFloorSelections || []).find(function (item) {
      return String(item.deviceId || '') === target
    })
    const floors = hit && Array.isArray(hit.floors) ? hit.floors : []
    return floors.map(this.normalizeFloorLabel).filter(Boolean)
  },

  normalizeFloorLabel: function (value) {
    const text = String(value || '').trim()
    const match = text.match(/-?\d+/)
    return match ? match[0] : text
  },

  isSameFloor: function (left, right) {
    const a = this.normalizeFloorLabel(left)
    const b = this.normalizeFloorLabel(right)
    if (a === b) return true
    if (/^-?\d+$/.test(a) && /^-?\d+$/.test(b)) {
      return Number(a) === Number(b)
    }
    return false
  },

  resetSelection: function () {
    this.setData({
      checkedAll: false,
      hasSelected: false,
      keys: this.data.keys.map(function (item) {
        item.checked = false
        item.partialChecked = false
        item.floorExpanded = item.type === 'lift'
        if (item.floorItems && item.floorItems.length) {
          item.floorItems = item.floorItems.map(function (floor) {
            floor.checked = false
            return floor
          })
        }
        return item
      })
    })
  },

  toggleAll: function () {
    const checked = !this.data.checkedAll
    const that = this
    const list = this.data.keys.map(function (item) {
      item.checked = checked
      item = that.syncLiftFloors(item)
      item = that.syncPartialChecked(item)
      return item
    })
    this.setData({
      checkedAll: checked,
      hasSelected: checked,
      keys: list
    })
  },

  isItemFullyChecked: function (item) {
    if (!item) return false
    if (item.type !== 'lift') return !!item.checked
    const floors = item.floorItems || []
    return floors.length > 0 && floors.every(function (floor) { return floor.checked })
  },

  hasAnySelected: function (list) {
    return (list || []).some(function (item) { return item.checked })
  },

  toggleItem: function (e) {
    const idx = e.currentTarget.dataset.index
    const list = this.data.keys
    if (list[idx] && list[idx].type === 'lift') {
      list[idx] = this.toggleLiftAllFloors(list[idx])
    } else {
      list[idx].checked = !list[idx].checked
    }
    list[idx] = this.syncPartialChecked(list[idx])
    const that = this
    this.setData({
      keys: list,
      checkedAll: list.length > 0 && list.every(function (item) { return that.isItemFullyChecked(item) }),
      hasSelected: this.hasAnySelected(list)
    })
  },

  toggleFloorPanel: function (e) {
    const idx = e.currentTarget.dataset.index
    const list = this.data.keys
    if (!list[idx] || list[idx].type !== 'lift') return
    list[idx].floorExpanded = !list[idx].floorExpanded
    this.setData({
      keys: list
    })
  },

  toggleLiftAllFloors: function (item) {
    if (!item.floorItems || !item.floorItems.length) {
      item.floorItems = this.buildFloorItems(item)
    }
    const shouldCheck = !item.checked || !item.floorItems.every(function (floor) { return floor.checked })
    item.checked = shouldCheck
    item.floorExpanded = true
    item.floorItems = item.floorItems.map(function (floor) {
      floor.checked = shouldCheck
      return floor
    })
    item.partialChecked = false
    return item
  },

  syncPartialChecked: function (item) {
    if (!item || item.type !== 'lift' || !item.floorItems || !item.floorItems.length) {
      if (item) item.partialChecked = false
      return item
    }
    const checkedCount = item.floorItems.filter(function (floor) { return floor.checked }).length
    item.checked = checkedCount > 0
    item.partialChecked = checkedCount > 0 && checkedCount < item.floorItems.length
    return item
  },

  syncLiftFloors: function (item) {
    if (!item || item.type !== 'lift') {
      return item
    }
    item.floorExpanded = true
    if (!item.floorItems || !item.floorItems.length) {
      item.floorItems = this.buildFloorItems(item)
    }
    item.floorItems = item.floorItems.map(function (floor) {
      floor.checked = !!item.checked
      return floor
    })
    return item
  },

  buildFloorItems: function (item) {
    const floorInfo = item.floorInfo || {}
    const floors = floorInfo.raw && Array.isArray(floorInfo.raw.Floors) && floorInfo.raw.Floors.length
      ? floorInfo.raw.Floors
      : (floorInfo.floors && floorInfo.floors.length ? floorInfo.floors : featureMock.getFloorOptions())
    return floors.map(function (floor) {
      return {
        label: String(floor || '').trim(),
        checked: false
      }
    })
  },

  toggleFloor: function (e) {
    const idx = e.currentTarget.dataset.index
    const floorIdx = e.currentTarget.dataset.floorIndex
    const list = this.data.keys
    if (!list[idx] || !list[idx].floorItems || !list[idx].floorItems[floorIdx]) return
    list[idx].floorItems[floorIdx].checked = !list[idx].floorItems[floorIdx].checked
    list[idx] = this.syncPartialChecked(list[idx])
    const that = this
    this.setData({
      keys: list,
      checkedAll: list.length > 0 && list.every(function (item) { return that.isItemFullyChecked(item) }),
      hasSelected: this.hasAnySelected(list)
    })
  },

  gotoApply: function (e) {
    const selected = this.data.keys.filter(function (item) { return item.checked })
    const that = this
    const isAllSelected = this.data.keys.length > 0 && this.data.keys.every(function (item) { return that.isItemFullyChecked(item) })
    const invalidLift = selected.find(function (item) {
      return item.type === 'lift' && (!item.floorItems || !item.floorItems.some(function (floor) { return floor.checked }))
    })
    const ids = selected.map(function (item) { return item.f_devNum }).join(',')
    if (!ids) {
      util.notice(TEXT.tip, TEXT.chooseDeviceFirst)
      return
    }
    if (invalidLift) {
      util.notice(TEXT.tip, TEXT.chooseFloorFirst)
      return
    }
    const floorSelections = selected.filter(function (item) {
      return item.type === 'lift'
    }).map(function (item) {
      return {
        deviceId: item.f_devNum,
        deviceName: item.f_devName,
        floors: (item.floorItems || []).filter(function (floor) { return floor.checked }).map(function (floor) { return floor.label })
      }
    })
    const devices = selected.map(function (item) {
      return {
        deviceId: item.f_devNum,
        deviceName: item.f_devName,
        type: item.type
      }
    })
    const selection = {
      ids: isAllSelected ? '' : ids,
      courtid: this.data.thisCourtID,
      courtname: this.data.thisCourtName,
      devices: isAllSelected ? [] : devices,
      floorSelections: isAllSelected ? [] : floorSelections
    }
    const url = this.buildVisitorApplyUrl(selection)
    this.resetSelection()
    if (this.data.returnPage === 'visitorapply') {
      if (this.backToVisitorApply(selection)) return
      wx.redirectTo({
        url: url,
      })
      return
    }
    wx.navigateTo({
      url: url,
    })
  },

  buildVisitorApplyUrl: function (selection) {
    const source = selection || {}
    return '/pages/visitorapply/visitorapply?ids=' + encodeURIComponent(source.ids || '') + '&courtid=' + encodeURIComponent(source.courtid || '') + '&courtname=' + encodeURIComponent(source.courtname || '') + '&devices=' + encodeURIComponent(JSON.stringify(source.devices || [])) + '&floors=' + encodeURIComponent(JSON.stringify(source.floorSelections || [])) + this.data.applyQuery
  },

  backToVisitorApply: function (selection) {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null
    if (!prevPage || prevPage.route !== 'pages/visitorapply/visitorapply') return false

    const payload = Object.assign({}, selection, {
      devicesText: JSON.stringify(selection.devices || []),
      floors: JSON.stringify(selection.floorSelections || [])
    })
    if (typeof prevPage.applyDeviceSelection === 'function') {
      prevPage.applyDeviceSelection(payload)
    } else if (typeof prevPage.setData === 'function') {
      prevPage.setData({
        ids: payload.ids,
        courtid: payload.courtid,
        courtname: payload.courtname,
        selectedDevices: payload.devices,
        floorSelections: payload.floorSelections
      })
      if (typeof prevPage.loadDeviceNames === 'function') {
        prevPage.loadDeviceNames()
      }
    }
    wx.navigateBack({
      delta: 1,
    })
    return true
  },

  gotoShare: function (e) {
    const item = this.data.keys[e.currentTarget.dataset.index]
    if (!item) return
    this.resetSelection()
    wx.navigateTo({
      url: '/pages/sharekeys/sharekeys?courtid=' + encodeURIComponent(this.data.thisCourtID) + '&courtname=' + encodeURIComponent(this.data.thisCourtName) + '&devid=' + encodeURIComponent(item.f_devNum) + '&devname=' + encodeURIComponent(item.f_devName) + '&from=visitormanage',
    })
  }
})
