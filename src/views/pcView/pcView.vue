<template>
  <div>
    金融分析工具
    指标
    <div class="left">
      这里是数据
      <div class="list">
        参数列表
      </div>
      <div>
        veli ui
      </div>
    </div>
    <div class="right">
      数据设置数据参数
    </div>

    <el-input
    type="textarea"
    autosize
    placeholder="请输入内容"
    v-model="textarea1">
  </el-input>
  </div>
</template>

<script>
export default {
  data () {
    return {
      textarea1: 'textarea1'
    }
  },
  mounted () {
    // 这里是用于计算标准差，平方差，以及其他选项的工具
  },
  methods: {

  }

}
</script>

<style>

</style>
