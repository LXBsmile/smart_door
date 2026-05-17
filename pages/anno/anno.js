const util = require('../../utils/util')
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
const app = getApp()

Page({
  data: {
    annos: [],
    thisCourtName: '',
    thisCourtID: '',
    courts: [],
    disablelist: {},
    thisTime: null,
    index: 0,
    loading: false,
    emptyText: '暂无公告'
  },

  onLoad: function () {
    this.loadCourts()
  },

  onShow: function () {
    if (!util.getStoredUserInfo()) {
      util.refreshUserInfo(null, false)
    }
    this.getVisited()
  },

  onPullDownRefresh: function () {
    this.getNotice(() => {
      wx.stopPullDownRefresh()
    })
  },

  loadCourts: function () {
    if (featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId) {
      this.applyCourts(featureMock.getDebugCourts())
      this.getNotice()
      return
    }
    const stored = util.getStoredCourtState()
    if (stored.groups.length) {
      this.applyCourts(stored.groups)
      this.getNotice()
      return
    }

    this.setData({
      annos: [],
      courts: [],
      loading: false,
      emptyText: '暂无可用小区'
    })
    util.noticeArea('index')
  },

  applyCourts: function (courts) {
    const list = courts || []
    const currentIndex = list[app.globalData.courtindex] ? app.globalData.courtindex : 0
    const currentCourt = list[currentIndex] || {}
    this.setData({
      courts: list,
      thisCourtName: currentCourt.GroupName || '',
      thisCourtID: currentCourt.f_id || '',
      index: currentIndex
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(currentCourt, currentIndex)
    } else {
      app.globalData.courtindex = currentIndex
      app.thisCourt = currentCourt
    }
  },

  getNotice: function (done) {
    const courtId = this.data.thisCourtID
    if (!courtId) {
      this.setData({
        annos: [],
        loading: false,
        emptyText: '暂无可用公告'
      })
      if (done) done()
      return
    }

    this.setData({
      loading: true,
      emptyText: '正在加载公告...'
    })

    if (featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId) {
      this.applyNoticeResult(appService.getCourtNotices(courtId), done)
      return
    }

    util.getJson('GetCourtNoticeByID', { CourtID: courtId }, (res) => {
      if (res.Status === 'success') {
        const list = this.normalizeNoticeList(res.Notice)
        if (list.length) {
          this.applyNoticeResult(list, done)
          return
        }
      }

      if (featureMock.DEBUG_OPEN_PERMISSION) {
        this.applyNoticeResult(appService.getCourtNotices(courtId), done)
        return
      }

      this.applyNoticeResult([], done, res.Result || '暂无公告')
      if (res.Status !== 'success') {
        util.notice('获取小区公告失败', res.Result)
      }
    })
  },

  normalizeNoticeList: function (list) {
    const source = Array.isArray(list) ? list : (list ? [list] : [])
    return source.map((item, index) => {
      return {
        f_noticeID: item.f_noticeID || ('notice_' + index),
        f_noticeName: item.f_noticeName || '公告通知',
        f_noticeMsg: item.f_noticeMsg || '',
        f_date: item.f_date || ''
      }
    }).filter(item => item.f_noticeName || item.f_noticeMsg)
  },

  applyNoticeResult: function (list, done, emptyText) {
    this.setData({
      annos: list || [],
      thisTime: new Date().getTime(),
      loading: false,
      emptyText: (list && list.length) ? '' : (emptyText || '暂无公告')
    })
    this.getVisited()
    if (done) done()
  },

  gotoDetail: function (e) {
    const item = this.data.annos[e.currentTarget.dataset.index]
    if (!item) return
    this.markVisited(item.f_noticeID)
    wx.navigateTo({
      url: '/pages/annocontent/annocontent?f_noticeID=' +
        encodeURIComponent(item.f_noticeID) +
        '&f_noticeName=' + encodeURIComponent(item.f_noticeName) +
        '&f_noticeMsg=' + encodeURIComponent(item.f_noticeMsg)
    })
  },

  setVisited: function (e) {
    const noticeId = e.currentTarget.dataset.id
    if (!noticeId) return
    this.markVisited(noticeId)
  },

  markVisited: function (noticeId) {
    const list = Object.assign({}, this.data.disablelist)
    list[noticeId] = true
    this.setData({
      disablelist: list
    })
    wx.setStorageSync('disablelist', list)
  },

  getVisited: function () {
    this.setData({
      disablelist: wx.getStorageSync('disablelist') || {}
    })
  },

  selectcourt: function (e) {
    const index = Number(e.detail.value || 0)
    const currentCourt = this.data.courts[index]
    if (!currentCourt) return
    this.setData({
      thisCourtName: currentCourt.GroupName,
      thisCourtID: currentCourt.f_id,
      index: index
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(currentCourt, index)
    } else {
      app.globalData.courtindex = index
      app.thisCourt = currentCourt
    }
    this.getNotice()
  }
})
