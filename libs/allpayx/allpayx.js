const fs = require('fs')

const crypto = require('crypto')

const IO = require('./util/io')

const Time = require('./util/time')

const openssl = require('./util/openssl')

const secured = Symbol('secured')



module.exports = class Allpayx {

    config = {}

    constructor(sandbox, merID, privateKey) {
        this.config = {
            sandbox,
            privateKey,
            paymentMethod: 'goallpay_cashier',
            tradeFrom: 'WEB',
            version: 'VER000000005',
            osType: 'WINDOWS',
            signType: 'SHA256',
            orderNum: '',
            orderAmount: '',
            orderCurrency: '',
            frontURL: '',
            backURL: '',
            merID,
            goodsInfo: '',
            detailInfo: '',
            transTime: '',
            userIP: '',
            userID: '',
            logisticsStreet: '',
            signature: '',
        }
    }


    get config() {
        return this.config
    }

    get urlPrefix() {
        return this.config.sandbox ?
            'https://testapi.allpayx.com' :
            'https://api.allpayx.com'
    }


    /**
     * 对象转 url 参数, ascii 排序
     * @param {*} form 
     * @returns {string}
     */
    form2Querystring(form) {

        let kvs = []

        const keys = Object.keys(form).sort()

        for (const key of keys)
            if (form[key])
                kvs.push([key, form[key]].join('='))
        console.log('this.config.privateKey', this.config.privateKey);
        return kvs.join('&') + this.config.privateKey
    }



    /**
     * 对象转 url 后, 再 sha256
     * @param {*} form 
     * @returns {string}
     */
    form2Hash(form) {

        const preString = this.form2Querystring(form)

        console.log('preString', this.form2Querystring(form));

        const mSHA256 = crypto.createHash('SHA256')

        mSHA256.update(preString)

        return mSHA256.digest('hex')
    }



    /**
     * 获取表单签名
     * @param {*} form 
     * @returns {string}
     */
    getFormSign(form) {

        const sha256 = this.form2Hash(form)

        // const signer = crypto.createSign ( 'RSA-SHA256' )

        // signer.update ( sha256 )

        // const sign = signer.sign ( this.config.privateKey, 'base64' )

        return sha256
    }



    /**
     * 签名和去除表单空项
     * @param {*} form 
     */
    signAndMinifyForm(form) {

        for (const key of Object.keys(form)) {

            const value = form[key]

            if (value === '' || value === undefined || value === null)
                delete form[key]
        }

        form.signature = this.getFormSign(form)
    }



    /**
     * 获取表单签名是否正确
     * @param {*} form 
     * @param {*} publicKey 
     * @returns {boolean}
     */
    getFormVerify(form, publicKey) {

        const sha256 = this.form2Hash(form)

        const verifier = crypto.createVerify('RSA-SHA256')

        verifier.update(sha256)

        return verifier.verify(publicKey, Buffer.from(form.signature, 'base64'))
    }



    /**
     * 银联响应数据验证
     * @param {*} form 
     * @returns {boolean}
     */
    getResponseVerify(form) {

        console.log(form)

        if (form.merID !== this.config.merID) return false


        const signature = form.signature
        delete form.signature   

        this.signAndMinifyForm(form)

        console.log(form);

        return signature === form.signature
       
    }


    /**
     * 银联返回数据解析
     * @param {string|*} body
     * @returns {*}
     */
    responseBodyParse(body) {

        if ('string' === typeof body) {

            const jsonBody = {}

            for (const row of body.split('&')) {

                const divIndex = row.indexOf('=')

                const key = row.slice(0, divIndex)

                const val = row.slice(divIndex + 1)

                jsonBody[key] = val
            }

            return jsonBody
        }

        return body
    }



    /**
     * Web跳转网关支付
     */
    async createWebOrder(form) {

        console.log(form);

        let {
            orderNum,
            orderAmount,
            orderCurrency,
            frontURL,
            backURL,
            goodsInfo,
            detailInfo,
            transTime,
            userIP,
            userID,
            logisticsStreet,
            merReserve
        } = form

        const {
            paymentMethod,
            tradeFrom,
            version,
            osType,
            merID,
            signType
        } = this.config

        transTime = Time.format(transTime, 'YYYYMMDDHHmmss')

        const sendBody = {
            paymentMethod,
            tradeFrom,
            version,
            osType,
            signType,
            orderNum,
            orderAmount,
            orderCurrency,
            frontURL,
            backURL,
            merID,
            goodsInfo,
            detailInfo,
            transTime,
            userIP,
            userID,
            logisticsStreet,
            merReserve
        }

        this.signAndMinifyForm(sendBody)

        console.log(sendBody);

        try {
            const {
                body
            } = await IO.http(this.urlPrefix + '/api/v5/createcashier', sendBody, 'json')

            console.log(body);

            if (body.respCode === '00' ) {
                return {
                    redirect: body.parameter.payUrl
                }
            } else {
                throw new Error('支付失败')
            }
        } catch (error) {
            throw new Error(error)
        }
    }

    /**
     * 查询订单状态
     * @see {@link https://open.unionpay.com/tjweb/acproduct/APIList?apiservId=450&acpAPIId=768&bussType=0}
     * @param form
     * @param {string} form.orderId 支付、撤销、退款订单号
     * @param {number|Date|string} form.txnTime 订单创建时间
     * @returns {Promise<null|{
     * body: *,
     * queryId: string,
     * status: 'PENDING'|'SUCCESS'|'FAIL'
     * }>}
     */
    async queryOrder(form) {

        let {
            txnTime,
            ...others
        } = form

        const {
            certId,
            merId,
            encoding,
            version,
            accessType
        } = this.config

        if (['number', 'object'].includes(typeof txnTime)) txnTime = Time.format(txnTime, 'YYYYMMDDhhmmss')

        const sendBody = {
            txnType: '00',
            txnSubType: '00',
            bizType: '000802',
            txnTime,

            // 固定参数
            certId,
            merId,
            encoding,
            version,
            accessType,

            ...others,
        }

        this.signAndMinifyForm(sendBody)

        const {
            body: source
        } = await IO.http(this.urls.queryTrans, sendBody, 'form')

        const body = this.responseBodyParse(source)

        const verified = this.getResponseVerify(body)

        if (!verified) throw new Error('银联返回数据验证失败')

        const {
            queryId,
            respCode,
            respMsg,
            origRespCode
        } = body

        if (respCode === '00') {
            // 语义化状态
            let status = origRespCode === '00' ?
                'SUCCESS' : ['03', '04', '05'].includes(origRespCode) ?
                'PENDING' :
                'FAIL'

            return {
                status,
                queryId,
                body
            }
        } else if (respCode === '34') {
            // 订单不存在
            throw new Error('银联系统错误:订单不存在')
        } else {

            throw new Error(respMsg || '银联系统错误:查询失败')
        }
    }
}