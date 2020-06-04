/**
 * 小程序配置文件
 */

//var host = "http://ftp9876543.w165.mc-test.com"
var host ="https://www.szcjwzn.cn"
var config = {
    host,
    myUrl: `${host}/AjaxWCF.svc/DoWork`,
    mykey:'IdjwwzmFJntiKs_8',
    appJson: { "Format": "WeChat_SmallApp", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323"},
    tokenJson:{ "Format": "WeChat_SmallApp", "f_OpenID": "", "TransactionCode": "GetOpenID","TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "WeChatCode": "" },
    userInfoJson: { "Format": "WeChat_SmallApp", "f_id": "", "f_Tel": "", "f_OpenID": "", "TransactionCode": "GetUserInfo", "f_gender": "", "f_password": "", "f_nickname": "", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323" },
    telJson: { "Format": "WeChat_SmallApp", "f_id": "faf9528c-d926-4872-8ea1-29fe855497d7", "f_Tel": "", "Code": "", "f_OpenID": "TestData", "TransactionCode": "SendMessage", "f_gender": "", "f_password": "", "f_nickname": "", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323" },
    registerJson: { "Format": "WeChat_SmallApp", "f_Tel": "", "f_OpenID": "", "TransactionCode": "RegisterUser", "f_gender": "", "f_password": "", "f_nickname": "", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "f_headpic": "", "f_country": "", "f_province": "", "f_city": "", "f_language": "", "EncryptData": "","IV":""},
    getCourtsJson: { "Format":"WeChat_SmallApp", "f_OpenID": "", "TransactionCode": "GetCourts", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323" },
    getFamilyJson: { "Format": "WeChat_SmallApp", "f_OpenID": "", "TransactionCode": "GetFamilyMembers", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "CourtID": "", "DataBaseURL": "" },
    //shareKeyJson: { "Format": "WeChat_SmallApp", "f_OpenID": "", "TransactionCode": "ShareKeyToOthers", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "DataBaseURL": "", "ShareKey": [{ "f_fkName": "", "f_tel": "", "f_validity": "", "f_useNum": "", "f_userid": "" }]},//用不到
    keylistJson: { "Format": "WeChat_SmallApp", "f_OpenID": "", "TransactionCode": "KeyList", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "CourtID": "1", "DataBaseURL": "" },
  scanJson1: { "Format": "WeChat_SmallApp", "f_OpenID": "", "f_unionID": "", "TransactionCode": "OpenDoorByScanQR", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "f_userid": "", "CourtID": "", "DataBaseURL": "", "Devid": "", "Time": "", "Type": "1", "Secret": "","OperationCode":""},
    scanJson2: { "Format": "WeChat_SmallApp", "f_OpenID": "", "f_unionID": "","TransactionCode": "DisplayPassword", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "f_userid": "", "CourtID": "", "DataBaseURL": "", "Devid": "", "Time": "", "Type": "2", "Secret": "", "DynamicPassword": "" },
    scanJson3: { "Format": "WeChat_SmallApp", "f_OpenID": "","f_UnionID ": "", "TransactionCode": "ApplyPermission", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "UserID": "", "Time": "","Type":"3", "Secret": "", "CourtID":"" },
    addFamilyJson:{"Format": "WeChat_SmallApp", "f_OpenID": "", "TransactionCode": "UpdateFamilyRelations", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "FamilyMemberID":"" },
    openDoorJson: { "Format": "WeChat_SmallApp", "f_OpenID":"", "f_UnionID": "", "TransactionCode": "OpenDoorWithSharedKey", "TransactionID": "31b05701-60ef-405c-87ba-af47049e3f48-20180123142323", "Devid": "", "CourtID":""},
  APP_CONFIG: {   
    QR_WIDTH: 150,//二维码宽
    QR_HEIGHT: 150//二维码高
  },
}

module.exports = config
//引用这个文件，这个引用即是config对象
