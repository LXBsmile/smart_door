const app = getApp()
var util = require('../../utils/util')
const featureMock = require('../../utils/featureMock')
const appService = require('../../utils/services/appService')
var flag = false
Page({
  data: {
    hiddenmodal: true,
    password: '',
    result: '',
    isRegisted: false,
    menus: [],
    announcement: '',
    bannerImage: '/images/banner.png',
    debugOpen: featureMock.DEBUG_OPEN_PERMISSION,
    canOfflinePermission: false,
    courts: [],
    thisCourtName: '',
    thisCourtID: '',
    index: '0',
    statusBarHeight: 20,
    navBarHeight: 64,
    navContentHeight: 44,
    navRightSpace: 100
  },
  onShow: function () {
    if (this._skipNextShowRefresh) {
      this._skipNextShowRefresh = false
      return
    }
    this.refreshTabData({
      refreshCached: true
    })
  },
  onReady: function () {
    setTimeout(function () {
      flag = true
    }, 500)
    //flag=false
    //setTimeout(function(){flag = true}, 2000)
  },
  onLoad: function () {
    this._skipNextShowRefresh = true
    this.initCustomNav()
    this.refreshTabData({
      refreshCached: true
    })
  },
  onPullDownRefresh: function () {
    if (!app.globalData.isRegisted || !util.isRegisteredUser(app.globalData.userInfo)) {
      this.applyHomeView()
      this.getCourts()
      wx.stopPullDownRefresh()
      return
    }
    util.refreshUserInfo(() => {
      this.applyHomeView()
      this.getCourts({
        refreshCached: true
      })
    }, false, false, true)
  },
  refreshTabData: function (options) {
    const opts = options || {}
    this._tabUserRefreshing = true
    this.applyHomeView()
    util.refreshUserInfoOnTabShow(() => {
      this._tabUserRefreshing = false
      this.applyHomeView()
      this.getCourts({
        refreshCached: !!opts.refreshCached
      })
    })
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
  applyHomeView: function () {
    const homeView = appService.getHomeViewModel(app.globalData.isRegisted, this.data.thisCourtID || app.thisCourt?.f_id)
    this.setData({
      isRegisted: app.globalData.isRegisted,
      menus: homeView.menus || [],
      announcement: homeView.announcement,
      bannerImage: homeView.banner.image,
      canOfflinePermission: !!homeView.canOfflinePermission
    })
  },
  refreshCourtConfigurationHome: function (courtId) {
    const that = this
    const targetCourtId = String(courtId || '').trim()
    if (!targetCourtId) return
    util.requestCourtConfigurationInfo(targetCourtId, function () {
      if (String(that.data.thisCourtID || '') !== targetCourtId) return
      that.applyHomeView()
    }, {
      showError: true
    })
  },
  applyStoredCourtHome: function (options) {
    const opts = options || {}
    const stored = util.getStoredCourtState()
    if (!stored.currentCourt) {
      this.setData({
        courts: [],
        thisCourtName: '',
        thisCourtID: '',
        index: '0',
        announcement: ''
      })
      this.applyHomeView()
      return false
    }

    this.setData({
      courts: stored.groups,
      thisCourtName: stored.currentCourt.GroupName,
      thisCourtID: stored.currentCourt.f_id,
      index: stored.index
    })
    util.refreshBackEndUserInfo(() => {
      this.applyHomeView()
    }, {
      courtId: stored.currentCourt.f_id,
      force: !!opts.refreshCached,
      showError: !!opts.refreshCached
    })
    this.refreshCourtConfigurationHome(stored.currentCourt.f_id)
    this.updateAnnouncement(stored.currentCourt.f_id)
    return true
  },
  normalizeNoticeList: function (list) {
    const source = Array.isArray(list) ? list : (list ? [list] : [])
    return source.map(function (item, index) {
      return {
        f_noticeID: item.f_noticeID || ('notice_' + index),
        f_noticeName: item.f_noticeName || '公告通知',
        f_noticeMsg: item.f_noticeMsg || '',
        f_date: item.f_date || ''
      }
    }).filter(function (item) {
      return item.f_noticeName || item.f_noticeMsg
    })
  },
  updateAnnouncement: function (courtId) {
    if (!this.data.isRegisted || !courtId) {
      this.setData({
        announcement: ''
      })
      return
    }

    if (featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId) {
      const list = appService.getCourtNotices(courtId)
      this.setData({
        announcement: list.length ? list[0].f_noticeName : '暂无公告'
      })
      return
    }

    util.getJson('GetCourtNoticeByID', { CourtID: courtId }, (res) => {
      if (res.Status === 'success') {
        const list = this.normalizeNoticeList(res.Notice)
        if (list.length) {
          this.setData({
            announcement: list[0].f_noticeName
          })
          return
        }
      }

      if (featureMock.DEBUG_OPEN_PERMISSION) {
        const list = appService.getCourtNotices(courtId)
        this.setData({
          announcement: list.length ? list[0].f_noticeName : '暂无公告'
        })
        return
      }

      this.setData({
        announcement: '暂无公告'
      })
    })
  },
  onShareAppMessage: function (obj) { },
  promptLogin: function () {
    wx.showModal({
      title: '提示',
      content: '当前功能需要先登录，是否前往登录？',
      cancelText: '取消',
      confirmText: '去登录',
      success(res) {
        if (!res.confirm) return
        wx.navigateTo({
          url: '/pages/login/login',
        })
      }
    })
  },
  clickMenu: function (e) {
    if (this._tabUserRefreshing) return
    if (flag) {
      flag = false
      setTimeout(function () {
        flag = true
      }, 1000)
      var page = e.currentTarget.id
      if (app.globalData.offline && e.currentTarget.dataset.online) {
        wx.showModal({
          title: '无网络',
          content: '无网络，请连接网络后再试！',
        })
        return;
      }
      if (page == 'showQR') {
        this.getScan()
      } else {
        wx.navigateTo({
          url: '/pages/' + page + '/' + page,
        })
      }

      // if (!app.globalData.isRegisted) {
      //   wx.redirectTo({
      //     url: '/pages/toLogin/toLogin',
      //   })
      //   // wx.showModal({
      //   //   title: '提示',
      //   //   content: '需要您登录/注册授权用户信息才能正常使用，是否立即登录/注册？',
      //   //   success(res) {
      //   //     if (res.confirm) {
      //   //       wx.redirectTo({
      //   //         url: '/pages/register/register?type=0',
      //   //       })
      //   //     }
      //   //   }
      //   // })
      // } else {

      // }
    }
  },
  getScan: function () {
    var that = this
    wx.scanCode({
      onlyFromCamera: false,
      success: function (res) {
        var parameter = res.result.split("?")
        if (parameter[0] != 'http://szcjwzn.cn/open.php' || parameter.length != 2) {
          util.notice('扫码失败', '解析二维码信息失败')
          return
        }
        try {
          var params = parameter[1].split("&")
          var p = {}
          for (var i = 0; i < params.length; i++) {
            var param = params[i].split("=")
            p[param[0]] = param[1]
          }
          console.log(p.Court + p.devid + p.time + p.secret + p.door)
        } catch (err) {
          util.notice('请重新尝试', '程序错误：' + err.message)
          return
        }
        const uf = app.globalData.userInfo || {}
        if (p.type == '1') {
          util.scanopendoor(uf.f_OpenID, uf.f_UnionID, uf.f_id, p.Court, p.devid, p.time, p.secret, p.door, function (res) {
            if (res.Status == 'success') {
              if (res.Code == 'SHOWDEDUCTTIP') {
                wx.showModal({
                  title: `提示`,
                  content: `本次需要扣费${res.Deduction}元，确认是否执行?`,
                  success(res2) {
                    const uf = app.globalData.userInfo || {}
                    if (res2.confirm) {
                      util.scanopendoor(uf.f_OpenID, uf.f_UnionID, uf.f_id, p.Court, p.devid, p.time, p.secret, p.door, function (res3) {
                        if (res3.Status == 'success') {
                          util.notice('权限验证成功', '如果有疑问请联系小区管理员')
                        } else {
                          util.notice('验证失败', res3.Result)
                        }
                      }, "");
                    } else {

                    }
                  }
                })
              } else {
                util.notice('权限验证成功', '如果有疑问请联系小区管理员')
              }
            } else {
              util.notice('验证失败', res.Result)
            }
          }, "PRE-DEDUCT")
        } else if (p.type == '2') {
          const uf = app.globalData.userInfo || {}
          util.scanshowpassword(uf.f_OpenID, uf.f_UnionID, uf.f_id, p.Court, p.devid, p.time, p.secret, p.m, function (res) {
            if (res.Status == 'success') {

              that.setData({
                password: res.Result,
                hiddenmodal: false
              })
            } else {
              util.notice('获取密码失败', res.Result)
            }
          })
        } else if (p.type == '3') {
          const uf = app.globalData.userInfo || {}

          util.applypermission(uf.f_OpenID, uf.f_UnionID, p.userid, p.time, p.secret, p.data, function (res) {
            if (res.Status == 'success') {
              util.notice('扫码成功', '请等待授权！')
            } else {
              util.notice('添加权限失败', res.Result)
            }
          })
        } else if (p.type == '5') {
          util.notice('无效的类型', '请通过手机号或微信扫码添加成员')
        } else {
          util.notice('无效的类型', '二维码参数错误')
        }
      },
      complete: function () {
        //wx.hideLoading()
      }
    })
  },
  confirm: function () {
    var that = this
    that.setData({
      hiddenmodal: true,
      password: ''
    })
  },
  gotoAnno: function () {
    wx.navigateTo({
      url: '/pages/anno/anno',
    })
  },
  getCourts: function (options) {
    var that = this
    const opts = options || {}
    if (!that.data.isRegisted) {
      that.setData({
        courts: [],
        thisCourtName: '',
        thisCourtID: '',
        index: '0',
        announcement: ''
      })
      that.applyHomeView()
      return
    }
    if (featureMock.DEBUG_OPEN_PERMISSION && !app.globalData.openId) {
      const courts = featureMock.getDebugCourts()
      that.setData({
        courts: courts,
        thisCourtName: courts[0].GroupName,
        thisCourtID: courts[0].f_id,
        index: 0
      })
      if (typeof app.setCurrentCourt === 'function') {
        app.setCurrentCourt(courts[0], 0)
      } else {
        app.thisCourt = courts[0]
      }
      that.updateAnnouncement(courts[0].f_id)
      return
    }
    if (!app.globalData.openId) return
    util.ensureCourtState(function () {
      that.applyStoredCourtHome(opts)
    }, {
      courtId: that.data.thisCourtID || app.globalData.currentCourtId || app.thisCourt?.f_id || '',
      force: true,
      showError: true,
      goRegist: false
    })
  },
  selectcourt: function (e) {
    var index = e.detail.value
    const selectedCourt = this.data.courts[index]
    if (!selectedCourt) return
    const courtId = selectedCourt.f_id
    this.setData({
      thisCourtName: selectedCourt.GroupName,
      thisCourtID: courtId,
      index: index
    })
    if (typeof app.setCurrentCourt === 'function') {
      app.setCurrentCourt(selectedCourt, Number(index))
    } else {
      app.globalData.courtindex = index
      app.thisCourt = selectedCourt
    }
    util.refreshBackEndUserInfo(() => {
      this.applyHomeView()
    }, {
      courtId: courtId,
      force: true,
      showError: true
    })
    this.refreshCourtConfigurationHome(courtId)
    this.updateAnnouncement(courtId)
    util.refreshCourtList(() => {
      this.applyStoredCourtHome({
        refreshCached: true
      })
    }, {
      courtId: courtId,
      showError: true
    })
  },
  switchtab2: function () {
    if (!this.data.canOfflinePermission) return
    if (flag) {
      flag = false
      setTimeout(function () {
        flag = true
      }, 1000)
      wx.redirectTo({
        url: '/pages/showqr/showqr',
      })
    }
  },
  switchtab3: function () {
    if (flag) {
      flag = false
      setTimeout(function () {
        flag = true
      }, 1000)
      wx.redirectTo({
        url: '/pages/my/my',
      })
    }
  }
})
