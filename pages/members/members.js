const app = getApp()
const util = require('../../utils/util')
const QR = require("../../utils/qrcode.js");

Page({
  data: {
    allcourts: [],
    thiscourt: {},
    members: [],
    hiddenmodal: true,
    hiddenmodal2: true,
    inputedID: '',
    isMain: false,
    index: '0'
  },
  onShow: function () {
    this.loadPageData()
  },
  onPullDownRefresh: function () {
    this.loadPageData()
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
  loadPageData: function () {
    var that = this
    if (app.globalData.userInfo && app.globalData.isRegisted) {
      that.loadCourtsAndMembers()
      return
    }
    util.refreshUserInfo(function () {
      that.loadCourtsAndMembers()
    }, false)
  },
  loadCourtsAndMembers: function () {
    var that = this
    util.ensureCourtState(function (stored) {
      if (!stored.currentCourt) {
        that.setData({
          allcourts: [],
          thiscourt: {
            GroupName: ''
          },
          members: [],
          isMain: false
        })
        util.noticeArea()
        that.hideListLoading()
        wx.stopPullDownRefresh()
        return
      }
      that.setData({
        index: stored.index,
        allcourts: stored.groups,
        thiscourt: stored.currentCourt
      })
      that.loadMembers(stored.currentCourt.f_id)
    })
  },
  loadMembers: function (courtId) {
    var that = this
    that.showListLoading()
    util.getJson('GetFamilyMembers', {
      CourtID: courtId
    }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          members: res.Family,
          isMain: res.IsMainFamilyMember
        })
      } else {
        util.notice("加载家庭成员信息失败", res.Result)
      }
      that.hideListLoading()
      wx.stopPullDownRefresh()
    })
  },
  morecourts: function (e) {
    var index = e.detail.value
    this.setData({
      thiscourt: this.data.allcourts[index],
      index: index
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(this.data.allcourts[index], Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = this.data.allcourts[index]
    }
    this.loadMembers(this.data.thiscourt.f_id)
  },
  addmem: function () {
    this.setData({
      hiddenmodal: false
    })
  },
  confirm: function () {
    var that = this
    util.getJson('UpdateFamilyRelations', {
      CourtID: that.data.thiscourt.f_id,
      f_Tel: that.data.inputedID
    }, function (res) {
      if (res.Status == 'success') {
        that.setData({
          hiddenmodal: true,
          inputedID: ''
        })
        that.loadMembers(that.data.thiscourt.f_id)
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
    this.setData({
      hiddenmodal2: true
    })
    this.loadMembers(this.data.thiscourt.f_id)
  },
  setMemberID: function (e) {
    this.setData({
      inputedID: e.detail.value
    })
  },
  deleteit: function (e) {
    var that = this
    wx.showModal({
      title: '确定删除该成员？',
      content: e.currentTarget.dataset.it,
      success: function (res) {
        if (res.confirm) {
          util.getJson('DeleteMemberFromFamily', {
            DeleteUnionID: e.currentTarget.dataset.id,
            CourtID: that.data.thiscourt.f_id
          }, function (res2) {
            if (res2.Status == 'success') {
              that.loadMembers(that.data.thiscourt.f_id)
            } else {
              util.notice('删除失败', res2.Result)
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
    var url = 'http://szcjwzn.cn/open.php?type=5&content=' + util.encode(content)
    QR.api.draw(url, 'mycanvas', 200, 200)
    if (!that.data.hiddenmodal2) {
      setTimeout(function () {
        if (!that.data.hiddenmodal2) {
          that.drawQR(groupID, userID)
        }
      }, 180000)
    }
  }
})
