<template>
  <div>
    <div class="logBox">
      <div v-for="item in data" :key="item">{{item}}</div>
    </div>
  </div>
</template>

<script>
import { getLog } from '@/api/api.js'

export default {
  data () {
    return {
      data: []
    }
  },
  created () {
    getLog().then(res => {
      let logs = res.data.split('\n')
      this.data = logs
    })
  },
  methods: {
    getLog () {

    }
  }
}
</script>

<style scoped>
.logBox{
  text-align: left;
  padding:20px;
}
</style>
