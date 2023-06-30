<template>
  <div>
    <div class="logBox">{{ data }}</div>
  </div>
</template>

<script>
import { getErrorLog } from '@/api/api.js'

export default {
  data () {
    return {
      data: ''
    }
  },
  created () {
    getErrorLog().then(res => {
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
.textarea{
  color:#333;
}
</style>
