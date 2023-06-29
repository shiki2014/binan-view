<template>
  <div>
    <div>这里显示数据{{ data }}</div>
    <div>所有仓位数据</div>
    <el-button type="primary" @click="goLogView">查看日志</el-button>
    <el-button type="primary">主要按钮</el-button>
    <el-button type="success">成功按钮</el-button>
    <el-button type="info">信息按钮</el-button>
    <el-button type="warning">警告按钮</el-button>
    <el-button type="danger">危险按钮</el-button>
    <div></div>
  </div>
</template>

<script>
import { getUsers, getData } from '@/api/api.js'

export default {
  data () {
    return {
      data: 1
    }
  },
  created () {
    getData().then(res => {
      this.data = res.data
    })
  },
  methods: {
    getData () {
      getUsers().then(res => {
        console.log(res)
        this.data = res.data
      }).catch()
    },
    goLogView () {
      // 查看日志
      this.$router.push('/log')
    }
  }
}
</script>

<style>

</style>
