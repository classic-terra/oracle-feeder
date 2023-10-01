import { parse } from 'node-html-parser'
import fetch from 'lib/fetch'
import { errorHandler } from 'lib/error'
import { num } from 'lib/num'
import { Quoter } from 'provider/base'

const SDR_VALUATION_URL = 'https://www.imf.org/external/np/fin/data/rms_sdrv.aspx'

async function fetchQuote() {
  const text = await fetch(SDR_VALUATION_URL).then((res) => res.text())

  const doc = parse(text)
  const tds = doc.querySelectorAll('.tightest td')
  const idx = tds.findIndex((el) => el.structuredText === ' SDR1 = US$')

  if (idx === -1) {
    throw new Error('cannot find SDR/USD element from HTML document')
  }

  // sample format: ' 1.32149 2'
  return num(tds[idx + 1].structuredText.split(' ')[1])
}

// fetchQuote().then(console.log).catch(console.error) // For test

export class IMF extends Quoter {
  protected async update(): Promise<boolean> {
    if (this.symbols.indexOf('SDR/USD') !== -1) {
      await fetchQuote()
        .then((rate) => this.setPrice('SDR/USD', rate))
        .catch(errorHandler)
    }

    return true
  }
}

export default IMF
