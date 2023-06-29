<template>
  <div>
    <div>这里显示数据{{ data }}</div>
    <div>所有仓位数据</div>
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
    }
  }
}
</script>

<style>

</style>
