const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
const util = require('../../utils/util')

let loadSeq = 0

function pickDisplayText(values, fallback) {
  const list = Array.isArray(values) ? values : [values]
  for (let i = 0; i < list.length; i++) {
    const value = list[i]
    if (value === null || value === undefined) continue
    const text = String(value).trim()
    if (text) return text
  }
  return fallback || '--'
}

function formatRecordItem(item) {
  const record = item || {}
  return Object.assign({}, record, {
    displayTitle: pickDisplayText([record.f_UserName, record.f_nickname, record.f_DevName]),
    displayTime: pickDisplayText(record.f_OpenTime),
    displayType: pickDisplayText(record.f_Type, ''),
    detailList: [
      {
        key: 'court',
        label: '楼栋部门',
        value: pickDisplayText(record.f_Court)
      },
      {
        key: 'devName',
        label: '安装地址',
        value: pickDisplayText(record.f_DevName)
      },
      {
        key: 'devId',
        label: '设备SN',
        value: pickDisplayText(record.f_DevID)
      },
      {
        key: 'state',
        label: '状态',
        value: pickDisplayText(record.f_InOutState)
      }
    ]
  })
}

Page({
  data: {
    filterList: featureMock.getPassRecordFilters(),
    filterValue: '30',
    keyword: '',
    list: [],
    page: 0,
    rows: 10,
    hasMore: true,
    loading: false,
    loadingMore: false,
    emptyText: ''
  },
  onShow: function () {
    if (!appService.isApiAvailable('passRecord')) {
      this.handleUnavailable()
      return
    }
    this.loadList()
  },
  onPullDownRefresh: function () {
    if (!appService.isApiAvailable('passRecord')) {
      this.handleUnavailable()
      wx.stopPullDownRefresh()
      return
    }
    this.loadList({
      stopRefresh: true
    })
  },
  handleUnavailable: function () {
    this.setData({
      list: []
    })
    util.notice('提示', appService.getApiUnavailableMessage('passRecord'), function () {
      wx.navigateBack({
        delta: 1
      })
    })
  },
  setFilter: function (e) {
    this.setData({
      filterValue: e.currentTarget.dataset.value
    })
    this.loadList()
  },
  inputKeyword: function (e) {
    this.setData({
      keyword: e.detail.value
    })
  },
  search: function () {
    this.loadList()
  },
  loadNextPage: function () {
    if (this.data.loading || this.data.loadingMore || !this.data.hasMore) return
    this.loadList({
      append: true
    })
  },
  finishRefresh: function (opts) {
    if (opts && opts.stopRefresh) {
      wx.stopPullDownRefresh()
    }
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
  loadList: function (options) {
    if (!appService.isApiAvailable('passRecord')) {
      this.handleUnavailable()
      return
    }
    const opts = options || {}
    const append = !!opts.append
    const seq = append ? loadSeq : ++loadSeq
    const nextPage = append ? this.data.page + 1 : 1
    const rows = this.data.rows
    const that = this
    if (!append) {
      that.showListLoading()
    }

    this.setData(append ? {
      loadingMore: true
    } : {
      list: [],
      page: 0,
      hasMore: true,
      loading: true,
      emptyText: ''
    })

    util.ensureCourtState(function (stored) {
      const currentCourt = stored && stored.currentCourt ? stored.currentCourt : null
      const courtId = currentCourt && currentCourt.f_id ? currentCourt.f_id : ''
      if (!courtId) {
        if (seq === loadSeq) {
          that.setData({
            list: append ? that.data.list : [],
            loading: false,
            loadingMore: false,
            hasMore: false,
            emptyText: '暂无通行记录'
          })
        }
        if (!append) {
          that.hideListLoading()
        }
        that.finishRefresh(opts)
        return
      }

      appService.getPassRecords(that.data.filterValue, that.data.keyword, courtId, nextPage, rows).then(function (result) {
        if (seq !== loadSeq) return
        const pageList = result && Array.isArray(result.Logs) ? result.Logs.map(formatRecordItem) : []
        const totalPage = Number(result && result.Total) || 0
        const currentPage = Number(result && result.Page) || nextPage
        const nextList = append ? that.data.list.concat(pageList) : pageList
        that.setData({
          list: nextList,
          page: currentPage,
          hasMore: currentPage < totalPage,
          loading: false,
          loadingMore: false,
          emptyText: nextList.length ? '' : '暂无通行记录'
        })
        if (!append) {
          that.hideListLoading()
        }
        that.finishRefresh(opts)
      }).catch(function (res) {
        if (seq !== loadSeq) return
        that.setData({
          list: append ? that.data.list : [],
          loading: false,
          loadingMore: false,
          hasMore: append ? that.data.hasMore : false,
          emptyText: append || that.data.list.length ? that.data.emptyText : '暂无通行记录'
        })
        if (!append) {
          that.hideListLoading()
        }
        that.finishRefresh(opts)
        util.notice('获取通行记录失败', res && res.Result ? res.Result : '请稍后重试')
      })
    }, {
      goRegist: false
    })
  }
})
