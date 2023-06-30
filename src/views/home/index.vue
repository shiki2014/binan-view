<template>
  <div>
    <el-row>
      <el-col :span="16">
        <el-statistic group-separator="," :precision="2" :value="data.length" title="当前仓位数量"></el-statistic>
        <el-collapse v-model="activeNames">
          <el-collapse-item v-for="item in data" :key="item.symbol" :title="item.symbol" :name="item.symbol">
            <div>方向: {{ item.positionSide === 'SHORT' ? '空头' : '多头'}}</div>
            <div>均价: {{ item.entryPrice }}</div>
            <div>杠杆: {{ item.leverage }}</div>
            <div>未实现利润: {{ item.unrealizedProfit }}</div>
          </el-collapse-item>
        </el-collapse>
      </el-col>
      <el-col :span="8">
        <div><el-button style="width:100%;" type="primary" @click="goLogErrorView">查看错误日志</el-button></div>
        <div><el-button style="width:100%;" type="primary" @click="goLogAppView">查看App日志</el-button></div>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { getPositions } from '@/api/api.js'

export default {
  data () {
    return {
      data: [],
      activeNames: []
    }
  },
  created () {
    getPositions().then(res => {
      this.data = res.data
    })
  },
  methods: {
    goLogErrorView () {
      // 查看错误日志
      this.$router.push('/errorLog')
    },
    goLogAppView () {
      // 查看错误日志
      this.$router.push('/appLog')
    }
  }
}
</script>

<style>

</style>
