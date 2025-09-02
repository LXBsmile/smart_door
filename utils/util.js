const config = require('../config')
const CryptoJS = require('CryptoJS/aes')
let showing = false;
//----------通用请求---------------
//发送请求
function wxrequest(json, func) {
  wx.showLoading({
    title: '加载中',
    mask: true
  })
  const app = getApp();
  var requestTime = new Date().getTime();
  if (app.globalData.offline) {
    var info = wx.getStorageSync(json.TransactionCode);
    if (info != "") {
      func(info);
      wx.hideLoading()
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
      var a = JSON.parse(res.data)
      var b = JSON.parse(a)
      if (b.Status == 'executing') {
        setTimeout(function () {
          wxrequest(json, func)
        }, 1000)
      }
      wx.hideLoading()
      wx.setStorageSync(json.TransactionCode, b);
      func(b)
    },
    fail: function (err) {
      if (err.errMsg.indexOf('timeout') > 0) {
        wxrequest(json, func)
      } else {
        wx.hideLoading()
        wx.getNetworkType({
          success: function (res3) {
            if (res3.networkType == 'none') {
              wx.showModal({
                title: '无网络',
                content: '该页面信息未缓存',
                showCancel: false
              })
            } else {
              wx.showModal({
                title: '网络不给力',
                content: '请重试',
                showCancel: false
              })
            }
          },
          fail: function (res3) {
            wx.showModal({
              title: '无法获取当前网络状态',
              content: '请稍后重试',
              showCancel: false
            })
          }
        })
      }
    },
    complete: function (allres) {
      // console.log('本次请求('+json.TransactionCode+')耗时：'+(new Date().getTime()-requestTime)/1000+'秒，状态为：'+allres.statusCode)
    }
  })
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
            url: '/pages/register/register?type=0',
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
function getJson(action, obj, func) {
  var app = getApp()
  var json = {}
  for (var key in config.appJson) {
    json[key] = config.appJson[key]
  }


  if (action != "GetOpenID" && action != "GetUserInfo" && action != "GetMobileMessageValidateSwitch" && action != "RegisterUser") {
    if (!app.globalData.openId) {
      return showLogin();
    }

    //若用户信息为空，则可能之前获取用户信息异常，重新获取用户信息
    // if (app.globalData.userInfo == null) {
    //   // return showLogin()
    //   return getOpenId(func);
    // }
    json['f_OpenID'] = obj.f_OpenID || app.globalData.userInfo.f_OpenID
    json['f_UnionID'] = obj.f_UnionID || app.globalData.userInfo.f_UnionID
  }
  json['TransactionCode'] = action
  json['TransactionID'] = guid()
  for (var key in obj) {
    json[key] = obj[key]
  }
  wxrequest(json, func)
}
function getOpenIdPromise() {
  const app = getApp();
  const openId = app.globalData.openId;

  return new Promise((resolve, reject) => {
    if (openId) resolve(openId);
    wx.login({
      success: function (res) {
        console.log('login', res);
        getJson('GetOpenID', {
          'WeChatCode': res.code
        }, r => {
          console.log('openId', r)
          resolve(r.Result)
        })
      },
      fail: function (err) {
        console.error('err', err)
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
function getOpenId(func, goRegist = true, refresh = true) {
  const app = getApp();
  var requestTime = new Date().getTime();
  if (app.globalData.offline) {
    var info = wx.getStorageSync("GetOpenID");
    if (info != "") {
      app.globalData.openId = info.Result
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
          wx.setStorage({
            key: 'store',
            data: {
              courtindex: 0,
              openId: res1.Result
            }
          })
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
function refreshUserInfo(func, goRegist = true) {
  var app = getApp()
  if (!app.globalData.openId) {
    // getOpenId(func, goRegist)
    return

  }
  getJson('GetUserInfo', {
    'f_OpenID': app.globalData.openId
  }, function (res2) {
    wx.stopPullDownRefresh();

    if (res2.Status == 'success') {
      if (res2.User.f_OpenID == null || res2.User.f_OpenID == '') {
        app.globalData.isRegisted = false;
        if (goRegist) {
          showLogin()

          // wx.navigateTo({
          //   url: '/pages/toLogin/toLogin',
          // })
        }
      }
      else if (res2.User.f_UnionID == null || res2.User.f_UnionID == '') {
        app.globalData.isRegisted = false;
        if (goRegist) {
          wx.navigateTo({
            url: '/pages/reg2/reg2?id=' + res2.User.f_id,
          })
        }
      }
      else {
        app.globalData.isRegisted = true;
        app.globalData.userInfo = res2.User
        console.log(app.globalData)
        if (func) func(res2.User)
      }
    } else {
      wx.showModal({
        title: '获取用户信息失败',
        content: res2.Result,
        confirmText: '重试',
        success: function () {
          refreshUserInfo()
        }
      })
    }
  })
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
//钥匙加密
function encode(content) {
  return ("" + CryptoJS.AES.encrypt(content, config.mykey)).replace(/\n/g, "")
}

function decode(content) {
  return (CryptoJS.AES.decrypt(content, config.mykey).toString(CryptoJS.enc.Utf8))
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

  formatTime: formatTime,
  formatNumber: formatNumber,
  encode: encode,
  decode: decode,
  base64_encode: base64_encode,
  base64_decode: base64_decode,

  //wxrequest:wxrequest
  showErr: showErr,
  notice: notice, //通用提示
  noticeArea,

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
  refreshUserInfo: refreshUserInfo
}