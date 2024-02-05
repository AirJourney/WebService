// 公共参数
export type TRequestHead = {
    locale: string | null; // 语言
    currency: string | null; // 货币
    clientTime: string | null; // 客户端时间
  };
  
  // 航班详情数据 (getFlightBookingInfo)
  export interface IFlightGetBookingInfoRequestType {
    head: TRequestHead;
    shoppingId: string | null;
  }
  
  // 航班详情数据返回参数(getFlightBookingInfo)
  export interface IFlightGetBookingInfoResponseType {
    flightGroupInfoList?: IFlightGroupInfo[] | null;
    policyDetailInfo?: IPolicyDetailInfoType | null;
    defaultCardList?: IDefaultCardType[] | null;
    exchangeRateList?: IExchangeRateType[] | null;
    currencyCarryRule?: ICurrencyCarryRule | null;
    passengerRestrictionRule?: IPassengerRestrictionRule | null;
    shoppingIdChanged?: boolean | null;
  }
  
  // 下单 (createOrder)
  export interface ICreateOrderRequestType {
    head: TRequestHead;
    /**
     * 联系人信息
     */
    contactInfo: {
      /**
       * 全名
       */
      contactName: string | null;
      /**
       * 邮箱
       */
      email: string | null;
      /**
       * 电话地区编号
       */
      phoneArea: string | null;
      /**
       * 联系电话
       */
      contactTel: string | null;
      /**
       * 手机号码
       */
      mobilePhone: string | null;
    };
    /**
     * 乘机人信息
     */
    flightPassengerList: {
      /**
       * 乘机人ID
       */
      passengerId?: string | null;
      /**
       * 乘机人名
       */
      givenName: string | null;
      /**
       * 乘机人姓
       */
      surName: string | null;
      /**
       * 生日
       */
      birthDay: string | null;
      /**
       * 证件号
       */
      cardNo?: string | null;
      /**
       * 乘客类型 ADT/CHD/INF
       */
      travelerType: string | null;
      /**
       * 证件类型ID
       */
      cardType?: number | null;
      /**
       * 性别
       */
      gender: string | null;
      /**
       * 国家编号
       */
      nationality: string | null;
      /**
       * 证件有效期
       */
      passportLimit?: string | null;
    };
    shoppingId: string | null;
  }
  // 下单后返回参数(createOrder)
  export interface ICreateOrderResponseType {
    /**
     * 订单基本信息
     */
    orderInfo: {
      /**
       * 真实订单号列表
       */
      flightOrderIdList?: number[] | null;
    };
    /**
     * 新支付流程下发支付信息节点
     */
    payInfo: {
      payToken?: string | null;
      /**
       * 支付时限 单位秒
       */
      payExpiryTime?: number | null;
    };
  }
  
  export interface IPassengerRestrictionRule {
    adultNameRestriction?: INameRestrictionType | null;
    childNameRestriction?: INameRestrictionType | null;
    infantNameRestriction?: INameRestrictionType | null;
  }
  export interface INameRestrictionType {
    fullNameMinLength?: number | null;
    fullNameMaxLength?: number | null;
    familyNameMinLength?: number | null;
    familyNameMaxLength?: number | null;
    givenNameMinLength?: number | null;
    givenNameMaxLength?: number | null;
  }
  export interface ICurrencyCarryRule {
    retainCount?: number | null;
    minRetainCount?: number | null;
    carryRule?: string | null;
  }
  export interface IExchangeRateType {
    currency?: string | null;
    rate?: number | null;
    retainCount?: number | null;
    minRetainCount?: number | null;
    carryRule?: string | null;
    canPayIconTypeList?: number[] | null;
  }
  export interface IDefaultCardType {
    cardID?: number | null;
    cardName?: string | null;
    cardMessage?: string | null;
    isDefault?: boolean | null;
  }
  export interface IPolicyDetailInfoType {
    channelInfoList?: IChannelInfoType[] | null;
    adultPrice?: IPriceInfoType | null;
    childPrice?: IPriceInfoType | null;
    infantPrice?: IPriceInfoType | null;
    avgPrice?: number | null;
    ticketDeadlineInfo?: ITicketDeadlineInfoType | null;
    limitInfo?: IBookingLimitInfoType | null;
    productNoticeInfo?: IProductNotice | null;
    ifMultPu?: boolean | null;
    ifMultTicket?: boolean | null;
    ticketDeadlineType?: number | null;
    hasMemberPrice?: boolean | null;
    noticeInfoList?: INoticeInfoType[] | null;
    hasAgencyModel?: boolean | null;
    createOrderSendCoins?: boolean | null;
    flightPolicyInfoList?: IFlightPolicyInfo[] | null;
  }
  export interface IFlightPolicyInfo {
    airlineCode?: string | null;
    productSourceNum?: number | null;
    productTypes?: string[] | null;
    bookingChannel?: string | null;
  }
  export interface INoticeInfoType {
    showType?: number | null;
    type?: string | null;
    title?: string | null;
    content?: string | null;
  }
  export interface IProductNotice {
    discountPrice?: string | null;
    onlyAdult?: string | null;
    multiPu?: string | null;
    multiTicketNoticeList?: string[] | null;
    transit?: string | null;
    huhehot?: string | null;
    lcc?: string | null;
    nationalityLimit?: string | null;
    passengerLimit?: string | null;
    ageLimit?: string | null;
    diffAirport?: string | null;
    minPassengerGreaterThanTwo?: string | null;
    note?: string | null;
    free24HourRefund?: string | null;
    ticketDeadline?: string | null;
    limitTimeFreeRefund?: string | null;
    noteList?: string[] | null;
    nearbyCityDistanceList?: string[] | null;
  }
  export interface IBookingLimitInfoType {
    nationalityLimitType?: number | null;
    nationalityLimit?: string[] | null;
    minPassengerCount?: number | null;
    maxPassengerCount?: number | null;
    minAge?: number | null;
    maxAge?: number | null;
    isAddPassengerRequery?: boolean | null;
    availableSeatCount?: number | null;
    adultLimitInfo?: IPassengerLimitInfo | null;
    childLimitInfo?: IPassengerLimitInfo | null;
  }
  export interface IPassengerLimitInfo {
    minPassengerCount?: number | null;
    maxPassengerCount?: number | null;
    minAge?: number | null;
    maxAge?: number | null;
  }
  export interface ITicketDeadlineInfoType {
    deadlineType?: number | null;
    promiseMinutes?: number | null;
  }
  export interface IPriceInfoType {
    salePrice?: number | null;
    tax?: number | null;
    salePriceCNY?: number | null;
    taxCNY?: number | null;
    discount?: number | null;
    extraFee?: number | null;
  }
  export interface IChannelInfoType {
    channelType?: string | null;
    engineType?: string | null;
  }
  export interface IFlightGroupInfo {
    flightTripTitle?: string | null;
    departMultCityName?: string | null;
    arriveMultCityName?: string | null;
    departDateTimeFormat?: string | null;
    flightSegments?: IIntlFlightInfoType[] | null;
  }
  export interface IIntlFlightInfoType {
    segmentNo?: number | null;
    sequenceNo?: number | null;
    flightNo?: string | null;
    cabinClass?: string | null;
    arrivalDays?: number | null;
    durationInfo?: IDurationInfoType | null;
    shareAirline?: IAirlineInfoType | null;
    shareFlightNo?: string | null;
    airlineInfo?: IAirlineInfoType | null;
    craftInfo?: ICraftInfoType | null;
    dDateTime?: IOnlineDateTime | null;
    aDateTime?: IOnlineDateTime | null;
    dCityInfo?: ICityInfoType | null;
    aCityInfo?: ICityInfoType | null;
    dPortInfo?: IAirportInfoType | null;
    aPortInfo?: IAirportInfoType | null;
    dMainCityInfo?: ICityInfoType | null;
    aMainCityInfo?: ICityInfoType | null;
    dMainCityDistance?: number | null;
    aMainCityDistance?: number | null;
    transferDurationInfo?: IDurationInfoType | null;
    stopInfoList?: IStopInfoType[] | null;
    luggageDirectInfo?: ILuggageDirectInfoType | null;
    flightFlag?: number | null;
    extraInfoKey?: string | null;
    isAcrossDay?: boolean | null;
    diffAirport?: boolean | null;
    diffTerminal?: boolean | null;
    subClass?: string | null;
    beMainSegment?: boolean | null;
    atbFlight?: boolean | null;
  }
  export interface ILuggageDirectInfoType {
    directStatus?: number | null;
    directDesc?: string | null;
    directTitle?: string | null;
  }
  export interface IStopInfoType {
    stopCity?: ICityInfoType | null;
    stopAirport?: IAirportInfoType | null;
    stopDurationInfo?: IDurationInfoType | null;
  }
  export interface IAirportInfoType {
    id?: number | null;
    code?: string | null;
    name?: string | null;
    terminal?: string | null;
  }
  export interface ICityInfoType {
    id?: number | null;
    code?: string | null;
    name?: string | null;
  }
  export interface IOnlineDateTime {
    date?: string | null;
    time?: string | null;
    dateTimeFormat?: string | null;
  }
  export interface ICraftInfoType {
    craftType?: string | null;
    name?: string | null;
    widthLevel?: string | null;
    minSeats?: number | null;
    maxSeats?: number | null;
    hasFlightPicture?: boolean | null;
  }
  export interface IAirlineInfoType {
    code?: string | null;
    name?: string | null;
    lowPrice?: number | null;
    isLCC?: boolean | null;
    alliance?: string | null;
  }
  export interface IDurationInfoType {
    hour?: number | null;
    min?: number | null;
  }