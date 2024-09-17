import { groupBy } from 'lodash'
import fetch from 'lib/fetch'
import { errorHandler } from 'lib/error'
import * as logger from 'lib/logger'
import { num } from 'lib/num'
import { Quoter } from 'provider/base'
import { getQuoteCurrency } from 'lib/currency'

interface Response {
  date: string
  base: string
  rates: {
    [currency: string]: number
  }
}

export class Fer extends Quoter {
  private async updatePrices(): Promise<void> {
    const quoteGroup = groupBy(this.symbols, getQuoteCurrency)

    await Promise.all(
      Object.keys(quoteGroup).map(async (quote) => {
        const response: Response = await fetch(`https://api.fer.ee/latest?from=${quote}`, {
          timeout: this.options.timeout,
        }).then((res) => res.json())

        if (!response) {
          logger.error(`${this.constructor.name}: wrong api response`, response ? JSON.stringify(response) : 'empty')
          throw new Error('Invalid response from Frankfurter')
        }

        Object.keys(response.rates).forEach((base) => {
          const symbol = `${base}/${quote}`

          if (this.symbols.indexOf(symbol) != -1) {
            const rate = num(1).dividedBy(num(response.rates[base]))
            this.setPrice(symbol, rate)
          }
        })
      })
    )
  }

  protected async update(): Promise<boolean> {
    await this.updatePrices().catch(errorHandler)

    return true
  }
}

export default Fer
