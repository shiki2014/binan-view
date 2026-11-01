<template>
  <el-card shadow="never" class="kline-card" :class="`theme-${themeMode}`">
    <div class="kline-header">
      <div class="kline-title">{{ symbol }} · {{ positionSideLabel }}</div>
      <div class="kline-tags">
        <el-tag size="mini" :type="positionSide === 'LONG' ? 'success' : 'danger'">{{ positionSide }}</el-tag>
        <el-radio-group v-model="currentInterval" size="mini" class="interval-switch">
          <el-radio-button label="1d">日线</el-radio-button>
          <el-radio-button label="1h">小时线</el-radio-button>
        </el-radio-group>
        <el-button
          size="mini"
          icon="el-icon-refresh"
          :loading="loading"
          @click="refreshCard">
          刷新
        </el-button>
      </div>
    </div>

    <div class="kline-meta">
      <span class="kline-meta-item">
        <span class="kline-meta-label">开仓价</span>
        <span class="kline-meta-value">{{ formatPrice(entryPrice) }}</span>
      </span>
      <span class="kline-meta-item">
        <span class="kline-meta-label">止损价</span>
        <span class="kline-meta-value">{{ formatPrice(stopPrice) }}</span>
      </span>
      <span class="kline-meta-item">
        <span class="kline-meta-label">止盈价</span>
        <span class="kline-meta-value">{{ formatPrice(takeProfitPrice) }}</span>
      </span>
      <span class="kline-meta-item">
        <span class="kline-meta-label">仓位</span>
        <span class="kline-meta-value">{{ formatAmount(position.positionAmt) }}</span>
      </span>
      <span class="kline-meta-item">
        <span class="kline-meta-label">未实现盈亏</span>
        <span class="kline-meta-value">{{ formatAmount(position.unrealizedProfit) }}</span>
      </span>
    </div>

    <div v-if="errorMsg" class="kline-status error">{{ errorMsg }}</div>

    <div class="kline-content">
      <div ref="chartPanel" class="kline-chart-panel">
        <div v-if="loading" class="kline-status">加载K线中...</div>
        <div ref="chartBox" class="kline-chart"></div>
        <div v-if="loadingMoreHistory" class="kline-history-status">正在懒加载更早K线...</div>
      </div>

      <div class="kline-action-panel">
        <div class="action-title">仓位操作</div>
        <div class="action-row action-row-jump">
          <el-button size="mini" plain @click="openBinanceChart">打开币安K线</el-button>
          <el-button size="mini" plain @click="openAiCoinDesktop">打开本地AiCoin</el-button>
        </div>

        <div class="action-row">
          <el-button size="mini" type="danger" plain @click="onClosePosition">平仓</el-button>
          <el-input
            v-model="actionForm.addQty"
            size="mini"
            class="action-input"
            placeholder="加仓数量">
          </el-input>
          <el-button size="mini" type="primary" plain @click="onAddPosition">加仓</el-button>
        </div>

        <div class="action-row">
          <el-input
            v-model="actionForm.stopPrice"
            size="mini"
            class="action-input"
            placeholder="新止损价">
          </el-input>
          <el-button size="mini" type="warning" plain @click="onUpdateStop">更新止损</el-button>
        </div>

        <div class="action-row">
          <el-input
            v-model="actionForm.takeProfitPrice"
            size="mini"
            class="action-input"
            placeholder="新止盈价">
          </el-input>
          <el-button size="mini" type="success" plain @click="onUpdateTakeProfit">更新止盈</el-button>
        </div>

        <div class="action-row">
          <el-button
            size="mini"
            plain
            :loading="loadingMoreHistory"
            :disabled="!hasMoreHistory"
            @click="loadOlderHistory">
            加载更早K线
          </el-button>
        </div>

        <div class="action-tip">
          当前默认仅显示最近50天，历史数据按需懒加载。
        </div>
      </div>
    </div>
  </el-card>
</template>

<script>
import * as echarts from 'echarts'
import { getSymbolKlines } from '@/api/api.js'

const STOP_TYPES = ['STOP', 'STOP_MARKET']
const TAKE_PROFIT_TYPES = ['TAKE_PROFIT', 'TAKE_PROFIT_MARKET']
const BULLISH_CANDLE_COLOR = '#e74c3c'
const BEARISH_CANDLE_COLOR = '#16a085'
const FUTURE_PADDING_BARS = 8

