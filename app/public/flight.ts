export interface AdultPrice {
    salePrice: number;
    tax: number;
    discount?: any;
    extraFee?: any;
    bookingFee: number;
    atolFee: number;
}

export interface ChildPrice {
    salePrice: number;
    tax: number;
    discount?: any;
    extraFee?: any;
    bookingFee: number;
    atolFee: number;
}

export interface AdultLimitInfo {
    minAge: number;
    maxAge: number;
    minPassengerCount: number;
    maxPassengerCount: number;
}

export interface PassengerLimitInfoPayload {
    /** 最小年龄 */
    minAge: number;
    maxAge: number;
    /** 最小预订人数 */
    minPassengerCount: number;
    maxPassengerCount: number;
}

export interface LimitInfo {
    adultLimitInfo: PassengerLimitInfoPayload;
    childLimitInfo: PassengerLimitInfoPayload;
    /** 剩余票量 */
    availableSeatCount: number;
    /** 限制的国籍 */
    nationalityLimit: string[];
    /** 国籍限制类型，0-不限，1-允许，2-不允许 */
    nationalityLimitType: number;
}

export interface ProductNoticeInfo {
    /** 折扣价描述 */
    discountPrice?: string;
    /** 仅成人 */
    onlyAdult?: string;
    /** 多票 */
    multiTicketNoticeList: string[];
    /** 过境 */
    transit?: string;
    /** 值机 */
    lcc?: string;
    /** 国际限制 */
    mationalityLimit?: string;
    /** 旅客限制 */
    passengerLimit?: string;
    /** 年龄限制 */
    ageLimit?: string;
    /** 24小时免费退 */
    free24HourRefund?: string;
    /** 出票时长 */
    ticketDeadline: string;
    /** 限时免费退票 */
    limitTimeFreeRefund?: string;
    /** 特殊表述集合 */
    noteList?: string[];
}

export interface NoticeInfoList {
    type: string;
    title: string;
    content: string;
    contentList?: string[];
    /** 0.default 1.Popup window */
    showType: number;
}

export interface TicketDeadlineInfo {
    deadlineType: number;
    promiseMinutes: number;
}

export type PriceInfoPayload = {
    /** 当前币种售价 （售卖价 或 公布运价） */
    salePrice: number;
    /** 当前币种税费 */
    tax: number;
    /** 当前币种折扣 （售卖价 - 公布运价） */
    discount?: number;
    /** 加价 （售卖价 - 公布运价） */
    extraFee?: number;
    /** Booking Fee */
    bookingFee?: number;
    /** Atol */
    atolFee?: number;
};

export interface PolicyDetailInfo {
    avgPrice: number;
    /** 1:快速出票,2:出票慢, */
    ticketDeadlineType: number;
    hasAgencyModel: boolean;
    /** 成人运价 */
    adultPrice?: PriceInfoPayload;
    childPrice?: PriceInfoPayload;
    infantPrice?: PriceInfoPayload;
    ifMultTicket: boolean;
    /** 限制信息 */
    limitInfo: LimitInfo;
    /** 产品提示信息 */
    productNoticeInfo: ProductNoticeInfo;
    /** 公共提示信息 */
    noticeInfoList: NoticeInfoList[];
    /** 最晚出票时间 */
    ticketDeadlineInfo: TicketDeadlineInfo;
}

export interface CardTypeInfo {
    /** 可用证件列表 */
    cardInfoList?: any;
    /** 是否支持无证件预定 */
    whetherNonCard: boolean;
}

export interface CityInfo {
    code: string;
    name: string;
}

export interface AirlineInfo {
    code: string;
    name: string;
    isLCC: boolean;
    alliance: string;
    lowPrice?: any;
}

export interface CraftInfo {
    name: string;
    minSeats?: any;
    maxSeats: number;
    widthLevel: string;
    craftType: string;
}

export interface DurationInfo {
    hour: number;
    min: number;
}

export interface FlightSegment {
    /** 航线 */
    segmentNo: number;
    aDateTime: string;// moment YYYY-MM-DD HH:MM:SS
    dDateTime: string;// moment YYYY-MM-DD HH:MM:SS
    dCityInfo: CityInfo;
    aCityInfo: CityInfo;
    dMainCityInfo?: any;
    aMainCityInfo?: any;
    /** 出发离主城距离 */
    dMainCityDistance?: any;
    /** 到达离主城距离 */
    aMainCityDistance?: any;
    dPortInfo: PortInfo;
    aPortInfo: PortInfo;
    // 相隔天数,跨天则+1
    arrivalDays: number;  
    /** 航司信息 */
    airlineInfo: AirlineInfo;
    /** 机型信息 */
    craftInfo: CraftInfo;
    /** 主仓 */
    cabinClass: string;
    /** 子舱位 */
    subClass: string;
    /** 过境提示 */
    crossingSignInfo?: string;
    /** 共享航司信息 */
    shareAirline?: string;
    /** 共享航班号 */
    shareFlightNo: string;
    durationInfo: DurationInfo;
    /** 中转时长 */
    transferDurationInfo?: DurationInfo;
    /** 中转提示 */
    flagInfoList?: string;
    /** 经停信息 */
    stopInfoList: StopInfoPayload[];
    /** 行李直挂信息 */
    luggageDirectInfo?: any;
  /** 航班号 */
    flightNo: string;
  /** 航班标签 */
    flightFlag: number;
  /** 航段号 */
    sequenceNo: number;
    /** 是否为国际航段，false：中国大陆境内，true：中国大陆境外 */
    beInternationalSegment: boolean;
}

