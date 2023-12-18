import * as config from 'config'
import { PriceBySymbol, Provider, ProviderOptions } from 'provider/base'
import { Upbit, Bithumb, Binance, Huobi, Bitfinex, Kraken, Kucoin, CoinGecko } from './quoter'
import { num } from 'lib/num'

class CryptoProvider extends Provider {
  constructor(options: ProviderOptions) {
    super(options)
    const { fallbackPriority } = options

    // sort by fallback priority
    for (const name of fallbackPriority) {
      const option = config.cryptoProvider[name]
      if (!option) {
        continue
      }

      name === 'upbit' && this.quoters.push(new Upbit(option))
      name === 'bithumb' && this.quoters.push(new Bithumb(option))
      name === 'binance' && this.quoters.push(new Binance(option))
      name === 'huobi' && this.quoters.push(new Huobi(option))
      name === 'bitfinex' && this.quoters.push(new Bitfinex(option))
      name === 'kraken' && this.quoters.push(new Kraken(option))
      name === 'kucoin' && this.quoters.push(new Kucoin(option))
      name === 'coinGecko' && this.quoters.push(new CoinGecko(option))
      // SKIP BROKEN QUOTER name === 'osmosis' && this.quoters.push(new Osmosis(option))
    }
  }

  public getPrices(): PriceBySymbol {
    if (!this.priceBySymbol['USDT/USD']) {
      const a = super.getPriceBy('USDT/USDC')
      const b = super.getPriceBy('USDT/TUSD')
      console.log(`USDT/USDC: ${a}, USDT/TUSD: ${b}`)
      if (a && b) {
        const fb_usd = a.plus(b).div(2)
        console.log(`fb_usd: ${fb_usd}, fb_usd.minus(1).abs(): ${fb_usd.minus(1).abs()}`)
        if (fb_usd.minus(1).abs().lte(0.005)) {
          console.log(`using fb_usd: ${fb_usd}`)
          this.priceBySymbol['USDT/USD'] = num(1).div(fb_usd)
        } else {
          console.log(`using 1`)
          this.priceBySymbol['USDT/USD'] = num('1')
        }
      } else {
        console.log(`using 1`)
        this.priceBySymbol['USDT/USD'] = num('1')
      }
    }
    return super.getPrices()
  }
}

export default CryptoProvider