export default {
  name: 'KlinePositionCard',
  props: {
    position: {
      type: Object,
      required: true
    },
    defaultInterval: {
      type: String,
      default: '1d'
    },
    wheelZoomEnabled: {
      type: Boolean,
      default: false
    },
    openOrders: {
      type: Array,
      default: () => []
    },
    themeMode: {
      type: String,
      default: 'light'
    }
  },
  data () {
    return {
      loading: false,
      errorMsg: '',
      candleData: [],
      chart: null,
      resizeObserver: null,
      currentInterval: this.normalizeInterval(this.defaultInterval),
      loadingMoreHistory: false,
      hasMoreHistory: true,
      lastHistoryLoadAt: 0,
      actionForm: {
        addQty: '',
        stopPrice: '',
        takeProfitPrice: ''
      }
    }
  },
  computed: {
    symbol () {
      return String(this.position.symbol || '').toUpperCase()
    },
    positionSide () {
      return String(this.position.positionSide || '').toUpperCase()
    },
    positionSideLabel () {
      if (this.positionSide === 'LONG') return '多头'
      if (this.positionSide === 'SHORT') return '空头'
      return this.positionSide || '-'
    },
    expectedCloseSide () {
      if (this.positionSide === 'LONG') return 'SELL'
      if (this.positionSide === 'SHORT') return 'BUY'
      return ''
    },
    entryPrice () {
      return Number(this.position.entryPrice || 0)
    },
    symbolOrders () {
      const side = this.positionSide
      const expectedCloseSide = this.expectedCloseSide
      const normalized = (this.openOrders || [])
        .filter(item => {
          const symbolMatched = String(item.symbol || '').toUpperCase() === this.symbol
          if (!symbolMatched) return false
          const itemPositionSide = String(item.positionSide || '').toUpperCase()
          if (side && side !== 'BOTH' && itemPositionSide && itemPositionSide !== side) return false
          const itemSide = String(item.side || '').toUpperCase()
          if (expectedCloseSide && itemSide && itemSide !== expectedCloseSide) return false
          const price = this.extractOrderPrice(item)
          return price > 0
        })
        .map(item => {
          return {
            ...item,
            _priority: this.getOrderPriority(item)
          }
        })
      return normalized.sort((a, b) => {
        const priorityDiff = Number(b._priority || 0) - Number(a._priority || 0)
        if (priorityDiff !== 0) return priorityDiff
        return Number(b.time || 0) - Number(a.time || 0)
      })
    },
    stopPrice () {
      const target = this.symbolOrders.find(item => STOP_TYPES.includes(String(item.type || '').toUpperCase()))
      return this.extractOrderPrice(target)
    },
    takeProfitPrice () {
      const target = this.symbolOrders.find(item => TAKE_PROFIT_TYPES.includes(String(item.type || '').toUpperCase()))
      return this.extractOrderPrice(target)
    },
    isMacOS () {
      if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
      const platform = String(navigator.platform || '').toLowerCase()
      const userAgent = String(navigator.userAgent || '').toLowerCase()
      return platform.includes('mac') || userAgent.includes('macintosh')
    }
  },
  watch: {
    defaultInterval (value) {
      const normalized = this.normalizeInterval(value)
      if (normalized !== this.currentInterval) {
        this.currentInterval = normalized
      }
    },
    currentInterval () {
      this.loadKlines()
    },
    symbol () {
      this.actionForm = {
        addQty: '',
        stopPrice: '',
        takeProfitPrice: ''
      }
      this.loadKlines()
    },
    themeMode () {
      this.renderChart()
    },
    wheelZoomEnabled () {
      this.renderChart()
    },
    stopPrice () {
      this.syncActionFormPrices()
      this.renderChart()
    },
    takeProfitPrice () {
      this.syncActionFormPrices()
      this.renderChart()
    },
    openOrders: {
      handler () {
        this.syncActionFormPrices()
        this.renderChart()
      },
      deep: true
    }
  },
  mounted () {
    window.addEventListener('resize', this.handleResize)
    this.setupResizeObserver()
    this.syncActionFormPrices()
    this.loadKlines()
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.handleResize)
    this.destroyResizeObserver()
    if (this.chart) {
      this.chart.off('datazoom', this.handleDataZoom)
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    formatPrice (value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num <= 0) return '-'
      if (num >= 1000) return num.toFixed(2)
      if (num >= 1) return num.toFixed(4)
      return num.toFixed(6)
    },
    formatAmount (value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '-'
      if (Math.abs(num) >= 100) return num.toFixed(2)
      return num.toFixed(4)
    },
    formatPriceInput (value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num <= 0) return ''
      return String(num)
    },
    normalizePriceValue (value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num <= 0) return 0
      return Number(num.toFixed(10))
    },
    getMaxPriceDecimals (values) {
      let maxDecimals = 0
      for (let i = 0; i < values.length; i++) {
        const num = Number(values[i] || 0)
        if (!Number.isFinite(num) || num <= 0) continue
        const str = String(num)
        const index = str.indexOf('.')
        if (index < 0) continue
        const decimals = str.length - index - 1
        if (decimals > maxDecimals) {
          maxDecimals = decimals
        }
      }
      return Math.min(Math.max(maxDecimals, 0), 8)
    },
    getYAxisMinInterval (candles, markLines) {
      const values = []
      for (let i = 0; i < candles.length; i++) {
        values.push(candles[i].open, candles[i].high, candles[i].low, candles[i].close)
      }
      for (let i = 0; i < markLines.length; i++) {
        values.push(markLines[i].yAxis)
      }
      const maxDecimals = this.getMaxPriceDecimals(values)
      if (!maxDecimals) return 0.000001
      return Number((1 / Math.pow(10, maxDecimals)).toFixed(maxDecimals + 2))
    },
    toPositiveNumber (value) {
      const num = Number(value)
      if (!Number.isFinite(num) || num <= 0) return 0
      return num
    },
    extractOrderPrice (order) {
      if (!order) return 0
      const price = Number(order.stopPrice || order.price || order.triggerPrice || 0)
      return Number.isFinite(price) && price > 0 ? price : 0
    },
    getOrderPriority (order) {
      let score = 0
      if (order && order.closePosition) score += 120
      if (order && order.reduceOnly) score += 80
      const itemPositionSide = String(order && order.positionSide ? order.positionSide : '').toUpperCase()
      if (itemPositionSide && itemPositionSide === this.positionSide) score += 30
      const itemSide = String(order && order.side ? order.side : '').toUpperCase()
      if (itemSide && itemSide === this.expectedCloseSide) score += 20
      if (String(order && order.source ? order.source : '').toLowerCase() === 'algo') score += 10
      return score
    },
    syncActionFormPrices () {
      if (!this.actionForm.stopPrice && this.stopPrice > 0) {
        this.actionForm.stopPrice = this.formatPriceInput(this.stopPrice)
      }
      if (!this.actionForm.takeProfitPrice && this.takeProfitPrice > 0) {
        this.actionForm.takeProfitPrice = this.formatPriceInput(this.takeProfitPrice)
      }
    },
    emitAction (action, payload = {}) {
      this.$emit('action', {
        action,
        symbol: this.symbol,
        positionSide: this.positionSide,
        position: this.position,
        ...payload
      })
    },
    getBinanceFuturesUrl () {
      return `https://www.binance.com/zh-CN/futures/${this.symbol}`
    },
    getAiCoinChartSymbol () {
      const normalized = String(this.symbol || '').toLowerCase()
      if (!normalized) return ''

      // AiCoin Binance 合约 key 规则：{base}swap{quote}:binance
      if (normalized.endsWith('usdt')) {
        return `${normalized.slice(0, -4)}swapusdt:binance`
      }
      if (normalized.endsWith('busd')) {
        return `${normalized.slice(0, -4)}swapbusd:binance`
      }
      if (normalized.endsWith('usd')) {
        return `${normalized.slice(0, -3)}perpusd:binance`
      }

      return `${normalized}:binance`
    },
    getAiCoinChartPath () {
      return `/chart/${this.getAiCoinChartSymbol()}?lang=zh`
    },
    getAiCoinDeepLinkPath () {
      const symbol = this.getAiCoinChartSymbol()
      if (!symbol) return '/main/exchange'
      return `/chart/${symbol}`
    },
    getAiCoinWebUrl () {
      return `https://www.aicoin.com${this.getAiCoinChartPath()}`
    },
    openBinanceChart () {
      const url = this.getBinanceFuturesUrl()
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    openAiCoinDesktop () {
      const deepLinkPath = this.getAiCoinDeepLinkPath()
      const webUrl = this.getAiCoinWebUrl()
      if (this.isMacOS) {
        window.open(webUrl, '_blank', 'noopener,noreferrer')
        this.$message.info('macOS 默认打开 AiCoin 网页版')
        return
      }
      const deepLink = `aicoin:///open?url=${deepLinkPath}`
      let pageHidden = false
      const onBlur = () => {
        pageHidden = true
      }
      window.addEventListener('blur', onBlur, { once: true })
      window.location.href = deepLink
      window.setTimeout(() => {
        if (!pageHidden && !document.hidden) {
          window.open(webUrl, '_blank', 'noopener,noreferrer')
        }
      }, 1200)
    },
    refreshCard () {
      if (this.loading) return
      this.loadKlines()
      this.emitAction('refresh')
    },
    onClosePosition () {
      this.emitAction('close')
    },
    onAddPosition () {
      const quantity = this.toPositiveNumber(this.actionForm.addQty)
      if (!quantity) {
        this.$message.warning('请输入有效的加仓数量')
        return
      }
      this.emitAction('add', { quantity })
    },
    onUpdateStop () {
      const stopPrice = this.toPositiveNumber(this.actionForm.stopPrice)
      if (!stopPrice) {
        this.$message.warning('请输入有效的止损价')
        return
      }
      this.emitAction('updateStop', { stopPrice })
    },
    onUpdateTakeProfit () {
      const takeProfitPrice = this.toPositiveNumber(this.actionForm.takeProfitPrice)
      if (!takeProfitPrice) {
        this.$message.warning('请输入有效的止盈价')
        return
      }
      this.emitAction('updateTakeProfit', { takeProfitPrice })
    },
    setupResizeObserver () {
      if (typeof ResizeObserver === 'undefined') return
      this.$nextTick(() => {
        const chartPanel = this.$refs.chartPanel
        if (!chartPanel) return
        this.destroyResizeObserver()
        this.resizeObserver = new ResizeObserver(() => {
          this.scheduleChartResize()
        })
        this.resizeObserver.observe(chartPanel)
      })
    },
    destroyResizeObserver () {
      if (this.resizeObserver) {
        this.resizeObserver.disconnect()
        this.resizeObserver = null
      }
    },
    scheduleChartResize () {
      if (!this.chart) return
      this.$nextTick(() => {
        requestAnimationFrame(() => {
          if (!this.chart) return
          this.chart.resize()
          setTimeout(() => {
            if (this.chart) this.chart.resize()
          }, 120)
        })
      })
    },
    handleResize () {
      this.scheduleChartResize()
    },
    normalizeInterval (value) {
      return String(value || '').toLowerCase() === '1h' ? '1h' : '1d'
    },
    getCurrentZoomRange () {
      if (!this.chart) return null
      const option = this.chart.getOption()
      const dataZoom = option && Array.isArray(option.dataZoom) ? option.dataZoom[0] : null
      if (!dataZoom) return null
      const start = Number(dataZoom.start)
      const end = Number(dataZoom.end)
      if (!Number.isFinite(start) || !Number.isFinite(end)) return null
      return { start, end }
    },
    getWindowRange (days, endTime) {
      const safeDays = Math.max(1, Number(days || 1))
      const safeEndTime = Number(endTime || Date.now())
      const DAY_MS = 24 * 60 * 60 * 1000
      return {
        endTime: safeEndTime,
        startTime: safeEndTime - safeDays * DAY_MS
      }
    },
    getIntervalMs () {
      return this.currentInterval === '1h' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    },
    getKlineLimitByInterval () {
      return this.currentInterval === '1h' ? 1500 : 300
    },
    formatTimeLabel (timestamp) {
      const time = Number(timestamp || 0)
      if (!Number.isFinite(time) || time <= 0) return ''
      const date = new Date(time)
      const mm = String(date.getMonth() + 1).padStart(2, '0')
      const dd = String(date.getDate()).padStart(2, '0')
      const hh = String(date.getHours()).padStart(2, '0')
      if (this.currentInterval === '1h') {
        return `${mm}-${dd} ${hh}:00`
      }
      return `${date.getFullYear()}-${mm}-${dd}`
    },
    buildMarkLineData () {
      const lines = []
      const appendLine = (name, price, color, style) => {
        const precisePrice = this.normalizePriceValue(price)
        if (precisePrice <= 0) return
        lines.push({
          name,
          yAxis: precisePrice,
          value: precisePrice,
          labelText: `${name} ${this.formatPrice(precisePrice)}`,
          lineStyle: { color, width: 1.2, type: style }
        })
      }
      if (this.entryPrice > 0) {
        const entryColor = this.positionSide === 'SHORT' ? BEARISH_CANDLE_COLOR : BULLISH_CANDLE_COLOR
        appendLine('开仓价', this.entryPrice, entryColor, 'solid')
      }
      if (this.stopPrice > 0) {
        appendLine('止损', this.stopPrice, '#d94848', 'dashed')
      }
      if (this.takeProfitPrice > 0) {
        appendLine('止盈', this.takeProfitPrice, '#17a06d', 'dashed')
      }
      return lines
    },
    mergeCandles (olderCandles, currentCandles) {
      const mergedMap = new Map()
      const list = []
        .concat(Array.isArray(olderCandles) ? olderCandles : [])
        .concat(Array.isArray(currentCandles) ? currentCandles : [])
      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        const key = Number(item && item.openTime)
        if (!Number.isFinite(key) || key <= 0) continue
        mergedMap.set(key, item)
      }
      return Array.from(mergedMap.values()).sort((a, b) => Number(a.openTime) - Number(b.openTime))
    },
    extractKlineList (response) {
      const list = response && response.data && Array.isArray(response.data.data) ? response.data.data : []
      return list.filter(item => Number.isFinite(Number(item.openTime)) && Number(item.openTime) > 0)
    },
    async fetchKlineRange (startTime, endTime) {
      const limit = this.getKlineLimitByInterval()
      const res = await getSymbolKlines(this.symbol, this.currentInterval, limit, {
        startTime,
        endTime
      })
      return this.extractKlineList(res)
    },
    async loadOlderHistory () {
      if (!this.symbol || this.loading || this.loadingMoreHistory || !this.hasMoreHistory) return
      if (!this.candleData.length) return
      this.loadingMoreHistory = true
      try {
        const oldest = Number(this.candleData[0].openTime || 0)
        if (!Number.isFinite(oldest) || oldest <= 0) {
          this.hasMoreHistory = false
          return
        }
        const endTime = oldest - 1
        const range = this.getWindowRange(30, endTime)
        const older = await this.fetchKlineRange(range.startTime, range.endTime)
        if (!older.length) {
          this.hasMoreHistory = false
          return
        }
        this.candleData = this.mergeCandles(older, this.candleData)
        if (older.length < 10) {
          this.hasMoreHistory = false
        }
        this.$nextTick(() => {
          this.renderChart()
        })
      } catch (error) {
        this.hasMoreHistory = false
      } finally {
        this.loadingMoreHistory = false
      }
    },
    handleDataZoom () {
      if (!this.wheelZoomEnabled || !this.hasMoreHistory || this.loadingMoreHistory) return
      const zoomRange = this.getCurrentZoomRange()
      if (!zoomRange) return
      if (zoomRange.start > 1.5) return
      const now = Date.now()
      if (now - this.lastHistoryLoadAt < 800) return
      this.lastHistoryLoadAt = now
      this.loadOlderHistory()
    },
    renderChart () {
      if (!this.$refs.chartBox) return
      if (!this.candleData.length) {
        if (this.chart) this.chart.clear()
        return
      }
      if (!this.chart) {
        this.chart = echarts.init(this.$refs.chartBox)
      }
      this.chart.off('datazoom', this.handleDataZoom)
      this.chart.on('datazoom', this.handleDataZoom)
      const isDark = this.themeMode === 'dark'
      const axisColor = isDark ? '#93a3bf' : '#60738f'
      const splitColor = isDark ? 'rgba(80, 103, 138, 0.35)' : 'rgba(172, 191, 219, 0.35)'
      const candles = this.candleData
      const xData = candles.map(item => this.formatTimeLabel(item.openTime))
      const yData = candles.map(item => [item.open, item.close, item.low, item.high])
      const intervalMs = this.getIntervalMs()
      const lastOpenTime = Number(candles[candles.length - 1] && candles[candles.length - 1].openTime
        ? candles[candles.length - 1].openTime
        : Date.now())
      for (let i = 0; i < FUTURE_PADDING_BARS; i++) {
        const futureOpenTime = lastOpenTime + intervalMs * (i + 1)
        xData.push(this.formatTimeLabel(futureOpenTime))
        yData.push([null, null, null, null])
      }
      const markLineData = this.buildMarkLineData()
      const yAxisMinInterval = this.getYAxisMinInterval(candles, markLineData)
      const zoomRange = this.getCurrentZoomRange()
      const yAxisMin = value => {
        const min = Number(value && value.min)
        const max = Number(value && value.max)
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null
        const distance = Math.max(max - min, yAxisMinInterval * 4, Math.abs(max) * 0.001)
        const padding = distance * 0.08
        return Number((Math.max(min - padding, 0)).toFixed(8))
      }
      const yAxisMax = value => {
        const min = Number(value && value.min)
        const max = Number(value && value.max)
        if (!Number.isFinite(min) || !Number.isFinite(max)) return null
        const distance = Math.max(max - min, yAxisMinInterval * 4, Math.abs(max) * 0.001)
        const padding = distance * 0.08
        return Number((max + padding).toFixed(8))
      }
      let markLineOption
      if (markLineData.length) {
        markLineOption = {
          symbol: ['none', 'none'],
          silent: true,
          precision: 8,
          label: {
            show: true,
            position: 'insideStartTop',
            formatter: params => {
              const data = params && params.data ? params.data : {}
              if (data.labelText) return data.labelText
              const value = Number.isFinite(Number(data.value)) ? Number(data.value) : Number(params.value || 0)
              return `${params.name} ${this.formatPrice(value)}`
            },
            color: isDark ? '#d9e4f6' : '#2c3e55',
            fontSize: 10,
            padding: [2, 4],
            backgroundColor: isDark ? 'rgba(20, 33, 52, 0.88)' : 'rgba(242, 247, 255, 0.92)',
            borderRadius: 2
          },
          data: markLineData
        }
      }
      this.chart.setOption({
        animation: false,
        backgroundColor: 'transparent',
        grid: {
          left: 48,
          right: 18,
          top: 26,
          bottom: 44
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          },
          backgroundColor: isDark ? 'rgba(15,24,37,0.94)' : 'rgba(255,255,255,0.95)',
          borderColor: isDark ? '#3a4f6d' : '#d0deef',
          textStyle: {
            color: isDark ? '#d9e4f6' : '#2c3e55'
          }
        },
        xAxis: {
          type: 'category',
          data: xData,
          boundaryGap: true,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: { color: axisColor, fontSize: 10 },
          splitLine: { show: false }
        },
        yAxis: {
          scale: true,
          min: yAxisMin,
          max: yAxisMax,
          minInterval: yAxisMinInterval,
          axisLine: { lineStyle: { color: axisColor } },
          axisLabel: {
            color: axisColor,
            fontSize: 10,
            formatter: value => this.formatPrice(value)
          },
          splitLine: { lineStyle: { color: splitColor } }
        },
        dataZoom: [
          {
            type: 'inside',
            filterMode: 'filter',
            start: zoomRange ? zoomRange.start : 0,
            end: zoomRange ? zoomRange.end : 100,
            zoomOnMouseWheel: this.wheelZoomEnabled,
            moveOnMouseWheel: this.wheelZoomEnabled
          }
        ],
        series: [
          {
            type: 'candlestick',
            data: yData,
            itemStyle: {
              color: BULLISH_CANDLE_COLOR,
              color0: BEARISH_CANDLE_COLOR,
              borderColor: BULLISH_CANDLE_COLOR,
              borderColor0: BEARISH_CANDLE_COLOR
            },
            markLine: markLineOption
          }
        ]
      }, true)
      this.scheduleChartResize()
    },
    async loadKlines () {
      if (!this.symbol) return
      this.loading = true
      this.errorMsg = ''
      this.hasMoreHistory = true
      this.lastHistoryLoadAt = 0
      try {
        const range = this.getWindowRange(50, Date.now())
        const list = await this.fetchKlineRange(range.startTime, range.endTime)
        this.candleData = list
        if (!list.length) {
          this.hasMoreHistory = false
        }
        this.$nextTick(() => {
          this.renderChart()
        })
      } catch (error) {
        this.errorMsg = error && error.response && error.response.data ? error.response.data : 'K线加载失败'
        this.candleData = []
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style scoped>
.kline-card {
  margin-bottom: 12px;
}

.kline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 8px;
}

.kline-title {
  font-size: 14px;
  font-weight: 600;
  flex: 0 1 auto;
  color: var(--text-strong, #2e4665);
}

.kline-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.interval-switch {
  margin-left: 2px;
}

.kline-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--text-sub, #6b7f98);
  margin-bottom: 8px;
}

.kline-meta-item {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}

.kline-meta-label {
  color: var(--text-sub, #58708f);
  margin-right: 4px;
}

.kline-meta-value {
  color: var(--text-soft-strong, #2e4665);
}

.kline-content {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.kline-chart-panel {
  flex: 1 1 50%;
  min-width: 0;
  border-right: 1px dashed var(--card-border, #d9e4f6);
  padding-right: 8px;
}

.kline-action-panel {
  flex: 1 1 50%;
  min-width: 0;
  padding-left: 8px;
}

.action-title {
  font-size: 12px;
  color: var(--text-soft-strong, #58708f);
  margin-bottom: 8px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.action-row-jump {
  flex-wrap: wrap;
}

.action-input {
  flex: 1;
}

.action-tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-sub, #7b8798);
  line-height: 1.4;
}

.kline-status {
  font-size: 12px;
  margin-bottom: 8px;
  color: var(--text-sub, #7b8798);
}

.kline-status.error {
  color: var(--danger, #d94848);
}

.kline-history-status {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-sub, #7b8798);
}

.kline-chart {
  width: 100%;
  height: 260px;
}

.kline-card /deep/ .interval-switch .el-radio-button__inner {
  padding: 5px 10px;
}

.kline-card /deep/ .el-button {
  border-radius: 10px;
}

.kline-card /deep/ .el-button--default {
  background: var(--button-default-bg, rgba(248, 251, 255, 0.94));
  border-color: var(--button-default-border, #cfdaea);
  color: var(--button-default-text, #274062);
}

.kline-card /deep/ .el-button--default:hover,
.kline-card /deep/ .el-button--default:focus {
  background: var(--button-default-bg-hover, rgba(255, 255, 255, 0.98));
  border-color: var(--primary, #1f6feb);
  color: var(--text-strong, #1f3554);
}

.kline-card /deep/ .el-button--primary.is-plain {
  color: var(--primary, #1f6feb);
  border-color: var(--primary, #1f6feb);
  background: var(--primary-soft, #dce9ff);
}

.kline-card /deep/ .el-button--success.is-plain {
  color: var(--success, #1f9d70);
  border-color: var(--success, #1f9d70);
  background: var(--success-soft, rgba(31, 157, 112, 0.14));
}

.kline-card /deep/ .el-button--warning.is-plain {
  color: var(--warning, #c97c14);
  border-color: var(--warning, #c97c14);
  background: var(--warning-soft, rgba(201, 124, 20, 0.16));
}

.kline-card /deep/ .el-button--danger.is-plain {
  color: var(--danger, #cc3d3d);
  border-color: var(--danger, #cc3d3d);
  background: var(--danger-soft, rgba(204, 61, 61, 0.14));
}

.kline-card /deep/ .el-input__inner {
  background: var(--input-bg, rgba(255, 255, 255, 0.94));
  border-color: var(--input-border, #cfdaea);
  color: var(--text-main, #1f2a37);
}

.kline-card /deep/ .el-input__inner::placeholder {
  color: var(--input-placeholder, #8a99ac);
}

.kline-card /deep/ .el-input__inner:hover,
.kline-card /deep/ .el-input__inner:focus {
  border-color: var(--primary, #1f6feb);
}

.kline-card /deep/ .el-radio-button__inner {
  background: var(--button-default-bg, rgba(248, 251, 255, 0.94));
  border-color: var(--input-border, #cfdaea);
  color: var(--button-default-text, #274062);
}

.kline-card /deep/ .el-radio-button:first-child .el-radio-button__inner {
  border-left-color: var(--input-border, #cfdaea);
}

.kline-card /deep/ .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background: linear-gradient(135deg, var(--primary, #1f6feb) 0%, var(--primary-strong, #1557c0) 100%);
  border-color: var(--primary, #1f6feb);
  color: #f8fbff;
  box-shadow: none;
}

@media (max-width: 992px) {
  .kline-content {
    flex-direction: column;
  }

  .kline-chart-panel {
    border-right: none;
    padding-right: 0;
    border-bottom: 1px dashed var(--card-border, #d9e4f6);
    padding-bottom: 8px;
  }

  .kline-action-panel {
    padding-left: 0;
    padding-top: 6px;
  }
}

@media (max-width: 768px) {
  .kline-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .kline-tags {
    flex-wrap: wrap;
  }

  .kline-chart {
    height: 220px;
  }
}
</style>