/** 经停信息 */
export type StopInfoPayload = {
    /** 经停城市 */
    stopCity?: CityInfo;
    /** 经停机场 */
    stopAirport?: PortInfo;
    /** 中转时长分钟数 */
    stopDurationInfo?: DurationInfo;
};


export interface PortInfo {
    code: string;
    name: string;
    terminal: string;
}

export interface FlightGroupInfoList {
    /** 到达城市 */
    arriveMultCityName: string;
    /** 出发Date */
    departDateTimeFormat: string;
    /** 出发城市 */
    departMultCityName: string;
    /** 航程标题 */
    flightTripTitle: string;
    /** 航程飞行时长 */
    duration: string;
    /** 航程飞行日期-格式化 */
    dDateFormat: string;
    /** 航段 */
    flightSegments: FlightSegment[];
}

export interface SegmentList {
    dCityCode: string;
    dCityName: string;
    aCityCode: string;
    aCityName: string;
    puIndex: number;
    segmentNo: number;
    sequenceNo: number;
}

export interface BaggageDetail {
    description: string;
    weightAndPieceDesc: string;
    weight: number;
    piece: number;
}

export interface BaggageFormatted {
    sequenceNote?: string;
    adultDetail: BaggageDetail;
    childDetail?: BaggageDetail;
    infantDetail?: BaggageDetail;
}


export interface BaggageInfoList {
    /** 航段信息 */
    segmentList: SegmentList[];
    checkedNote: string;
/** 行李额格式化信息 */
    checkedFormatted: BaggageFormatted;
    handNote: string;
    handFormatted: BaggageFormatted;
}

export interface FlagInfoList {
    flag: string;
    note?: any;
    description: string;
    preferential?: any;
}

export interface FlagInfoIndexList {
    flag: string;
    note: string;
    description: string;
    preferential: boolean;
}

export interface SegmentList {
    dCityCode: string;
    dCityName: string;
    aCityCode: string;
    aCityName: string;
    puIndex: number;
    segmentNo: number;
    sequenceNo: number;
}

export interface AdultList {
    specialText: string;
    timeText: string;
    specialType: number;
}

export interface Formatted {
    adultList: AdultList[];
    childList?: any;
    infantList?: any;
    concurrentDescription: string;
}

export interface OriginText {
    adult: boolean;
    child: boolean;
    infant: boolean;
}

export interface AdultList {
    specialText: string;
    timeText: string;
    specialType: number;
}

export interface Formatted {
    adultList: AdultList[];
    childList?: any;
    infantList?: any;
    concurrentDescription: string;
}

export interface OriginText {
    adult: boolean;
    child: boolean;
    infant: boolean;
}

export interface PolicyInfo {
    note: string;
    formatted: Formatted;
    originText: OriginText;
    notAllowed: boolean;
    firstTimeChangeFreeNote?: any;
}

export interface PenaltyInfoList {
    segmentList: SegmentList[];
    cancelInfo: PolicyInfo;
    changeInfo: PolicyInfo;
    endorsementNote: string;
    specialNote: string;
    noShowCondition: string;
    flagInfoList: FlagInfoList[];
    partialUseChangeInfo?: any;
}

export interface PolicyInfoList {
  /** 行李额信息 */
    baggageInfoList: BaggageInfoList[];
  /** 标签信息 */
    flagInfoList: FlagInfoList[];
  /** 列表标签信息 */
    flagInfoIndexList: FlagInfoIndexList[];
  /** 特殊事件改签次数 */
    freeChangeTimes: number;
  /** 退改签政策 */
    penaltyInfoList: PenaltyInfoList[];
}

export interface TFlightDetailType {
    /** 定位产品的关键参数*/
    shoppingId: string;
    /** ShoppingId 是否改变 */
    shoppingIdChanged?: any;
    /** 是否需要postcode */
    requirePostCode: boolean;
    /** 价格描述信息列表 */
    policyDetailInfo: PolicyDetailInfo;
    /** 可用证件 */
    cardTypeInfo: CardTypeInfo;
    /** 航班基础信息 */
    flightGroupInfoList: FlightGroupInfoList[];
    /** 运价信息 */
    policyInfoList: PolicyInfoList[];
}