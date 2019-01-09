const axios = require('axios')

const BN = require('../../../bn')

exports.NAME = 'MrCoin'
exports.SUPPORTED_MODULES = ['ticker']

exports.ticker = async function ticker (account, fiatCode, cryptoCode) {
  if (fiatCode !== 'HUF') {
    throw new Error(`MrCoin ticker: Only HUF is currently supported! Requested 'fiatCode' was: '${fiatCode}'.`);
  }

  let response = await axios.get('https://api.mrcoin.eu/api/v1/price_ticker', {
    headers: {
      'User-Agent': 'Mozilla/4.0 (compatible; Lamassu)'
    }
  })

  let { ask, bid, valid } = response.data['atm_ticker'][`${cryptoCode}HUF`]

  if (!valid) {
    throw new Error('Price ticker is not valid')
  }

  return {
    rates: {
      ask: BN(ask),
      bid: BN(bid)
    }
  }
}
