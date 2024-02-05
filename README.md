# LLTrip-WebService

## 接口文档

### 注册/登录浮层
- [POST]/website/register
   - Request
      - header：null
      - body：model/user.js
   - Response
      - Success：
         - "Registered successfully"
         - request.body
      - Exception：
         - "The user name already exists"
         - model/user.js
- [POST]/website/login
   - Request
      - header：null
      - body：email, password
   - Response
      - Success：
         - "Land successfully"
         - model/user.js
         - token（暂无用）
      - Exception：
         - 401
         - "The user name or password is incorrect"
         - model/user.js
- [POST]/website/forgot
   - Request
      - header：null
      - body：email, password
   - Response
      - Success：
         - "Email has been sent to ${email}"
         - model/user.js
      - Exception：
         - "User name error"
         - ctx.request.body
- [POST]/website/update
   - Request
      - header：null
      - body：model/user.js
   - Response
      - Success：
         - "User Info has Updated"
         - model/user.js



### 列表
- [POST]/website/recommend
   - Request
      - header：
      - body：{"currency":"HKD"}
   - Response
      - Success：
         - ""
         - flightDetailList
      - Exception：
         - ""
         - []
- [POST]/website/shopping
   - Request
      - header：sessionid,userid
      - body：{"flightType":"OW/RT","currency":"HKD/EUR/USD/...","passenger":[{"name":"Adult","count":1,"flag":"ADT"},{"name":"Children","count":1,"flag":"CHD"},{"name":"Infants","count":1,"flag":"INF"}],"tripSearch":[{"depart":"BFS","arrive":"LON","departTime":"2022-03-07"},{"depart":"LON","arrive":"BFS","departTime":"2022-04-07"}]}
   - Response
      - Success：
         - sessionid
         - ""
         - flightDetailList
      - Exception：
         - sessionid
         - ""
         - []
- [POST]/website/shoppingdetail
   - Request
      - header：sessionid,userid
      - body：{"shoppingId":""}
   - Response
      - Success：
         - sessionid
         - ""
         - TFlightDetailType
      - Exception：
         - sessionid
         - "shoppingInfo is null"
         - {}
### 填写页

- [POST]/website/check
   - Request
      - header：sessionid
      - body：{"redisCode":"0315BFSLON0319","redisSchema":"1855-0130-BA-8753-E&O-BHD-T0-LCY-T0-0-E90|88.00-79.08-89.00-47.58-89.00-47.58|1/1/50-GBP$1/1/60-GBP$1/1/60-GBP@1440-0125-BA-1414-E&O-LHR-T5-BHD-T0-0-319|89.00-79.08-89.00-47.58-89.00-47.58|1/1/50-GBP$1/1/60-GBP$1/1/60-GBP","currency":"HKD"}
   - Response
      - Success：
         - sessionid
         - ""
         - {redisSchema:'',price:{
            "adtBase": "756",
            "adtTaxes": "672",
            "chdBase": "756",
            "chdTaxes": "404",
            "infBase": "756",
            "infTaxes": "404"
        },penalty:[
            {
                "adtBCXL": "-1",
                "adtACXL": "-1",
                "adtCHG": "620",
                "chdBCXL": "-1",
                "chdACXL": "-1",
                "chdCHG": "620",
                "infBCXL": "-1",
                "infACXL": "-1",
                "infCHG": "620"
            },
            {
                "adtBCXL": "-1",
                "adtACXL": "-1",
                "adtCHG": "620",
                "chdBCXL": "-1",
                "chdACXL": "-1",
                "chdCHG": "620",
                "infBCXL": "-1",
                "infACXL": "-1",
                "infCHG": "620"
            }
        ]}
      - Exception：
         - sessionid
         - "shoppingInfo is null"
         - {}
- [POST]/website/changeprice
   - Request
      - header： sessionid
      - body：{"changePassenger":[{"name":"Adult","count":2,"flag":"ADT"},{"name":"Children","count":2,"flag":"CHD"},{"name":"Infants","count":2,"flag":"INF"}],"priceId":"9831f389183c4739b2ecd0051a45e53c"}
   - Response
      - Success：
         - sessionid
         - "Price Changed"
         - model/price.js
- [POST]/website/booking
   - Request
      - header： locale, currency, clienttime, userid，sessionid 
      - body：contactInfo, flightPassengerList, shoppingId
   - Response
      - Success：
         - sessionid
         - "booking success"
         - model/booking.js
### 订单后处理

- [POST]/website/orderlist
   - Request
      - header：userid
      - body：{}
   - Response
      - Success：
         - sessionid
         - ""
         - model/booking.js[]
- [POST]/website/orderdetail
   - Request
      - header：userid
      - body：orderId
   - Response
      - Success：
         - sessionid
         - ""
         - model/booking.js
      - Exception：
         - sessionid
         - "orderInfo is null"
         - {}



## Backlist

### 网站服务支持        `/website`
- 用户注册服务       :  `/register`  `[post]`
- 用户登录服务       :  `/login`     `[post]`
- 用户重置密码服务   :  `/resetpwd`   `[post]`
- 用户邮箱验证服务   :  `/verify`     `[post]`
- 出发/目的地服务    :  `/region`     `[get]`
- 航司信息服务       :  `/airline`    `[get]`
- 航班请求服务       :  `/shopping` `[post]`
- 乘机人服务         :  `/traveller`   `[post]`
- 税率服务           :  `/taxrate`     `[get]`
- 支付服务           :  `/payment`      `[post]`
- 订单生成服务       :  `/booking`      `[post]`
- 用户订单列表查询服务 :  `/orderlist`   `[post]`
- 用户订单查询服务   :  `/order`   `[post]`

### 后台系统支持	 ：  `/support`
- 后台登录服务       ：  `/login`   `[post]`
- 后台账号生成服务   ：  `/createaccount`   `[post]`
- 后台订单查询服务   ：  `/order`     `[post]`
- 后台出票回填服务   ：  `/ticketidinput`   `[post]`
- 后台退改签回填服务 ：  `/orderedit`       `[post]`
- 后台运营策略查询服务   ：  `/policysearch`        `[get]`
- 后台运营策略新增服务   ：  `/policysearch`        `[get]`
- 后台运营策略修改服务   ：  `/policyedit`          `[post]`
- 出发/目的地创建服务    :  `/createregion`     `[post]`

### OTA查询支持	    :  `/ota`
- OTA查询返回服务   :  `/flightsearch`      `[post]`
- 生单后回调OTA服务 :  `/bookingcallback`   `[post]`

### mock查询

- /website/shopping
  
  `{"flightType":"OW","passenger":[{"name":"adt","count":2,"flag":"ADT"}],"tripSearch":[{"depart": "ALC",
"arrive": "BCN","departTime":"2022-02-20"}]}`

## 数据库结构

### 查询

> https://blog.csdn.net/weixin_33953249/article/details/88700924

- shoppingId
  - priceId[]
  - flightId[]
    - segmentId[] : cabinId[]
    - policyId[]

- flightSegment :flightId,segmentId
- flightPolicy:flightId,policyId
- shoppingFlight: shoppingId,flightId
- shoppingPirce: shoppingId,priceId

### 填写

- orderId : shoppingId : contactId
  - psgId[]

