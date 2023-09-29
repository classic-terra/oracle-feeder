import * as config from 'config'
import { PriceBySymbol, Provider, ProviderOptions } from 'provider/base'
import * as logger from 'lib/logger'
import { CurrencyLayer, AlphaVantage, Fixer, ExchangeRate, Fer, Frankfurter, Fastforex } from './quoter'
import BigNumber from 'bignumber.js'
import { getBaseCurrency } from 'lib/currency'

class FiatProvider extends Provider {
  constructor(options: ProviderOptions) {
    super(options)
  }

  public async initialize(): Promise<void> {
    const { fallbackPriority } = config.fiatProvider

    // sort by fallback priority
    for (const name of fallbackPriority) {
      const option = config.fiatProvider[name]
      if (!option) {
        continue
      }

      name === 'currencylayer' && this.quoters.push(new CurrencyLayer(option))
      name === 'alphavantage' && this.quoters.push(new AlphaVantage(option))
      name === 'fixer' && this.quoters.push(new Fixer(option))
      name === 'fer' && this.quoters.push(new Fer(option))
      name === 'frankfurter' && this.quoters.push(new Frankfurter(option))
      name === 'exchangerate' && this.quoters.push(new ExchangeRate(option))
      name === 'fastforex' && this.quoters.push(new Fastforex(option))
    }

    await super.initialize()

    await this.tick(Date.now())
  }

  protected calculateSDR(prices: PriceBySymbol): BigNumber | undefined {
    if (!config.sdrBasket) {
      logger.error(`calculateSDR: config.sdrBasket not found`)
      return undefined
    }

    const priceList = Object.keys(prices).map((symbol) => ({
      denom: getBaseCurrency(symbol),
      price: prices[symbol].toFixed(8),
    }))

    // check if all prices from the basket are available
    for (const denom of Object.keys(config.sdrBasket)) {
      if (denom === 'USD') {
        continue
      }

      if (!priceList.find((p) => p.denom === denom)) {
        logger.error(`calculateSDR price for ${denom} not found`)
        return undefined
      }
    }

    // calculate SDR price
    let sdrPrice: BigNumber | undefined = undefined

    try {
      sdrPrice = Object.entries(config.sdrBasket).reduce((acc, [denom, weight]: [string, string]) => {
        const price = denom === 'USD' ? BigNumber(1) : priceList.find((p) => p.denom === denom)?.price || BigNumber(0)
        if (!price) {
          throw new Error(`price for ${denom} not found`)
        }
        return acc.plus(new BigNumber(price).times(weight))
      }, new BigNumber(0))
    } catch (err) {
      logger.error(`getPrices: error calculating SDR price: ${err.message}`)
      return undefined
    }

    if (!sdrPrice) {
      logger.error(`getPrices: error calculating SDR price`)
      return undefined
    }

    logger.info(`getPrices: calculated SDR price: ${sdrPrice.toString()}`)
    return sdrPrice
  }

  protected adjustPrices(): void {
    for (const symbol of this.symbols) {
      delete this.priceBySymbol[symbol]

      // get price by fallback priority
      for (const quoter of this.quoters) {
        const price = quoter.getPrice(symbol)

        if (price) {
          this.priceBySymbol[symbol] = price
          break
        }
      }
    }

    if (!this.priceBySymbol['SDR']) {
      logger.info(`No SDR price found, falling back to calculation.`)
      const sdrPrice = this.calculateSDR(this.priceBySymbol)
      if (sdrPrice && sdrPrice.isNaN() === false) {
        this.priceBySymbol['SDR'] = sdrPrice
      } else {
        logger.error(`No SDR price found, calculation failed.`)
      }
    }
  }
}

export default FiatProvider
