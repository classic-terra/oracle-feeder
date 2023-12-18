import { BigNumber } from 'bignumber.js'
import { num } from './num'

export function average(array: BigNumber[], threshold = 0.1): BigNumber {
  if (!array || !array.length) {
    throw new Error('empty array')
  }

  if (array.length === 1) {
    return array[0]
  }

  if (array.length >= 3) {
    // remove outliers only if we have enough entries
    // i.e. remove values that are 10% or more different from the median
    const sortedArray = array.sort((a, b) => a.minus(b).toNumber())
    const median = sortedArray[Math.floor(sortedArray.length / 2)]
    const filteredArray = sortedArray.filter((x) => {
      const dist = num(1.0).minus(x.dividedBy(median)).abs()

      // 10% threshold
      return dist.isLessThanOrEqualTo(threshold)
    })
    array = filteredArray
  }

  return array.reduce((a, b) => a.plus(b)).dividedBy(num(array.length))
}

export function vwap(array: { price: BigNumber; volume: BigNumber }[]): BigNumber {
  if (!array || !array.length) {
    throw new Error('empty array')
  }

  if (array.length === 1) {
    return array[0].price
  }

  // sum(volume * price) / (total volume)
  // return array.reduce((s, x) => s + x.volume * x.price, 0) / array.reduce((s, x) => s + x.volume, 0) || 0
  const sum = array.reduce((s, x) => s.plus(x.volume.multipliedBy(x.price)), num(0))
  const totalVolume = array.reduce((s, x) => s.plus(x.volume), num(0))
  return sum.dividedBy(totalVolume) || num(0)
}

export function tvwap(
  array: { price: BigNumber; volume: BigNumber; timestamp: number }[],
  minimumTimeWeight: BigNumber = num(0.2)
): BigNumber {
  if (!array || !array.length) {
    throw new Error('empty array')
  }

  if (array.length === 1) {
    return array[0].price
  }

  const sortedArray = array.sort((a, b) => a.timestamp - b.timestamp)
  const now = num(Date.now())
  const period = now.minus(num(array[0].timestamp))
  const weightUnit = num(1).minus(minimumTimeWeight).dividedBy(period)

  const tvwapTrades = sortedArray.map((trade) => ({
    price: trade.price,
    // volume: trade.volume * (((1 - minimumTimeWeight) / period) * (period - (now - trade.timestamp)) + minimumTimeWeight)
    volume: trade.volume.multipliedBy(
      weightUnit.multipliedBy(period.minus(now.minus(num(trade.timestamp))).plus(minimumTimeWeight))
    ),
  }))

  return vwap(tvwapTrades)
}

export function hasOutliers(nums: BigNumber[], threshold = 0.1): boolean {
  if (nums.length < 2) {
    return false
  }

  let outliers = 0
  const values = nums.slice().sort((a, b) => a.minus(b).toNumber())

  for (let i = 0; i < values.length; i += 1) {
    const dist = num(1.0)
      .minus(values[i].dividedBy(values[i + 1]))
      .abs()

    // 3% threshold
    if (dist.isGreaterThanOrEqualTo(threshold)) {
      outliers += 1
    }
  }

  if (outliers > nums.length / 3) {
    return true
  }

  return false
}
