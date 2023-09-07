<template>
  <div>
    <div class="header" :class="haveHeader ? 'active':''" @click="changeHeader">
      <div class="top flexBox">
        <el-button type="primary" @click="goLogErrorView">查看错误日志</el-button>
        <el-button type="primary" @click="goLogAppView">查看App日志</el-button>
        <i class="el-icon-arrow-down" style="margin-left:auto;"></i>
      </div>
      <div class="information">
        <el-row>
          <el-col :span="24">
            当前仓位数量: {{ data.length }}
          </el-col>
          <el-col :span="24">
            未实现利润: {{ unrealizedProfitAll }}
          </el-col>
        </el-row>
      </div>
    </div>
    <el-row class="content" :class="haveHeader ? 'active':''">
      <el-col :span="24">
        <el-collapse v-model="activeNames">
          <el-collapse-item v-for="item in data" :key="item.symbol" :title="item.symbol" :name="item.symbol">
            <div>方向: {{ item.positionSide === 'SHORT' ? '空头' : '多头'}}</div>
            <div>均价: {{ item.entryPrice }}</div>
            <div>杠杆: {{ item.leverage }}</div>
            <div>保证金: {{ item.isolatedWallet }}</div>
            <div>未实现利润: {{ item.unrealizedProfit }}</div>
          </el-collapse-item>
        </el-collapse>
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
      activeNames: [],
      unrealizedProfitAll: 0,
      haveHeader: false
    }
  },
  created () {
    getPositions().then(res => {
      this.data = res.data.sort((a,b) => {
        let nameA = a.symbol.toLowerCase(); // 将属性值转换为小写以进行不区分大小写的比较
        let nameB = b.symbol.toLowerCase();
        if (nameA < nameB) {
            return -1;
        } else if (nameA > nameB) {
            return 1;
        } else {
            return 0;
        }
      })
      let num = 0
      for (let i = 0; i < this.data.length; i++) {
        num += Number(this.data[i].unrealizedProfit)
      }
      this.unrealizedProfitAll = Number(num.toFixed(2))
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
    },
    changeHeader () {
      this.haveHeader = !this.haveHeader
    }
  }
}
</script>

<style scoped>
.main{
  display: flex;
  width:100vw;
  height: 100vh;
  overflow: hidden;
  flex-direction: column;
}
.header {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 2;
  height: 114px;
  width: 100%;
  background-color: #fff;
  box-shadow: 0px 5px 5px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease-in-out;
  padding:10px;
  overflow: hidden;
}
.header.active{
  height: 60px;
}
.content{
  transition: all 0.3s ease-in-out;
  height: 100%;
  margin-top: 114px;
}
.content.active{
  margin-top: 60px;
}
.information{
  transition: all 0.3s ease-in-out;
  margin-top:10px;
}
.header .top{
  align-items: center;
}
</style>
