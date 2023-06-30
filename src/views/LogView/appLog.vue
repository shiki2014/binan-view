<template>
  <div>
    <div class="logBox">{{ data }}</div>
  </div>
</template>

<script>
import { getAppLog } from '@/api/api.js'

export default {
  data () {
    return {
      data: []
    }
  },
  created () {
    getAppLog().then(res => {
      this.data = res.data
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
  white-space: pre-wrap;
}
</style>
