const axios = require('axios');
const crypto = require('crypto');

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'MERCHANT_TEST_ID';
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || 'TEST_SALT_KEY_abcdef';
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || '1';
const PHONEPE_API_URL = process.env.PHONEPE_API_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

async function initiatePhonePePay(transactionId, amount, userId, redirectUrl) {
  try {
    const payload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: userId,
      amount: amount * 100, // Paise mein badla
      redirectUrl: redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: `${process.env.BACKEND_URL || 'https://api.streamflow.vip'}/api/payments/phonepe/callback`,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const verificationString = base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY;
    const sha256Hash = crypto.createHash('sha256').update(verificationString).digest('hex');
    const xVerifyHeader = `${sha256Hash}###${PHONEPE_SALT_INDEX}`;

    const options = {
      method: 'POST',
      url: PHONEPE_API_URL,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': xVerifyHeader
      },
      data: { request: base64Payload }
    };

    const response = await axios.request(options);
    if (response.data && response.data.success) {
      return {
        success: true,
        paymentUrl: response.data.data.instrumentResponse.redirectInfo.url,
        transactionId
      };
    } else {
      return { success: false, message: 'Invalid payload response from PhonePe' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = { initiatePhonePePay };

