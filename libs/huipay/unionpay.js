
const fs = require ( 'fs' )

const crypto = require ( 'crypto' )

const Time = require ( './util/time' )

const openssl = require ( './util/openssl' )

const secured = Symbol ( 'secured' )


module.exports = class Huipay {

    #config = {
        method: 'POLYMERIZE_MAIN_SWEPTN',
        version: '1.0',
        format: 'JSON',
        signType: 'RSA2',

        // 商户证书
        certification: '',
        // 商户证书密钥
        certificationPassword: '',

        // 商户公私钥
        publicKey: '',
        privateKey: '',

        // 银联官方证书
        unionpayRootCA: '',

        // 商户号
        merID: '',

        ctx: null,

        // key: '86a8eec5ae958e9948b7450439cc57e2'
        key: 'e219463e6cd3a0db0676ed68e7347e1a'
    }



    constructor ( config ) {

        if ( config ) this.config = config
    }



    set config ( config ) {

        Object.assign ( this.#config, config )

        const { unionpayRootCA, certification, certificationPassword} = this.#config

        const x509 = openssl.getX509FromPKCS12 ( certification, {
            password: certificationPassword
        } )


        const { key: privateKey } = openssl.getKeyFromX509 ( x509, 'privateKey', {
            returnsKey: true
        } )

        this.#config.privateKey = privateKey


        if ( !openssl.isCertification ( unionpayRootCA ) ) this.#config.unionpayRootCA = fs.readFileSync ( unionpayRootCA )
    }



    get config ( ) { return this.#config }



    get urlPrefix ( ) {

        return this.#config.sandbox ?
            'https://test-api.huishouqian.com/api/acquiring' : 
            'https://api.huishouqian.com/api/acquiring'
    }
    


    urls = {
        [secured]: this.urlPrefix,
        get frontTransReq ( ) { return this[secured] },
        get appTransReq ( ) { return this[secured] },
        get backTransReq ( ) { return this[secured] },
        get queryTrans ( ) { return this[secured] },
    }



    /**
     * 对象转 url 参数, ascii 排序
     * @param {*} form 
     * @returns {string}
     */
    form2Querystring ( form ) {

        let kvs = [ ]

        const keys = Object.keys ( form )

        for ( const key of keys )
            if ( form [ key ] && key !== 'sign' )
                kvs.push ( [ key, form [ key ] ].join ( '=' ) )

        return kvs.join ( '&' ) + '&key=' + this.#config.key
    }



    /**
     * 对象转 url 后, 再 sha256
     * @param {*} form 
     * @returns {string}
     */
    form2Hash ( form ) {

    }



    /**
     * 获取表单签名
     * @param {*} form 
     * @returns {string}
     */
    getFormSign ( form ) {

        const sha256 = this.form2Querystring ( form )

        const signer = crypto.createSign ( 'RSA-SHA256' )

        signer.update ( sha256 )

        const sign = signer.sign ( this.#config.privateKey, 'hex' )

        return sign
    }



    /**
     * 签名和去除表单空项
     * @param {*} form 
     */
    signAndMinifyForm ( form ) {

        for ( const key of Object.keys ( form ) ) {

            if (key === 'sign') continue

            const value = form [ key ]

            if ( value === '' || value === undefined || value === null )
                delete form [ key ]
            else if ( 'string' === typeof value && value.includes ( '&' ) )
                form [ key ] = encodeURIComponent ( value )
        }

        form.sign = this.getFormSign ( form )
    }



    /**
     * 获取表单签名是否正确
     * @param {*} form 
     * @param {*} publicKey 
     * @returns {boolean}
     */
    getFormVerify ( form, sign, publicKey ) {

        const sha256 = form

        const verifier = crypto.createVerify ( 'RSA-SHA256' )

        verifier.update ( sha256 )

        return verifier.verify ( publicKey, Buffer.from ( sign, 'hex' ) )
    }


    
    /**
     * 响应数据验证
     * @param {*} data
     * @returns {boolean}
     */
    getResponseVerify (data) {

        const result = 'result=' + data.result + '&success=true&key=' + this.#config.key

        return this.getFormVerify ( result, data.sign,  this.#config.unionpayRootCA )
    }

    /**
     * 回调数据验证
     * @param {*} data
     * @returns {boolean}
     */
    getCallbackVerify (data) {
        const result =  this.getFormVerify ( this.form2Querystring(data), data.sign,  this.#config.unionpayRootCA )
        return result
    }


    /**
     * Web跳转网关支付
     * @see {@link https://docs.huishouqian.com/HSQ_PAY/HSQ-NativePayAPI.html}
     * @returns {Promise<{redirect:string}>}
     */
    async createWebOrder ( form ) {

        console.log(form);

        let {
            orderNum,
            orderAmount,
            frontURL,
            backURL,
            goodsInfo,
            transTime,
            memo
        } = form

        const {
            version,
            format,
            signType,
            merID
        } = this.config


        const content = {
            transNo: orderNum,
            payType: 'DYNAMIC_ALL',
            returnUrl: backURL,
            pageUrl: frontURL,
            orderAmt: orderAmount,
            goodsInfo: goodsInfo,
            requestDate: Time.format(transTime, 'YYYYMMDDHHmmss'),
            memo: JSON.stringify(memo)
        }

        const signContent = JSON.stringify(content)
        
        const sendBody = {
            method: 'POLYMERIZE_MAIN_SWEPTN',
            version,
            format,
            merchantNo: merID,
            signType,
            signContent,
        }

        this.signAndMinifyForm ( sendBody )
        console.log(sendBody);

        const res = await this.config.ctx.curl(this.urls.frontTransReq, { 
            method: 'POST',
            dataType: 'json' ,
            data: sendBody,
        });

        console.log(res);

        if (res.data.success) {
            const verified = this.getResponseVerify( res.data )
            res.data.result = JSON.parse(res.data.result)
            console.log(res.data.result);
            if (verified && res.data.result.transNo && res.data.result.qrCode) {
                return {
                    redirect: res.data.result.qrCode,
                    msg: res.data.result.respMsg
                }
            } else {
                return {
                    msg: res.data.result.respMsg
                }
            }
        } else {
            return {
                msg: ''
            }
        }
    }
}
