<template>
  <div class="control-page" :class="`theme-${themeMode}`">
    <div class="toolbar">
      <el-button type="primary" @click="switchToPositionTab">持仓与委托</el-button>
      <div class="theme-switch-pill">
        <div class="theme-switch-copy">
          <span class="theme-switch-title">{{ themeMode === 'dark' ? '夜间高对比' : '日间主题' }}</span>
          <span class="theme-switch-subtitle">切换界面配色</span>
        </div>
        <el-switch
          :value="themeMode === 'dark'"
          @change="setThemeMode"
          active-color="#69a8ff"
          inactive-color="#cfdced">
        </el-switch>
      </div>
      <el-button @click="loadAll" :loading="loading">刷新全部</el-button>
      <el-tag size="small" effect="plain">监控: {{ overview.status || '-' }}</el-tag>
      <el-tag size="small" :type="runtimeChainTagType">链路: {{ runtimeChainLabel }}</el-tag>
      <el-tag size="small" :type="settingsForm.trading_enabled ? 'success' : 'danger'">交易: {{ settingsForm.trading_enabled ? '开启' : '关闭' }}</el-tag>
      <el-tag size="small" :type="settingsForm.risk_control_enabled ? 'warning' : 'info'">风控: {{ settingsForm.risk_control_enabled ? '开启' : '关闭' }}</el-tag>
      <el-tag size="small" :type="tradingForm.trend_filter_enabled ? 'success' : 'danger'">趋势过滤: {{ tradingForm.trend_filter_enabled ? '开启' : '关闭' }}</el-tag>
      <el-tag size="small" :type="tradingModeTagType">模式: {{ tradingModeLabel }}</el-tag>
      <el-tag size="small" :type="settingsForm.emergency_stop_enabled ? 'danger' : 'success'">停机: {{ settingsForm.emergency_stop_enabled ? '启用' : '关闭' }}</el-tag>
    </div>

    <el-card shadow="never" class="section">
      <div slot="header" class="auth-card-header">
        <div class="auth-card-title">
          <span>身份与鉴权</span>
          <el-tag size="mini" :type="authStatusTagType">{{ authStatusText }}</el-tag>
        </div>
        <div class="auth-card-actions">
          <span class="inline-hint">{{ authSummaryText }}</span>
          <el-button type="text" size="mini" @click="toggleAuthPanel">{{ authPanelExpanded ? '收起' : '展开' }}</el-button>
        </div>
      </div>
      <el-collapse-transition>
        <div v-show="authPanelExpanded">
          <el-form :inline="true">
            <el-form-item label="Token">
              <el-input
                v-model="tokenInput"
                show-password
                placeholder="仅保存在当前浏览器 localStorage"
                style="width: 340px">
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveToken">保存Token</el-button>
              <el-button @click="removeToken">清空Token</el-button>
            </el-form-item>
            <el-form-item label="操作人">
              <el-input
                v-model="operatorInput"
                placeholder="例如: wu.junbao"
                style="width: 220px">
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" plain @click="saveOperator">保存操作人</el-button>
              <el-button @click="removeOperator">清空操作人</el-button>
            </el-form-item>
            <el-form-item label="高风险令牌">
              <el-input
                v-model="riskTokenInput"
                show-password
                placeholder="审批/维护时使用，仅保存在当前浏览器"
                style="width: 340px">
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" plain @click="saveRiskToken">保存令牌</el-button>
              <el-button @click="removeRiskToken">清空令牌</el-button>
            </el-form-item>
          </el-form>
          <div class="tips">配置变更会记录操作人和变更原因到审计日志；审批和维护动作可使用高风险令牌。</div>
          <div v-if="authStatus === 'missing'" class="tips tips-warning">当前浏览器尚未保存有效的 API Token，远程访问不会加载任何数据。</div>
          <div v-else-if="authStatus === 'failed'" class="tips tips-error">当前浏览器保存的 API Token 校验失败，请重新输入后点击“保存Token”。</div>
        </div>
      </el-collapse-transition>
    </el-card>

    <el-tabs v-model="activeTab" class="section">
      <el-tab-pane label="总览仪表盘" name="overview">
        <el-row :gutter="16" class="section">
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover">
              <div class="metric-title">持仓数量</div>
              <div class="metric-value">{{ snapshot.open_positions || 0 }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover">
              <div class="metric-title">风险比</div>
              <div class="metric-value">{{ toPercent(snapshot.risk_ratio) }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover">
              <div class="metric-title">未实现盈亏</div>
              <div
                class="metric-value small"
                :class="[numberClass(snapshot.unrealized_pnl), shouldFlashPnl(snapshot.unrealized_pnl) ? 'num-flash' : '']">
                {{ formatSignedNumber(snapshot.unrealized_pnl) }}
              </div>
              <div class="metric-sub">保证金: {{ formatSignedNumber(snapshot.margin_balance) }}</div>
            </el-card>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <el-card shadow="hover">
              <div class="metric-title">最新事件</div>
              <div class="metric-value small">{{ eventLabel }}</div>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" class="section">
          <el-col :xs="24" :md="12">
            <el-card shadow="never">
              <div slot="header">监控事件</div>
              <el-table :data="events" height="360" size="mini">
                <el-table-column prop="created_at" label="时间" width="160" :formatter="formatTableTime"></el-table-column>
                <el-table-column prop="category" label="类型" width="140"></el-table-column>
                <el-table-column label="级别" width="90">
                  <template slot-scope="scope">
                    <el-tag :type="tagType(scope.row.level)" size="mini">{{ scope.row.level }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="信息"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-card shadow="never">
              <div slot="header">风险快照</div>
              <el-table :data="snapshots" height="360" size="mini">
                <el-table-column prop="created_at" label="时间" width="160" :formatter="formatTableTime"></el-table-column>
                <el-table-column prop="open_positions" label="持仓数" width="80"></el-table-column>
                <el-table-column label="风险比" width="100">
                  <template slot-scope="scope">
                    {{ toPercent(scope.row.risk_ratio) }}
                  </template>
                </el-table-column>
                <el-table-column label="未实现盈亏" width="120">
                  <template slot-scope="scope">
                    <span
                      :class="[numberClass(scope.row.unrealized_pnl), shouldFlashPnl(scope.row.unrealized_pnl) ? 'num-flash' : '']">
                      {{ formatSignedNumber(scope.row.unrealized_pnl) }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="margin_balance" label="保证金" width="110"></el-table-column>
                <el-table-column prop="position_notional" label="持仓名义"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>

        <el-row :gutter="16" class="section">
          <el-col :xs="24">
            <el-card shadow="never">
              <div slot="header" class="margin-chart-header">
                <div class="margin-chart-header-left">
                  <span>保证金趋势</span>
                  <span class="inline-hint">默认近一个月，支持全部范围</span>
                </div>
                <div class="margin-chart-header-controls">
                  <el-select
                    v-model="marginRange"
                    size="mini"
                    style="width: 140px"
                    :disabled="marginLoading"
                    @change="handleMarginRangeChange">
                    <el-option label="近7天" value="7d"></el-option>
                    <el-option label="近1个月" value="30d"></el-option>
                    <el-option label="近3个月" value="90d"></el-option>
                    <el-option label="全部范围" value="all"></el-option>
                  </el-select>
                  <el-tag v-if="marginLoading" size="mini" type="info">加载中</el-tag>
                </div>
              </div>
              <div ref="marginChart" class="margin-chart"></div>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never" class="section">
          <div slot="header">运行与安全状态</div>
          <div class="status-grid">
            <div class="status-item">
              <span class="status-label">交易模式</span>
              <span class="status-value">{{ tradingModeLabel }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">实盘确认</span>
              <span class="status-value">{{ securityStatus.liveTradingConfirmed ? '已确认' : '未确认' }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">API Token</span>
              <span class="status-value">{{ securityStatus.apiTokenConfigured ? '已配置' : '未配置' }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">IP 白名单</span>
              <span class="status-value">{{ securityStatus.ipWhitelistConfigured ? '已启用' : '未启用' }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">接口限流</span>
              <span class="status-value">{{ securityStatus.rateLimitEnabled ? '已启用' : '未启用' }}</span>
            </div>
            <div class="status-item">
              <span class="status-label">高风险确认</span>
              <span class="status-value">{{ highRiskRequirementLabel }}</span>
            </div>
          </div>
          <div class="maintenance-panel">
            <div>
              <div class="status-label">最近维护任务</div>
              <div class="maintenance-summary">
                {{ lastMaintenanceSummary }}
              </div>
            </div>
            <el-tag size="small" :type="lastMaintenanceTagType">{{ lastMaintenanceStatusText }}</el-tag>
          </div>
        </el-card>
      </el-tab-pane>

      <el-tab-pane label="持仓与委托" name="position-order">
        <div class="section">
          <el-button size="mini" @click="loadPositionsAndOrders" :loading="positionOrderLoading">刷新持仓/委托</el-button>
          <el-select
            v-model="positionSortProp"
            size="mini"
            style="width: 140px; margin-left: 8px"
            @change="onPositionSortOptionChange">
            <el-option label="按交易对" value="symbol"></el-option>
            <el-option label="按未实现盈亏" value="unrealizedProfit"></el-option>
            <el-option label="按开仓价" value="entryPrice"></el-option>
            <el-option label="按数量" value="positionAmt"></el-option>
          </el-select>
          <el-select
            v-model="positionSortOrder"
            size="mini"
            style="width: 120px; margin-left: 8px"
            @change="onPositionSortOptionChange">
            <el-option label="升序" value="ascending"></el-option>
            <el-option label="降序" value="descending"></el-option>
          </el-select>
          <span class="inline-hint">当前持仓 {{ positions.length }}，当前挂单 {{ openOrders.length }}</span>
        </div>

        <el-row :gutter="16" class="section">
          <el-col :xs="24" :md="12">
            <el-card shadow="never">
              <div slot="header">持仓列表</div>
              <el-table
                :data="sortedPositions"
                :height="positionOrderTableHeight"
                size="mini"
                @sort-change="onPositionSortChange">
                <el-table-column prop="symbol" label="交易对" width="120" sortable="custom"></el-table-column>
                <el-table-column prop="positionSide" label="方向" width="80"></el-table-column>
                <el-table-column prop="entryPrice" label="开仓价" width="90" sortable="custom"></el-table-column>
                <el-table-column prop="positionAmt" label="数量" width="90" sortable="custom"></el-table-column>
                <el-table-column prop="unrealizedProfit" label="未实现盈亏" sortable="custom">
                  <template slot-scope="scope">
                    <span
                      :class="[numberClass(scope.row.unrealizedProfit), shouldFlashPnl(scope.row.unrealizedProfit) ? 'num-flash' : '']">
                      {{ formatSignedNumber(scope.row.unrealizedProfit) }}
                    </span>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-card shadow="never">
              <div slot="header">挂单列表（普通单 + 条件单）</div>
              <el-table :data="openOrders" :height="positionOrderTableHeight" size="mini">
                <el-table-column prop="symbol" label="交易对" width="120"></el-table-column>
                <el-table-column prop="source" label="来源" width="70"></el-table-column>
                <el-table-column prop="type" label="类型" width="110"></el-table-column>
                <el-table-column prop="side" label="方向" width="70"></el-table-column>
                <el-table-column prop="positionSide" label="持仓方向" width="90"></el-table-column>
                <el-table-column prop="stopPrice" label="触发价" width="90"></el-table-column>
                <el-table-column prop="status" label="状态"></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never" class="section">
          <div slot="header">仓位 K线总览（懒加载）</div>
          <div class="section">
            <el-button size="mini" @click="resetKlineCardWindow">重置显示</el-button>
            <span class="inline-hint">每张卡片可独立切换日线/小时线</span>
            <el-switch
              v-model="klineWheelZoomEnabled"
              active-text="滚轮缩放开"
              inactive-text="滚轮缩放关"
              style="margin-left: 8px">
            </el-switch>
            <span class="inline-hint">当前展示 {{ visibleKlinePositions.length }}/{{ sortedPositions.length }} 张卡片</span>
          </div>
          <div
            ref="klineCardList"
            class="kline-card-list"
            :style="{ height: `${klineListHeight}px` }"
            @scroll.passive="onKlineCardScroll">
            <kline-position-card
              v-for="item in visibleKlinePositions"
              :key="`${item.symbol}_${item.positionSide}`"
              :position="item"
              :default-interval="defaultKlineInterval"
              :wheel-zoom-enabled="klineWheelZoomEnabled"
              :open-orders="openOrders"
              @action="onKlineCardAction"
              :theme-mode="themeMode">
            </kline-position-card>
            <div class="kline-list-footer">
              <span v-if="hasMoreKlineCards">下拉加载更多仓位K线...</span>
              <span v-else-if="visibleKlinePositions.length">已加载全部仓位K线</span>
              <span v-else>当前无持仓</span>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="日志与审计" name="logs">
        <div class="section">
          <div class="log-toolbar">
            <el-button size="mini" @click="refreshLogsAndAudits" :loading="logsLoading || auditLoading">刷新日志与审计</el-button>
            <el-switch
              v-model="logAutoRefreshEnabled"
              active-text="自动刷新开"
              inactive-text="自动刷新关">
            </el-switch>
            <el-select
              v-model="logAutoRefreshSeconds"
              size="mini"
              style="width: 120px"
              :disabled="!logAutoRefreshEnabled">
              <el-option label="15秒" :value="15"></el-option>
              <el-option label="30秒" :value="30"></el-option>
              <el-option label="60秒" :value="60"></el-option>
              <el-option label="120秒" :value="120"></el-option>
            </el-select>
            <span class="inline-hint">日志与审计预览仅显示最新 80 行；完整列表支持日期范围筛选，错误日志可切换数据库、原始文件或 PM2 原始流。</span>
          </div>
        </div>

        <el-row :gutter="16" class="section">
          <el-col :xs="24" :md="12">
            <el-card shadow="never">
              <div slot="header" class="log-card-header">
                <span>应用日志预览</span>
                <div class="log-card-actions">
                  <el-select
                    v-model="appLogLevelFilter"
                    size="mini"
                    clearable
                    placeholder="全部级别"
                    class="log-filter-select">
                    <el-option label="全部级别" value=""></el-option>
                    <el-option label="info" value="info"></el-option>
                    <el-option label="warn" value="warn"></el-option>
                    <el-option label="error" value="error"></el-option>
                  </el-select>
                  <el-input
                    v-model.trim="appLogKeyword"
                    size="mini"
                    clearable
                    placeholder="搜索内容/来源"
                    class="log-filter-input">
                  </el-input>
                  <el-date-picker
                    v-model="appLogDateRange"
                    size="mini"
                    clearable
                    unlink-panels
                    type="daterange"
                    value-format="yyyy-MM-dd"
                    format="yyyy-MM-dd"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    class="log-filter-date">
                  </el-date-picker>
                  <el-button size="mini" type="text" @click="openLogDialog('app')">查看全部</el-button>
                </div>
              </div>
              <el-table :data="appLogPreviewRows" size="mini" height="320" class="log-table">
                <el-table-column prop="timestamp" label="时间" width="170" show-overflow-tooltip></el-table-column>
                <el-table-column prop="level" label="级别" width="80">
                  <template slot-scope="scope">
                    <el-tag :type="tagType(scope.row.level)" size="mini">{{ scope.row.level || '-' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="source" label="来源" width="110" show-overflow-tooltip></el-table-column>
                <el-table-column prop="message" label="内容" show-overflow-tooltip></el-table-column>
              </el-table>
            </el-card>
          </el-col>
          <el-col :xs="24" :md="12">
            <el-card shadow="never">
              <div slot="header" class="log-card-header">
                <span>错误日志预览</span>
                <div class="log-card-actions">
                  <el-select
                    v-model="errorLogLevelFilter"
                    size="mini"
                    clearable
                    placeholder="全部级别"
                    class="log-filter-select">
                    <el-option label="全部级别" value=""></el-option>
                    <el-option label="info" value="info"></el-option>
                    <el-option label="warn" value="warn"></el-option>
                    <el-option label="error" value="error"></el-option>
                  </el-select>
                  <el-input
                    v-model.trim="errorLogKeyword"
                    size="mini"
                    clearable
                    placeholder="搜索内容/来源"
                    class="log-filter-input">
                  </el-input>
                  <el-select
                    v-model="errorLogSource"
                    size="mini"
                    class="log-filter-select log-source-select">
                    <el-option label="原始文件" value="file"></el-option>
                    <el-option label="数据库" value="db"></el-option>
                    <el-option label="PM2 原始流" value="pm2"></el-option>
                  </el-select>
                  <el-date-picker
                    v-model="errorLogDateRange"
                    size="mini"
                    clearable
                    unlink-panels
                    type="daterange"
                    value-format="yyyy-MM-dd"
                    format="yyyy-MM-dd"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    class="log-filter-date"
                    :disabled="errorLogDateRangeDisabled">
                  </el-date-picker>
                  <el-button size="mini" type="text" @click="openLogDialog('error')">查看全部</el-button>
                </div>
              </div>
              <el-table :data="errorLogPreviewRows" size="mini" height="320" class="log-table">
                <el-table-column prop="timestamp" label="时间" width="170" show-overflow-tooltip></el-table-column>
                <el-table-column prop="level" label="级别" width="80">
                  <template slot-scope="scope">
                    <el-tag :type="tagType(scope.row.level)" size="mini">{{ scope.row.level || '-' }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="source" label="来源" width="110" show-overflow-tooltip></el-table-column>
                <el-table-column prop="message" label="内容" show-overflow-tooltip></el-table-column>
              </el-table>
            </el-card>
          </el-col>
        </el-row>

        <el-card shadow="never" class="section">
          <div slot="header" class="log-card-header">
            <span>操作审计预览</span>
            <div class="log-card-actions">
              <el-select
                v-model="auditActorFilter"
                size="mini"
                clearable
                placeholder="全部操作者"
                class="audit-filter-select">
                <el-option label="全部操作者" value=""></el-option>
                <el-option
                  v-for="item in auditActorOptions"
                  :key="item"
                  :label="item"
                  :value="item">
                </el-option>
              </el-select>
              <el-input
                v-model.trim="auditKeyword"
                size="mini"
                clearable
                placeholder="搜索动作/目标/原因"
                class="log-filter-input">
              </el-input>
              <el-button size="mini" type="text" @click="auditDialogVisible = true">查看全部</el-button>
            </div>
          </div>
          <el-table :data="auditPreviewRows" size="mini" height="320" @row-click="openAuditDetail">
            <el-table-column prop="created_at" label="时间" width="160" :formatter="formatTableTime"></el-table-column>
            <el-table-column prop="action" label="动作" width="190"></el-table-column>
            <el-table-column prop="target" label="目标" width="170"></el-table-column>
            <el-table-column prop="actor" label="操作者" width="120"></el-table-column>
            <el-table-column label="变更原因" width="180">
              <template slot-scope="scope">
                <span>{{ getAuditReason(scope.row) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="变更摘要">
              <template slot-scope="scope">
                <span class="audit-summary">{{ summarizeAudit(scope.row) }}</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
      <el-tab-pane label="策略与风控" name="strategy">
        <el-card shadow="never" class="section">
          <div slot="header">策略开关与风控参数</div>
          <el-form :inline="true" label-width="140px">
            <el-form-item label="交易开关">
              <el-switch v-model="settingsForm.trading_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="风险控制">
              <el-switch v-model="settingsForm.risk_control_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="监控开关">
              <el-switch v-model="settingsForm.monitor_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="风险阈值">
              <el-input-number
                v-model="settingsForm.max_risk_ratio"
                :precision="2"
                :step="0.1"
                :min="0.1"
                :max="20">
              </el-input-number>
            </el-form-item>
            <el-form-item label="监控间隔(秒)">
              <el-input-number
                v-model="settingsForm.monitor_interval_seconds"
                :step="10"
                :min="10"
                :max="3600">
              </el-input-number>
            </el-form-item>
            <el-form-item label="主链路模式">
              <el-select v-model="settingsForm.runtime_primary_chain" style="width: 140px">
                <el-option value="file" label="file"></el-option>
                <el-option value="db" label="db"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="紧急回滚(file)">
              <el-switch v-model="settingsForm.runtime_force_file_rollback"></el-switch>
            </el-form-item>
            <el-form-item label="紧急停机">
              <el-switch v-model="settingsForm.emergency_stop_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="实盘强制确认">
              <el-switch v-model="settingsForm.live_trade_confirm_required"></el-switch>
            </el-form-item>
            <el-form-item label="数据清理任务">
              <el-switch v-model="settingsForm.data_retention_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="盈亏闪烁阈值">
              <el-input-number
                v-model="settingsForm.pnl_flash_threshold"
                :step="10"
                :min="1"
                :max="1000000">
              </el-input-number>
            </el-form-item>
            <el-form-item label="告警开关">
              <el-switch v-model="settingsForm.alert_webhook_enabled"></el-switch>
            </el-form-item>
            <el-form-item label="最低告警级别">
              <el-select v-model="settingsForm.alert_min_level" style="width: 120px">
                <el-option value="info" label="info"></el-option>
                <el-option value="warn" label="warn"></el-option>
                <el-option value="error" label="error"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="告警Webhook">
              <el-input
                v-model="settingsForm.alert_webhook_url"
                placeholder="https://example.com/webhook"
                style="width: 380px">
              </el-input>
            </el-form-item>
            <el-form-item label="日志保留(天)">
              <el-input-number
                v-model="settingsForm.log_retention_days"
                :step="1"
                :min="1"
                :max="3650">
              </el-input-number>
            </el-form-item>
            <el-form-item label="快照保留(天)">
              <el-input-number
                v-model="settingsForm.snapshot_retention_days"
                :step="1"
                :min="1"
                :max="3650">
              </el-input-number>
            </el-form-item>
            <el-form-item label="事件保留(天)">
              <el-input-number
                v-model="settingsForm.event_retention_days"
                :step="1"
                :min="1"
                :max="3650">
              </el-input-number>
            </el-form-item>
            <el-form-item label="审计保留(天)">
              <el-input-number
                v-model="settingsForm.audit_retention_days"
                :step="1"
                :min="1"
                :max="3650">
              </el-input-number>
            </el-form-item>
            <el-form-item label="订单保留(天)">
              <el-input-number
                v-model="settingsForm.trade_order_retention_days"
                :step="1"
                :min="1"
                :max="3650">
              </el-input-number>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="openConfirm('settings')">提交策略风控申请</el-button>
              <el-button :loading="alertTesting" @click="testAlert">测试告警</el-button>
              <el-button :loading="reconciling" @click="runReconciliation">执行对账</el-button>
              <el-button :loading="maintenanceRunning" @click="runMaintenance">执行维护</el-button>
            </el-form-item>
          </el-form>
          <div class="tips">
            维护任务会归档旧 JSON / 文件日志，并按保留期清理数据库历史记录。
          </div>
        </el-card>

        <el-card shadow="never" class="section">
          <div slot="header">交易参数（数据库）</div>
          <el-form :inline="true" label-width="140px">
            <el-form-item label="最小名义价值">
              <el-input-number
                v-model="tradingForm.min_order_notional"
                :precision="2"
                :step="1"
                :min="1"
                :max="1000">
              </el-input-number>
            </el-form-item>
            <el-form-item label="止损缓冲比例">
              <el-input-number
                v-model="tradingForm.stop_trigger_buffer"
                :precision="4"
                :step="0.0005"
                :min="0.0001"
                :max="0.1">
              </el-input-number>
            </el-form-item>
            <el-form-item label="最大加仓比例">
              <el-input-number
                v-model="tradingForm.max_add_order_ratio"
                :precision="2"
                :step="0.1"
                :min="0"
                :max="1">
              </el-input-number>
            </el-form-item>
            <el-form-item label="单笔限额">
              <el-input-number
                v-model="tradingForm.single_order_notional_limit"
                :precision="2"
                :step="10"
                :min="1"
                :max="1000000">
              </el-input-number>
            </el-form-item>
            <el-form-item label="日内限额">
              <el-input-number
                v-model="tradingForm.daily_order_notional_limit"
                :precision="2"
                :step="50"
                :min="1"
                :max="100000000">
              </el-input-number>
            </el-form-item>
            <el-form-item label="最大持仓限额">
              <el-input-number
                v-model="tradingForm.max_position_notional_limit"
                :precision="2"
                :step="50"
                :min="1"
                :max="100000000">
              </el-input-number>
            </el-form-item>
            <div class="trend-filter-panel">
              <div class="trend-filter-header">
                <div>
                  <div class="trend-filter-title">趋势方向过滤</div>
                  <div class="trend-filter-subtitle">
                    {{ trendFilterRuleText }}
                  </div>
                </div>
                <div class="trend-filter-status">
                  <el-tag size="mini" :type="tradingForm.trend_filter_enabled ? 'success' : 'danger'">
                    {{ tradingForm.trend_filter_enabled ? '已开启' : '已关闭' }}
                  </el-tag>
                  <el-tag size="mini" :type="canEditTrendFilter ? 'success' : 'warning'">
                    {{ trendFilterPermissionText }}
                  </el-tag>
                </div>
              </div>
              <div class="tips tips-warning" v-if="!canEditTrendFilter">
                趋势过滤属于高风险交易参数。{{ trendFilterPermissionHelp }}
              </div>
              <el-form-item label="趋势过滤开关">
                <el-switch
                  v-model="tradingForm.trend_filter_enabled"
                  :disabled="!canEditTrendFilter"
                  active-text="开启"
                  inactive-text="关闭">
                </el-switch>
              </el-form-item>
              <el-form-item label="K线周期">
                <el-select
                  v-model="tradingForm.trend_filter_timeframe"
                  :disabled="!canEditTrendFilter"
                  style="width: 110px">
                  <el-option value="1d" label="日线"></el-option>
                  <el-option value="1h" label="小时线"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="均线类型">
                <el-select
                  v-model="tradingForm.trend_filter_ma_type"
                  :disabled="!canEditTrendFilter"
                  style="width: 110px">
                  <el-option value="EMA" label="EMA"></el-option>
                  <el-option value="SMA" label="SMA"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="快线周期">
                <el-input-number
                  v-model="tradingForm.trend_filter_fast_period"
                  :disabled="!canEditTrendFilter"
                  :step="1"
                  :min="2"
                  :max="500">
                </el-input-number>
              </el-form-item>
              <el-form-item label="慢线周期">
                <el-input-number
                  v-model="tradingForm.trend_filter_slow_period"
                  :disabled="!canEditTrendFilter"
                  :step="1"
                  :min="3"
                  :max="500">
                </el-input-number>
              </el-form-item>
              <el-form-item label="斜率回看">
                <el-input-number
                  v-model="tradingForm.trend_filter_slope_lookback"
                  :disabled="!canEditTrendFilter"
                  :step="1"
                  :min="1"
                  :max="100">
                </el-input-number>
              </el-form-item>
              <el-form-item label="防抖比例">
                <el-input-number
                  v-model="tradingForm.trend_filter_deadband_pct"
                  :disabled="!canEditTrendFilter"
                  :precision="4"
                  :step="0.0005"
                  :min="0"
                  :max="0.05">
                </el-input-number>
              </el-form-item>
              <el-form-item label="中性趋势">
                <el-select
                  v-model="tradingForm.trend_filter_neutral_policy"
                  :disabled="!canEditTrendFilter"
                  style="width: 120px">
                  <el-option value="allow" label="允许"></el-option>
                  <el-option value="block" label="禁止"></el-option>
                </el-select>
              </el-form-item>
              <el-form-item label="异常处理">
                <el-select
                  v-model="tradingForm.trend_filter_fail_mode"
                  :disabled="!canEditTrendFilter"
                  style="width: 120px">
                  <el-option value="block" label="禁止开仓"></el-option>
                  <el-option value="allow" label="允许开仓"></el-option>
                </el-select>
              </el-form-item>
            </div>
            <el-form-item>
              <el-button type="primary" :loading="tradingSaving" @click="openConfirm('trading')">提交交易参数申请</el-button>
            </el-form-item>
          </el-form>
          <div class="tips">单笔、日内、最大持仓限额和趋势方向过滤都会在真实下单前进行拦截。</div>
        </el-card>

        <el-card shadow="never" class="section">
          <div slot="header">变更申请审批流</div>
          <div class="section">
            <el-select
              v-model="changeRequestStatus"
              size="mini"
              style="width: 170px"
              placeholder="状态筛选"
              @change="loadChangeRequests">
              <el-option label="全部状态" value=""></el-option>
              <el-option label="待审批" value="pending"></el-option>
              <el-option label="已执行" value="applied"></el-option>
              <el-option label="已驳回" value="rejected"></el-option>
              <el-option label="执行失败" value="failed"></el-option>
            </el-select>
            <el-button size="mini" @click="loadChangeRequests" :loading="changeRequestLoading">刷新申请列表</el-button>
            <span class="inline-hint">提交后需审批通过才会真正生效。</span>
          </div>
          <el-table
            :data="changeRequests"
            size="mini"
            height="320"
            row-key="id"
            border
            stripe
            class="change-request-table"
            v-loading="changeRequestLoading">
            <el-table-column prop="id" label="ID" width="68"></el-table-column>
            <el-table-column label="类型" width="140">
              <template slot-scope="scope">
                {{ getRequestTypeLabel(scope.row.request_type) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="95">
              <template slot-scope="scope">
                <el-tag :type="getRequestStatusType(scope.row.status)" size="mini">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="requested_by" label="申请人" width="110"></el-table-column>
            <el-table-column prop="reason" label="申请原因" min-width="170" show-overflow-tooltip></el-table-column>
            <el-table-column label="变更字段" min-width="150" show-overflow-tooltip>
              <template slot-scope="scope">
                <span>{{ getRequestKeys(scope.row) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="reviewed_by" label="审批人" width="110"></el-table-column>
            <el-table-column prop="review_comment" label="审批备注" min-width="130" show-overflow-tooltip></el-table-column>
            <el-table-column prop="created_at" label="申请时间" width="160" :formatter="formatTableTime"></el-table-column>
            <el-table-column label="操作" width="170">
              <template slot-scope="scope">
                <template v-if="scope.row.status === 'pending'">
                  <el-button
                    size="mini"
                    type="success"
                    :loading="reviewingRequestId === `approve_${scope.row.id}`"
                    @click="approveRequest(scope.row)">
                    通过
                  </el-button>
                  <el-button
                    size="mini"
                    type="danger"
                    plain
                    :loading="reviewingRequestId === `reject_${scope.row.id}`"
                    @click="rejectRequest(scope.row)">
                    驳回
                  </el-button>
                </template>
                <span v-else>-</span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <el-dialog
      title="配置变更确认"
      :visible.sync="confirmDialogVisible"
      width="520px"
      :close-on-click-modal="false">
      <div class="confirm-desc">{{ confirmDescription }}</div>
      <el-input
        type="textarea"
        :rows="4"
        v-model="confirmReason"
        placeholder="请输入变更原因（至少 4 个字）">
      </el-input>
      <span slot="footer" class="dialog-footer">
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="confirmSubmitting" @click="runConfirmedAction">确认执行</el-button>
      </span>
    </el-dialog>

    <el-dialog
      :title="logDialogTitle"
      :visible.sync="logDialogVisible"
      width="88%"
      top="5vh">
      <div class="log-dialog-toolbar">
        <el-select
          v-if="logDialogType === 'error'"
          v-model="errorLogSource"
          size="mini"
          class="log-filter-select log-source-select">
          <el-option label="原始文件" value="file"></el-option>
          <el-option label="数据库" value="db"></el-option>
          <el-option label="PM2 原始流" value="pm2"></el-option>
        </el-select>
        <el-select
          v-model="activeLogLevelFilter"
          size="mini"
          clearable
          placeholder="全部级别"
          class="log-filter-select">
          <el-option label="全部级别" value=""></el-option>
          <el-option label="info" value="info"></el-option>
          <el-option label="warn" value="warn"></el-option>
          <el-option label="error" value="error"></el-option>
        </el-select>
        <el-input
          v-model.trim="activeLogKeyword"
          size="mini"
          clearable
          placeholder="搜索时间/来源/内容/原始日志"
          class="log-filter-input log-filter-input-wide">
        </el-input>
        <el-date-picker
          v-model="activeLogDateRange"
          size="mini"
          clearable
          unlink-panels
          type="daterange"
          value-format="yyyy-MM-dd"
          format="yyyy-MM-dd"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="log-filter-date log-filter-date-wide"
          :disabled="activeLogDateRangeDisabled">
        </el-date-picker>
        <el-button size="mini" @click="refreshActiveLogDialog" :loading="logDialogLoading">刷新完整日志</el-button>
        <el-tag v-if="activeLogSourceHint" size="mini" effect="plain">{{ activeLogSourceHint }}</el-tag>
        <el-tag size="mini" effect="plain">共 {{ activeLogRows.length }} 条</el-tag>
      </div>
      <el-table :data="activeLogRows" size="mini" height="560" class="log-table" @row-click="openLogDetail" v-loading="logDialogLoading">
        <el-table-column prop="timestamp" label="时间" width="185" show-overflow-tooltip></el-table-column>
        <el-table-column prop="level" label="级别" width="90">
          <template slot-scope="scope">
            <el-tag :type="tagType(scope.row.level)" size="mini">{{ scope.row.level || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column prop="message" label="内容" show-overflow-tooltip></el-table-column>
        <el-table-column prop="raw" label="原始日志" min-width="320" show-overflow-tooltip></el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog
      title="操作审计"
      :visible.sync="auditDialogVisible"
      width="88%"
      top="5vh">
      <div class="log-dialog-toolbar">
        <el-select
          v-model="auditActorFilter"
          size="mini"
          clearable
          placeholder="全部操作者"
          class="audit-filter-select">
          <el-option label="全部操作者" value=""></el-option>
          <el-option
            v-for="item in auditActorOptions"
            :key="item"
            :label="item"
            :value="item">
          </el-option>
        </el-select>
        <el-input
          v-model.trim="auditKeyword"
          size="mini"
          clearable
          placeholder="搜索时间/动作/目标/操作者/原因"
          class="log-filter-input log-filter-input-wide">
        </el-input>
        <el-tag size="mini" effect="plain">共 {{ filteredAuditRows.length }} 条</el-tag>
      </div>
      <el-table :data="filteredAuditRows" size="mini" height="560" @row-click="openAuditDetail">
        <el-table-column prop="created_at" label="时间" width="180" show-overflow-tooltip :formatter="formatTableTime"></el-table-column>
        <el-table-column prop="action" label="动作" width="190" show-overflow-tooltip></el-table-column>
        <el-table-column prop="target" label="目标" width="180" show-overflow-tooltip></el-table-column>
        <el-table-column prop="actor" label="操作者" width="120" show-overflow-tooltip></el-table-column>
        <el-table-column label="变更原因" width="220" show-overflow-tooltip>
          <template slot-scope="scope">
            <span>{{ getAuditReason(scope.row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="变更摘要" min-width="260" show-overflow-tooltip>
          <template slot-scope="scope">
            <span class="audit-summary">{{ summarizeAudit(scope.row) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-drawer
      :title="detailDrawerTitle"
      :visible.sync="detailDrawerVisible"
      direction="rtl"
      size="42%">
      <div v-if="detailDrawerType === 'log' && detailDrawerRow" class="detail-drawer-body">
        <div class="detail-meta-grid">
          <div><span class="detail-label">时间</span><span>{{ detailDrawerRow.timestamp || '-' }}</span></div>
          <div><span class="detail-label">级别</span><span>{{ detailDrawerRow.level || '-' }}</span></div>
          <div><span class="detail-label">来源</span><span>{{ detailDrawerRow.source || '-' }}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-label">内容</div>
          <pre class="detail-pre">{{ detailDrawerRow.message || '-' }}</pre>
        </div>
        <div class="detail-section">
          <div class="detail-label">原始日志</div>
          <pre class="detail-pre">{{ detailDrawerRow.raw || '-' }}</pre>
        </div>
      </div>
      <div v-else-if="detailDrawerType === 'audit' && detailDrawerRow" class="detail-drawer-body">
        <div class="detail-meta-grid">
          <div><span class="detail-label">时间</span><span>{{ formatDisplayTime(detailDrawerRow.created_at) }}</span></div>
          <div><span class="detail-label">动作</span><span>{{ detailDrawerRow.action || '-' }}</span></div>
          <div><span class="detail-label">目标</span><span>{{ detailDrawerRow.target || '-' }}</span></div>
          <div><span class="detail-label">操作者</span><span>{{ detailDrawerRow.actor || '-' }}</span></div>
          <div><span class="detail-label">原因</span><span>{{ getAuditReason(detailDrawerRow) }}</span></div>
        </div>
        <div class="detail-section">
          <div class="detail-label">变更摘要</div>
          <pre class="detail-pre">{{ summarizeAudit(detailDrawerRow) }}</pre>
        </div>
        <div class="detail-section">
          <div class="detail-label">变更前</div>
          <pre class="detail-pre">{{ formatJson(detailDrawerRow.before_data) }}</pre>
        </div>
        <div class="detail-section">
          <div class="detail-label">变更后</div>
          <pre class="detail-pre">{{ formatJson(detailDrawerRow.after_data) }}</pre>
        </div>
        <div class="detail-section">
          <div class="detail-label">元数据</div>
          <pre class="detail-pre">{{ formatJson(detailDrawerRow.metadata) }}</pre>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script>
import {
  getSystemOverview,
  getSystemSettings,
  getTradingParams,
  getSystemEvents,
  getSystemSnapshots,
  getSystemAudits,
  sendTestAlert,
  runSystemReconciliation,
  runSystemMaintenance,
  createChangeRequest,
  getChangeRequests,
  approveChangeRequest,
  rejectChangeRequest,
  getPositions,
  getOpenOrders,
  getAppLog,
  getErrorLog,
  setApiToken,
  clearApiToken,
  setOperatorName,
  clearOperatorName,
  setRiskToken,
  clearRiskToken
} from '@/api/api.js'
import * as echarts from 'echarts'
import KlinePositionCard from '@/components/KlinePositionCard.vue'

export default {
  components: {
    KlinePositionCard
  },
  data () {
    return {
      activeTab: 'overview',
      loading: false,
      saving: false,
      tradingSaving: false,
      alertTesting: false,
      reconciling: false,
      maintenanceRunning: false,
      marginLoading: false,
      positionOrderLoading: false,
      logsLoading: false,
      auditLoading: false,
      logsInitialized: false,
      logDialogLoading: false,
      logDialogDataLoaded: false,
      confirmDialogVisible: false,
      logDialogVisible: false,
      auditDialogVisible: false,
      logDialogType: 'app',
      detailDrawerVisible: false,
      detailDrawerType: 'log',
      detailDrawerRow: null,
      confirmSubmitting: false,
      pendingAction: '',
      confirmReason: '',
      changeRequestLoading: false,
      reviewingRequestId: '',
      changeRequestStatus: '',
      overview: {},
      events: [],
      snapshots: [],
      marginSnapshots: [],
      audits: [],
      changeRequests: [],
      positions: [],
      openOrders: [],
      positionSortProp: 'symbol',
      positionSortOrder: 'ascending',
      positionOrderTableHeight: 700,
      klineListHeight: 700,
      klineWheelZoomEnabled: false,
      defaultKlineInterval: '1d',
      visibleKlineCardCount: 4,
      klineCardBatchSize: 3,
      appLogText: '',
      errorLogText: '',
      appLogDialogText: '',
      errorLogDialogText: '',
      appLogDateRange: [],
      errorLogDateRange: [],
      appLogLevelFilter: '',
      errorLogLevelFilter: '',
      appLogKeyword: '',
      errorLogKeyword: '',
      errorLogSource: 'db',
      auditActorFilter: '',
      auditKeyword: '',
      logAutoRefreshEnabled: false,
      logAutoRefreshSeconds: 30,
      settingsForm: {
        trading_enabled: true,
        risk_control_enabled: true,
        monitor_enabled: true,
        max_risk_ratio: 3,
        monitor_interval_seconds: 60,
        runtime_primary_chain: 'db',
        runtime_force_file_rollback: false,
        emergency_stop_enabled: false,
        live_trade_confirm_required: true,
        data_retention_enabled: true,
        pnl_flash_threshold: 100,
        alert_webhook_enabled: false,
        alert_webhook_url: '',
        alert_min_level: 'error',
        log_retention_days: 14,
        snapshot_retention_days: 30,
        event_retention_days: 30,
        audit_retention_days: 180,
        trade_order_retention_days: 180
      },
      tradingForm: {
        min_order_notional: 5,
        stop_trigger_buffer: 0.001,
        max_add_order_ratio: 1,
        single_order_notional_limit: 200,
        daily_order_notional_limit: 2000,
        max_position_notional_limit: 1000,
        trend_filter_enabled: true,
        trend_filter_timeframe: '1d',
        trend_filter_ma_type: 'EMA',
        trend_filter_fast_period: 20,
        trend_filter_slow_period: 60,
        trend_filter_slope_lookback: 5,
        trend_filter_deadband_pct: 0.002,
        trend_filter_neutral_policy: 'allow',
        trend_filter_fail_mode: 'block'
      },
      lastLoadedTradingForm: {},
      authPanelExpanded: true,
      authPanelUserToggled: false,
      authStatus: 'missing',
      tokenInput: '',
      operatorInput: '',
      riskTokenInput: '',
      themeMode: 'dark',
      marginRange: '30d',
      marginChart: null,
      refreshTimer: null,
      logRefreshTimer: null
    }
  },
  computed: {
    sortedPositions () {
      const list = Array.isArray(this.positions) ? this.positions.slice() : []
      const prop = String(this.positionSortProp || 'symbol')
      const order = String(this.positionSortOrder || 'ascending')
      const factor = order === 'descending' ? -1 : 1
      const numericProps = ['entryPrice', 'positionAmt', 'unrealizedProfit', 'isolatedWallet', 'leverage']
      list.sort((a, b) => {
        if (numericProps.includes(prop)) {
          const av = Number(a[prop] || 0)
          const bv = Number(b[prop] || 0)
          if (av === bv) return 0
          return av > bv ? factor : -factor
        }
        const av = String(a[prop] || '').toUpperCase()
        const bv = String(b[prop] || '').toUpperCase()
        if (av === bv) return 0
        return av > bv ? factor : -factor
      })
      return list
    },
    visibleKlinePositions () {
      return this.sortedPositions.slice(0, this.visibleKlineCardCount)
    },
    hasMoreKlineCards () {
      return this.visibleKlineCardCount < this.sortedPositions.length
    },
    appLogRows () {
      return this.parseLogText(this.appLogText, 'app')
    },
    errorLogRows () {
      return this.parseLogText(this.errorLogText, 'error')
    },
    appLogDialogRows () {
      return this.parseLogText(this.appLogDialogText, 'app')
    },
    errorLogDialogRows () {
      return this.parseLogText(this.errorLogDialogText, 'error')
    },
    filteredAppLogRows () {
      return this.filterLogRows(this.appLogRows, this.appLogLevelFilter, this.appLogKeyword, this.appLogDateRange)
    },
    filteredErrorLogRows () {
      return this.filterLogRows(
        this.errorLogRows,
        this.errorLogLevelFilter,
        this.errorLogKeyword,
        this.errorLogDateRange,
        { disableDateFilter: this.errorLogDateRangeDisabled }
      )
    },
    appLogPreviewRows () {
      return this.filteredAppLogRows.slice(-80).reverse()
    },
    errorLogPreviewRows () {
      return this.filteredErrorLogRows.slice(-80).reverse()
    },
    activeLogLevelFilter: {
      get () {
        return this.logDialogType === 'error' ? this.errorLogLevelFilter : this.appLogLevelFilter
      },
      set (value) {
        if (this.logDialogType === 'error') {
          this.errorLogLevelFilter = value || ''
          return
        }
        this.appLogLevelFilter = value || ''
      }
    },
    activeLogKeyword: {
      get () {
        return this.logDialogType === 'error' ? this.errorLogKeyword : this.appLogKeyword
      },
      set (value) {
        if (this.logDialogType === 'error') {
          this.errorLogKeyword = value || ''
          return
        }
        this.appLogKeyword = value || ''
      }
    },
    activeLogDateRange: {
      get () {
        return this.logDialogType === 'error' ? this.errorLogDateRange : this.appLogDateRange
      },
      set (value) {
        if (this.logDialogType === 'error') {
          this.errorLogDateRange = Array.isArray(value) ? value : []
          return
        }
        this.appLogDateRange = Array.isArray(value) ? value : []
      }
    },
    errorLogDateRangeDisabled () {
      return this.errorLogSource !== 'db'
    },
    activeLogDateRangeDisabled () {
      return this.logDialogType === 'error' ? this.errorLogDateRangeDisabled : false
    },
    activeLogSourceHint () {
      if (this.logDialogType !== 'error') return ''
      if (this.errorLogSource === 'pm2') {
        return 'PM2 原始流用于排障，日期筛选已关闭'
      }
      if (this.errorLogSource === 'file') {
        return '当前来源：原始错误文件，仅显示最近截取的原始日志'
      }
      return '当前来源：数据库，支持按日期/级别/关键词查询'
    },
    activeLogRows () {
      const useDialogRows = this.logDialogVisible && this.logDialogDataLoaded
      const baseRows = this.logDialogType === 'error'
        ? (useDialogRows ? this.errorLogDialogRows : this.errorLogRows)
        : (useDialogRows ? this.appLogDialogRows : this.appLogRows)
      return this.filterLogRows(
        baseRows,
        this.activeLogLevelFilter,
        this.activeLogKeyword,
        this.activeLogDateRange,
        { disableDateFilter: this.activeLogDateRangeDisabled }
      ).slice().reverse()
    },
    filteredAuditRows () {
      return this.filterAuditRows(this.audits, this.auditActorFilter, this.auditKeyword).slice().reverse()
    },
    auditPreviewRows () {
      return this.filteredAuditRows.slice(0, 80)
    },
    auditActorOptions () {
      const set = new Set()
      ;(Array.isArray(this.audits) ? this.audits : []).forEach(item => {
        const actor = String((item && item.actor) || '').trim()
        if (actor) set.add(actor)
      })
      return Array.from(set)
    },
    logDialogTitle () {
      if (this.logDialogType === 'error') {
        return `错误日志 · ${this.getLogSourceLabel(this.errorLogSource)}`
      }
      return '应用日志'
    },
    detailDrawerTitle () {
      return this.detailDrawerType === 'audit' ? '审计详情' : '日志详情'
    },
    snapshot () {
      return this.overview.latestSnapshot || {}
    },
    securityStatus () {
      return this.overview.securityStatus || {}
    },
    eventLabel () {
      const event = this.overview.latestEvent
      if (!event) return '暂无'
      return `${event.level}: ${event.category}`
    },
    tradingModeLabel () {
      const mode = String(this.securityStatus.tradingMode || 'paper').toLowerCase()
      return mode === 'live' ? '实盘' : '模拟'
    },
    tradingModeTagType () {
      const mode = String(this.securityStatus.tradingMode || 'paper').toLowerCase()
      if (mode === 'live') {
        return this.securityStatus.liveTradingConfirmed ? 'danger' : 'warning'
      }
      return 'success'
    },
    highRiskRequirementLabel () {
      if (this.securityStatus.highRiskTokenRequired) return '令牌'
      if (this.securityStatus.highRiskAckRequired) return '确认头'
      return '未启用'
    },
    authStatusText () {
      if (this.authStatus === 'success') return '已认证'
      if (this.authStatus === 'failed') return '认证失败'
      if (this.authStatus === 'pending') return '校验中'
      return '待配置'
    },
    authStatusTagType () {
      if (this.authStatus === 'success') return 'success'
      if (this.authStatus === 'failed') return 'danger'
      return 'warning'
    },
    authSummaryText () {
      const hasToken = Boolean(String(this.tokenInput || '').trim())
      if (!hasToken) return '未保存 Token，将保持展开'
      if (this.authStatus === 'success') return 'Token 已验证，可关闭'
      if (this.authStatus === 'failed') return 'Token 校验失败，请重新检查'
      if (this.authStatus === 'pending') return '正在验证 Token'
      return '等待校验 Token'
    },
    canEditTrendFilter () {
      if (this.authStatus !== 'success') return false
      if (this.securityStatus.highRiskTokenRequired) {
        return Boolean(String(this.riskTokenInput || '').trim())
      }
      return true
    },
    trendFilterPermissionText () {
      if (this.canEditTrendFilter) return '可编辑'
      if (this.authStatus !== 'success') return '需认证'
      if (this.securityStatus.highRiskTokenRequired) return '需高风险令牌'
      return '无权限'
    },
    trendFilterPermissionHelp () {
      if (this.authStatus !== 'success') return '请先保存有效 API Token 并完成认证。'
      if (this.securityStatus.highRiskTokenRequired) return '请先在“身份与鉴权”中保存高风险令牌。'
      return '当前账号没有编辑权限。'
    },
    trendFilterRuleText () {
      const timeframeMap = {
        '1d': '日线',
        '1h': '小时线'
      }
      const neutralMap = {
        allow: '中性允许',
        block: '中性禁止'
      }
      const failMap = {
        block: '异常禁止开仓',
        allow: '异常允许开仓'
      }
      const timeframe = timeframeMap[this.tradingForm.trend_filter_timeframe] || this.tradingForm.trend_filter_timeframe || '-'
      const maType = this.tradingForm.trend_filter_ma_type || 'EMA'
      const fast = this.tradingForm.trend_filter_fast_period || 20
      const slow = this.tradingForm.trend_filter_slow_period || 60
      const slope = this.tradingForm.trend_filter_slope_lookback || 5
      const deadbandPct = (Number(this.tradingForm.trend_filter_deadband_pct || 0) * 100).toFixed(2)
      const neutral = neutralMap[this.tradingForm.trend_filter_neutral_policy] || '中性允许'
      const fail = failMap[this.tradingForm.trend_filter_fail_mode] || '异常禁止开仓'
      return `${timeframe} ${maType}${fast}/${maType}${slow}，慢线${slope}根斜率，防抖${deadbandPct}%，${neutral}，${fail}`
    },
    lastMaintenanceRun () {
      return this.overview.lastMaintenanceRun || null
    },
    lastMaintenanceStatusText () {
      const row = this.lastMaintenanceRun
      if (!row) return '暂无'
      return `${row.job_name || 'maintenance'} / ${row.status || '-'}`
    },
    lastMaintenanceTagType () {
      const row = this.lastMaintenanceRun
      if (!row) return 'info'
      if (row.status === 'ok') return 'success'
      if (row.status === 'skipped') return 'warning'
      if (row.status === 'failed') return 'danger'
      return 'info'
    },
    lastMaintenanceSummary () {
      const row = this.lastMaintenanceRun
      if (!row) return '暂无维护记录'
      const timeText = this.formatDisplayTime(row.created_at)
      const detail = row.detail
      if (detail && detail.retention && detail.retention.totalDeleted !== undefined) {
        return `${timeText}，清理 ${detail.retention.totalDeleted} 条历史数据`
      }
      if (detail && detail.reason) {
        return `${timeText}，${detail.reason}`
      }
      return `${timeText}，状态 ${row.status || '-'}`
    },
    runtimeChainLabel () {
      const chain = this.overview.runtimeChain || {}
      const primary = String(chain.primaryChain || this.settingsForm.runtime_primary_chain || 'db')
      const effective = String(chain.effectiveChain || (this.settingsForm.runtime_force_file_rollback ? 'file' : primary))
      const rollback = typeof chain.rollbackEnabled === 'boolean'
        ? chain.rollbackEnabled
        : Boolean(this.settingsForm.runtime_force_file_rollback)
      if (rollback) {
        return `生效:${effective} (回滚中)`
      }
      return `生效:${effective} 主:${primary}`
    },
    runtimeChainTagType () {
      const chain = this.overview.runtimeChain || {}
      const rollback = typeof chain.rollbackEnabled === 'boolean'
        ? chain.rollbackEnabled
        : Boolean(this.settingsForm.runtime_force_file_rollback)
      const effective = String(chain.effectiveChain || (this.settingsForm.runtime_force_file_rollback
        ? 'file'
        : (this.settingsForm.runtime_primary_chain || 'db')))
      if (rollback) return 'warning'
      return effective === 'db' ? 'success' : 'info'
    },
    confirmDescription () {
      if (this.pendingAction === 'settings') {
        return '你正在提交策略与风控变更申请，审批通过后才会影响运行中的调度任务。'
      }
      if (this.pendingAction === 'trading') {
        return '你正在提交交易参数变更申请，审批通过后后续下单逻辑才会按新参数执行。'
      }
      return '请确认本次变更。'
    }
  },
  watch: {
    activeTab (value) {
      if (value === 'overview') {
        this.$nextTick(() => {
          this.renderMarginChart()
          this.resizeMarginChart()
        })
      }
      if (value === 'logs' && this.hasSavedToken() && !this.logsInitialized) {
        this.refreshLogsAndAudits()
      }
      this.syncLogRefreshTimer()
    },
    logAutoRefreshEnabled () {
      this.syncLogRefreshTimer()
    },
    logAutoRefreshSeconds () {
      this.syncLogRefreshTimer()
    },
    appLogLevelFilter () {
      this.scheduleLogPreviewReload()
    },
    errorLogLevelFilter () {
      this.scheduleLogPreviewReload()
    },
    appLogKeyword () {
      this.scheduleLogPreviewReload()
    },
    errorLogKeyword () {
      this.scheduleLogPreviewReload()
    },
    appLogDateRange () {
      this.scheduleLogPreviewReload()
    },
    errorLogDateRange () {
      this.scheduleLogPreviewReload()
    },
    errorLogSource () {
      if (this.activeTab === 'logs' || this.logsInitialized) {
        this.loadLogPreview()
      }
      if (this.logDialogVisible && this.logDialogType === 'error') {
        this.errorLogDialogText = ''
        this.logDialogDataLoaded = false
        this.refreshActiveLogDialog()
      }
    }
  },
  created () {
    if (typeof window !== 'undefined') {
      this.tokenInput = window.localStorage.getItem('api_token') || ''
      this.operatorInput = window.localStorage.getItem('operator_name') || ''
      this.riskTokenInput = window.localStorage.getItem('risk_token') || ''
      const savedTheme = window.localStorage.getItem('control_theme') || 'dark'
      this.themeMode = savedTheme === 'dark' ? 'dark' : 'light'
    }
    this.syncThemeHostClass()
    this.syncAuthPanelVisibility(this.tokenInput ? 'pending' : 'missing')
    if (this.hasSavedToken()) {
      this.loadAll()
    } else {
      this.resetProtectedData()
    }
    this.refreshTimer = setInterval(this.loadOverviewOnly, 15000)
  },
  mounted () {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleWindowResize)
    }
    this.$nextTick(() => {
      this.renderMarginChart()
    })
  },
  beforeDestroy () {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.logRefreshTimer) {
      clearInterval(this.logRefreshTimer)
      this.logRefreshTimer = null
    }
    if (this.logFilterReloadTimer) {
      clearTimeout(this.logFilterReloadTimer)
      this.logFilterReloadTimer = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleWindowResize)
    }
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('control-theme-dark', 'control-theme-light')
    }
    this.disposeMarginChart()
  },
  methods: {
    isAuthError (error) {
      const status = Number(error && error.response && error.response.status)
      return status === 401 || status === 403
    },
    isMissingTokenError (error) {
      return Boolean(error && error.code === 'TOKEN_REQUIRED')
    },
    hasSavedToken () {
      return Boolean(String(this.tokenInput || '').trim())
    },
    syncAuthPanelVisibility (nextStatus = this.authStatus, { force = false } = {}) {
      const hasToken = Boolean(String(this.tokenInput || '').trim())
      this.authStatus = hasToken ? nextStatus : 'missing'
      const shouldExpand = !hasToken || this.authStatus !== 'success'
      if (force || !this.authPanelUserToggled || shouldExpand) {
        this.authPanelExpanded = shouldExpand
      }
      if (force) {
        this.authPanelUserToggled = false
      }
    },
    toggleAuthPanel () {
      this.authPanelExpanded = !this.authPanelExpanded
      this.authPanelUserToggled = true
    },
    resetProtectedData () {
      this.overview = {}
      this.events = []
      this.snapshots = []
      this.marginSnapshots = []
      this.audits = []
      this.changeRequests = []
      this.positions = []
      this.openOrders = []
      this.appLogText = ''
      this.errorLogText = ''
      this.appLogDialogText = ''
      this.errorLogDialogText = ''
      this.logsInitialized = false
      this.logDialogLoading = false
      this.logDialogDataLoaded = false
      this.disposeMarginChart()
    },
    parseSnapshotTimestamp (value) {
      const date = this.parseServerTime(value)
      return date ? date.getTime() : 0
    },
    parseServerTime (value) {
      if (value === null || value === undefined || value === '') return null
      if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null
      }
      if (typeof value === 'number') {
        const date = new Date(value)
        return Number.isFinite(date.getTime()) ? date : null
      }
      const text = String(value || '').trim()
      if (!text) return null
      if (/^\d+$/.test(text)) {
        const numeric = Number(text)
        const millis = text.length <= 10 ? numeric * 1000 : numeric
        const date = new Date(millis)
        return Number.isFinite(date.getTime()) ? date : null
      }
      const normalized = text.includes('T') ? text : text.replace(' ', 'T')
      const hasTimezone = /([zZ]|[+-]\d{2}:\d{2})$/.test(normalized)
      const utcDate = new Date(hasTimezone ? normalized : `${normalized}Z`)
      if (Number.isFinite(utcDate.getTime())) {
        if (!hasTimezone) {
          const localDate = new Date(normalized)
          const maxFutureToleranceMs = 5 * 60 * 1000
          if (Number.isFinite(localDate.getTime()) && utcDate.getTime() > Date.now() + maxFutureToleranceMs) {
            return localDate
          }
        }
        return utcDate
      }
      const fallback = new Date(normalized)
      return Number.isFinite(fallback.getTime()) ? fallback : null
    },
    formatDisplayTime (value) {
      const date = this.parseServerTime(value)
      if (!date) {
        const text = String(value || '').trim()
        return text || '-'
      }
      return [
        date.getFullYear(),
        this.padTimeNumber(date.getMonth() + 1),
        this.padTimeNumber(date.getDate())
      ].join('-') + ' ' + [
        this.padTimeNumber(date.getHours()),
        this.padTimeNumber(date.getMinutes()),
        this.padTimeNumber(date.getSeconds())
      ].join(':')
    },
    formatTableTime (row, column, cellValue) {
      if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
        return this.formatDisplayTime(cellValue)
      }
      const property = column && column.property
      return this.formatDisplayTime(property ? row && row[property] : '')
    },
    padTimeNumber (value) {
      return String(value).padStart(2, '0')
    },
    getMarginMaxPoints () {
      if (this.marginRange === '7d') return 600
      return 1000
    },
    getMarginRequestOptions () {
      const range = this.marginRange || '30d'
      return {
        trend: 1,
        range,
        maxPoints: this.getMarginMaxPoints()
      }
    },
    downsampleMarginRows (rows) {
      const list = Array.isArray(rows) ? rows : []
      if (!list.length) return []
      let maxPoints = 1000
      if (this.marginRange === '7d') maxPoints = 600
      if (this.marginRange === '30d') maxPoints = 1000
      if (this.marginRange === '90d') maxPoints = 1000
      if (this.marginRange === 'all') maxPoints = 1000
      if (list.length <= maxPoints) return list
      const result = []
      const step = (list.length - 1) / (maxPoints - 1)
      let lastIndex = -1
      for (let i = 0; i < maxPoints; i++) {
        const idx = Math.round(i * step)
        if (idx === lastIndex) continue
        result.push(list[idx])
        lastIndex = idx
      }
      if (result[result.length - 1] !== list[list.length - 1]) {
        result.push(list[list.length - 1])
      }
      return result
    },
    getMarginChartRows () {
      const source = Array.isArray(this.marginSnapshots) && this.marginSnapshots.length
        ? this.marginSnapshots.slice()
        : (Array.isArray(this.snapshots) ? this.snapshots.slice() : [])
      const rows = source
        .map(item => {
          const time = item && (item.created_at || item.snapshot_time || item.timestamp)
          const marginBalance = Number(item && item.margin_balance)
          const riskRatio = Number(item && item.risk_ratio)
          const unrealizedPnl = Number(item && item.unrealized_pnl)
          return {
            time: String(time || ''),
            displayTime: this.formatDisplayTime(time),
            timestamp: this.parseSnapshotTimestamp(time),
            marginBalance: Number.isFinite(marginBalance) ? marginBalance : null,
            riskRatio: Number.isFinite(riskRatio) ? riskRatio : null,
            unrealizedPnl: Number.isFinite(unrealizedPnl) ? unrealizedPnl : null
          }
        })
        .filter(item => item.time && Number.isFinite(item.marginBalance))
      rows.sort((a, b) => {
        const ta = Number(a.timestamp || 0)
        const tb = Number(b.timestamp || 0)
        if (ta && tb) return ta - tb
        return String(a.time).localeCompare(String(b.time))
      })
      let filtered = rows
      if (this.marginRange !== 'all') {
        const dayMap = {
          '7d': 7,
          '30d': 30,
          '90d': 90
        }
        const days = dayMap[this.marginRange] || 30
        const startTimestamp = Date.now() - days * 24 * 60 * 60 * 1000
        filtered = rows.filter(item => {
          if (!item.timestamp) return true
          return item.timestamp >= startTimestamp
        })
      }
      return this.downsampleMarginRows(filtered)
    },
    formatChartNumber (value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '-'
      const absNum = Math.abs(num)
      if (absNum >= 100000000) return `${(num / 100000000).toFixed(2)}亿`
      if (absNum >= 10000) return `${(num / 10000).toFixed(2)}万`
      return num.toFixed(2)
    },
    upsertSnapshotList (source, snapshot, maxSize) {
      const list = Array.isArray(source) ? source.slice() : []
      const key = String(snapshot.created_at || snapshot.snapshot_time || snapshot.timestamp || '')
      if (!key) return list
      const index = list.findIndex(item => {
        const itemKey = String((item && (item.created_at || item.snapshot_time || item.timestamp)) || '')
        return itemKey === key
      })
      if (index >= 0) {
        list[index] = { ...list[index], ...snapshot }
      } else {
        list.unshift(snapshot)
      }
      const size = Number(maxSize || 120)
      return size > 0 ? list.slice(0, size) : list
    },
    upsertSnapshotFromOverview (snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return
      this.snapshots = this.upsertSnapshotList(this.snapshots, snapshot, 120)
      const marginSize = Math.max(this.getMarginMaxPoints(), 500)
      this.marginSnapshots = this.upsertSnapshotList(this.marginSnapshots, snapshot, marginSize)
    },
    async loadMarginSnapshots (showLoading = true) {
      if (!this.hasSavedToken()) {
        return
      }
      if (showLoading) {
        this.marginLoading = true
      }
      try {
        const res = await getSystemSnapshots(0, this.getMarginRequestOptions())
        this.marginSnapshots = res.data || []
        this.$nextTick(() => {
          this.renderMarginChart()
        })
      } catch (error) {
        this.$message.error(this.getErrorText(error, '加载保证金趋势失败'))
      } finally {
        if (showLoading) {
          this.marginLoading = false
        }
      }
    },
    handleMarginRangeChange () {
      this.loadMarginSnapshots(true)
    },
    disposeMarginChart () {
      if (this.marginChart) {
        this.marginChart.dispose()
        this.marginChart = null
      }
    },
    resizeMarginChart () {
      if (this.marginChart) {
        this.marginChart.resize()
      }
    },
    renderMarginChart () {
      const chartEl = this.$refs.marginChart
      if (!chartEl || chartEl.clientWidth <= 0 || chartEl.clientHeight <= 0) return
      if (!this.marginChart) {
        this.marginChart = echarts.init(chartEl)
      }
      const rows = this.getMarginChartRows()
      const isDark = this.themeMode === 'dark'
      const axisColor = isDark ? '#96a8c2' : '#6f8198'
      const lineColor = isDark ? '#7fb2ff' : '#2a78f6'
      const areaTop = isDark ? 'rgba(90, 144, 255, 0.35)' : 'rgba(58, 130, 246, 0.28)'
      const areaBottom = isDark ? 'rgba(90, 144, 255, 0.06)' : 'rgba(58, 130, 246, 0.04)'
      const splitColor = isDark ? 'rgba(117, 142, 173, 0.16)' : 'rgba(86, 114, 146, 0.12)'
      const tooltipBg = isDark ? 'rgba(16, 25, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      const tooltipBorder = isDark ? '#3b5678' : '#c8d8ee'
      const textColor = isDark ? '#d8e4f8' : '#274062'

      if (!rows.length) {
        this.marginChart.clear()
        this.marginChart.setOption({
          title: {
            text: '暂无保证金快照数据',
            left: 'center',
            top: 'center',
            textStyle: {
              color: axisColor,
              fontSize: 14,
              fontWeight: 500
            }
          }
        }, true)
        return
      }

      const labels = rows.map(item => String(item.displayTime || item.time))
      const marginSeries = rows.map(item => item.marginBalance)
      const riskSeries = rows.map(item => item.riskRatio)

      this.marginChart.setOption({
        animation: false,
        grid: {
          left: 52,
          right: 52,
          top: 26,
          bottom: 46
        },
        tooltip: {
          trigger: 'axis',
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: {
            color: textColor
          },
          formatter: params => {
            if (!Array.isArray(params) || !params.length) return ''
            const first = params[0]
            const idx = Number(first && first.dataIndex)
            const row = rows[idx] || {}
            const lines = [
              `<div>${row.displayTime || row.time || ''}</div>`,
              `<div>保证金: ${this.formatChartNumber(row.marginBalance)}</div>`
            ]
            if (Number.isFinite(row.riskRatio)) {
              lines.push(`<div>风险比: ${(row.riskRatio * 100).toFixed(2)}%</div>`)
            }
            if (Number.isFinite(row.unrealizedPnl)) {
              lines.push(`<div>未实现盈亏: ${this.formatChartNumber(row.unrealizedPnl)}</div>`)
            }
            return lines.join('')
          }
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: labels,
          axisLine: {
            lineStyle: {
              color: axisColor
            }
          },
          axisLabel: {
            color: axisColor,
            formatter: value => String(value || '').slice(5, 16)
          }
        },
        yAxis: [
          {
            type: 'value',
            axisLine: {
              show: true,
              lineStyle: {
                color: axisColor
              }
            },
            splitLine: {
              lineStyle: {
                color: splitColor
              }
            },
            axisLabel: {
              color: axisColor,
              formatter: value => this.formatChartNumber(value)
            }
          },
          {
            type: 'value',
            axisLine: {
              show: true,
              lineStyle: {
                color: axisColor
              }
            },
            splitLine: {
              show: false
            },
            axisLabel: {
              color: axisColor,
              formatter: value => `${(Number(value || 0) * 100).toFixed(0)}%`
            }
          }
        ],
        series: [
          {
            name: '保证金',
            type: 'line',
            smooth: true,
            symbol: 'none',
            data: marginSeries,
            lineStyle: {
              width: 2,
              color: lineColor
            },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: areaTop },
                { offset: 1, color: areaBottom }
              ])
            }
          },
          {
            name: '风险比',
            type: 'line',
            smooth: true,
            symbol: 'none',
            yAxisIndex: 1,
            data: riskSeries,
            lineStyle: {
              width: 1.5,
              type: 'dashed',
              color: isDark ? '#f4c26d' : '#d7861e'
            }
          }
        ]
      }, true)
      this.resizeMarginChart()
    },
    handleWindowResize () {
      this.resizeMarginChart()
    },
    async loadAll () {
      if (!this.hasSavedToken()) {
        this.syncAuthPanelVisibility('missing', { force: true })
        this.resetProtectedData()
        return
      }
      this.loading = true
      try {
        const [overviewRes, settingsRes, tradingRes, eventsRes, snapshotsRes, auditsRes, requestsRes] = await Promise.all([
          getSystemOverview(),
          getSystemSettings(),
          getTradingParams(),
          getSystemEvents(100),
          getSystemSnapshots(60),
          getSystemAudits(100),
          getChangeRequests(100, this.changeRequestStatus)
        ])
        this.overview = overviewRes.data || {}
        this.settingsForm = Object.assign({}, this.settingsForm, settingsRes.data || {})
        this.tradingForm = Object.assign({}, this.tradingForm, tradingRes.data || {})
        this.lastLoadedTradingForm = { ...this.tradingForm }
        this.events = eventsRes.data || []
        this.snapshots = snapshotsRes.data || []
        this.audits = auditsRes.data || []
        this.changeRequests = requestsRes.data || []
        await this.loadMarginSnapshots(false)
        this.$nextTick(() => {
          this.renderMarginChart()
        })

        await this.loadPositionsAndOrders()
        this.syncAuthPanelVisibility('success')
      } catch (error) {
        if (this.isAuthError(error)) {
          this.syncAuthPanelVisibility('failed', { force: true })
          this.resetProtectedData()
        } else if (this.isMissingTokenError(error)) {
          this.syncAuthPanelVisibility('missing', { force: true })
          this.resetProtectedData()
          return
        }
        this.$message.error(this.getErrorText(error, '加载数据失败'))
      } finally {
        this.loading = false
      }
    },
    async loadOverviewOnly () {
      if (!this.hasSavedToken()) {
        this.syncAuthPanelVisibility('missing')
        this.resetProtectedData()
        return
      }
      try {
        const overviewRes = await getSystemOverview()
        this.overview = overviewRes.data || {}
        this.upsertSnapshotFromOverview(this.overview.latestSnapshot)
        this.$nextTick(() => {
          this.renderMarginChart()
        })
        this.syncAuthPanelVisibility('success')
      } catch (error) {
        if (this.isAuthError(error)) {
          this.syncAuthPanelVisibility('failed', { force: true })
          this.resetProtectedData()
          return
        }
        if (this.isMissingTokenError(error)) {
          this.syncAuthPanelVisibility('missing', { force: true })
          this.resetProtectedData()
        }
      }
    },
    async loadChangeRequests () {
      if (!this.hasSavedToken()) {
        return
      }
      this.changeRequestLoading = true
      try {
        const res = await getChangeRequests(100, this.changeRequestStatus)
        this.changeRequests = res.data || []
      } catch (error) {
        if (this.isMissingTokenError(error)) {
          this.syncAuthPanelVisibility('missing', { force: true })
          this.resetProtectedData()
          return
        }
        this.$message.error(this.getErrorText(error, '加载变更申请失败'))
      } finally {
        this.changeRequestLoading = false
      }
    },
    async loadPositionsAndOrders () {
      if (!this.hasSavedToken()) {
        this.positions = []
        this.openOrders = []
        return
      }
      this.positionOrderLoading = true
      try {
        const [positionsRes, ordersRes] = await Promise.all([
          getPositions(),
          getOpenOrders()
        ])
        this.positions = positionsRes.data || []
        this.openOrders = ordersRes.data || []
        this.resetKlineCardWindow()
      } catch (error) {
        if (this.isAuthError(error)) {
          this.syncAuthPanelVisibility('failed', { force: true })
          this.resetProtectedData()
          return
        }
        if (this.isMissingTokenError(error)) {
          this.syncAuthPanelVisibility('missing', { force: true })
          this.resetProtectedData()
          return
        }
        this.$message.error(this.getErrorText(error, '加载持仓/挂单失败'))
      } finally {
        this.positionOrderLoading = false
      }
    },
    async loadLogPreview () {
      if (!this.hasSavedToken()) {
        this.appLogText = ''
        this.errorLogText = ''
        this.logsInitialized = false
        return
      }
      this.logsLoading = true
      try {
        const [appLogRes, errorLogRes] = await Promise.all([
          getAppLog(this.buildLogRequestOptions('app', this.getAppLogPreviewLimit())),
          getErrorLog(this.buildLogRequestOptions('error', this.getErrorLogPreviewLimit()))
        ])
        this.appLogText = String(appLogRes.data || '')
        this.errorLogText = String(errorLogRes.data || '')
        this.logsInitialized = true
      } catch (error) {
        if (this.isAuthError(error)) {
          this.syncAuthPanelVisibility('failed', { force: true })
          this.resetProtectedData()
          return
        }
        if (this.isMissingTokenError(error)) {
          this.syncAuthPanelVisibility('missing', { force: true })
          this.resetProtectedData()
          return
        }
        this.$message.error(this.getErrorText(error, '加载日志失败'))
      } finally {
        this.logsLoading = false
      }
    },
    async loadAuditPreview () {
      this.auditLoading = true
      try {
        const auditsRes = await getSystemAudits(300)
        this.audits = auditsRes.data || []
      } catch (error) {
        this.$message.error(this.getErrorText(error, '加载审计失败'))
      } finally {
        this.auditLoading = false
      }
    },
    async refreshLogsAndAudits () {
      await Promise.all([
        this.loadLogPreview(),
        this.loadAuditPreview()
      ])
    },
    getAppLogPreviewLimit () {
      return 400
    },
    getErrorLogPreviewLimit () {
      return this.errorLogSource === 'pm2' ? 1500 : 800
    },
    getLogDialogLineLimit (type = this.logDialogType) {
      if (type === 'error') {
        return this.errorLogSource === 'pm2' ? 10000 : 5000
      }
      return 5000
    },
    async refreshActiveLogDialog () {
      if (!this.hasSavedToken()) {
        this.appLogDialogText = ''
        this.errorLogDialogText = ''
        this.logDialogDataLoaded = false
        return
      }
      this.logDialogLoading = true
      try {
        if (this.logDialogType === 'error') {
          const res = await getErrorLog(this.buildLogRequestOptions('error', this.getLogDialogLineLimit('error')))
          this.errorLogDialogText = String(res.data || '')
        } else {
          const res = await getAppLog(this.buildLogRequestOptions('app', this.getLogDialogLineLimit('app')))
          this.appLogDialogText = String(res.data || '')
        }
        this.logDialogDataLoaded = true
      } catch (error) {
        if (this.isAuthError(error)) {
          this.syncAuthPanelVisibility('failed', { force: true })
          this.resetProtectedData()
          this.logDialogVisible = false
          return
        }
        if (this.isMissingTokenError(error)) {
          this.syncAuthPanelVisibility('missing', { force: true })
          this.resetProtectedData()
          this.logDialogVisible = false
          return
        }
        this.$message.error(this.getErrorText(error, '加载完整日志失败'))
      } finally {
        this.logDialogLoading = false
      }
    },
    syncLogRefreshTimer () {
      if (this.logRefreshTimer) {
        clearInterval(this.logRefreshTimer)
        this.logRefreshTimer = null
      }
      if (!this.logAutoRefreshEnabled) {
        return
      }
      if (this.activeTab !== 'logs') {
        return
      }
      const seconds = Math.max(15, Number(this.logAutoRefreshSeconds || 30))
      this.logRefreshTimer = setInterval(() => {
        this.refreshLogsAndAudits()
      }, seconds * 1000)
    },
    getLogSourceLabel (source) {
      const value = String(source || 'db').trim().toLowerCase()
      if (value === 'file') return '原始文件'
      if (value === 'pm2') return 'PM2 原始流'
      return '数据库'
    },
    stripAnsiText (value) {
      const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')
      return String(value || '').replace(ansiPattern, '')
    },
    parseLogLine (line, index, type) {
      const text = this.stripAnsiText(line).trim()
      if (!text) return null
      const match = text.match(/^\[([^\]]+)\]\s+\[([^\]]+)\]\s+([^-\s]+)\s*-\s*(.*)$/)
      if (match) {
        return {
          id: `${type}_${index}`,
          timestamp: this.formatDisplayTime(match[1]),
          timestampRaw: match[1],
          level: String(match[2] || '').toLowerCase(),
          source: match[3] || '',
          message: match[4] || '',
          raw: text
        }
      }
      return {
        id: `${type}_${index}`,
        timestamp: '',
        level: type === 'error' ? 'error' : 'info',
        source: '',
        message: text,
        raw: text
      }
    },
    parseLogText (text, type = 'app') {
      const rows = []
      let lastStructuredRow = null
      String(text || '')
        .split('\n')
        .forEach((line, index) => {
          const row = this.parseLogLine(line, index, type)
          if (!row) return
          if (!row.timestampRaw && lastStructuredRow) {
            row.timestamp = lastStructuredRow.timestamp
            row.timestampRaw = lastStructuredRow.timestampRaw
            row.level = row.level || lastStructuredRow.level
            row.source = row.source || lastStructuredRow.source
          }
          if (row.timestampRaw) {
            lastStructuredRow = row
          }
          rows.push(row)
        })
      return rows
    },
    normalizeLogDateRange (dateRange) {
      const range = Array.isArray(dateRange) ? dateRange : []
      if (!range.length) return { start: null, end: null }
      const startBase = this.parseServerTime(range[0])
      const endBase = this.parseServerTime(range[1] || range[0])
      if (!startBase || !endBase) return { start: null, end: null }
      const start = new Date(startBase.getTime())
      start.setHours(0, 0, 0, 0)
      const end = new Date(endBase.getTime())
      end.setHours(23, 59, 59, 999)
      return { start, end }
    },
    buildLogRequestOptions (type = 'app', lineLimit = 0) {
      const isError = type === 'error'
      const options = {}
      if (lineLimit > 0) {
        options.lineLimit = lineLimit
      }
      if (isError) {
        options.source = this.errorLogSource
      }
      const level = String(isError ? this.errorLogLevelFilter : this.appLogLevelFilter).trim().toLowerCase()
      const keyword = String(isError ? this.errorLogKeyword : this.appLogKeyword).trim()
      if (level) {
        options.level = level
      }
      if (keyword) {
        options.keyword = keyword
      }
      const disableDateFilter = isError ? this.errorLogDateRangeDisabled : false
      if (!disableDateFilter) {
        const dateRange = isError ? this.errorLogDateRange : this.appLogDateRange
        const { start, end } = this.normalizeLogDateRange(dateRange)
        if (start) {
          options.startDate = start.toISOString()
        }
        if (end) {
          options.endDate = end.toISOString()
        }
      }
      return options
    },
    scheduleLogPreviewReload () {
      if (!this.hasSavedToken()) {
        return
      }
      if (this.logFilterReloadTimer) {
        clearTimeout(this.logFilterReloadTimer)
        this.logFilterReloadTimer = null
      }
      const shouldReloadDialog = this.logDialogVisible
      const shouldReloadPreview = this.activeTab === 'logs' && this.logsInitialized
      if (!shouldReloadDialog && !shouldReloadPreview) {
        return
      }
      this.logFilterReloadTimer = setTimeout(() => {
        this.logFilterReloadTimer = null
        if (this.logDialogVisible) {
          this.refreshActiveLogDialog()
          return
        }
        if (this.activeTab === 'logs') {
          this.loadLogPreview()
        }
      }, 250)
    },
    filterLogRows (rows, levelFilter, keyword, dateRange, options = {}) {
      const list = Array.isArray(rows) ? rows : []
      const level = String(levelFilter || '').trim().toLowerCase()
      const query = String(keyword || '').trim().toLowerCase()
      const disableDateFilter = Boolean(options && options.disableDateFilter)
      const { start, end } = disableDateFilter ? { start: null, end: null } : this.normalizeLogDateRange(dateRange)
      return list.filter(item => {
        const itemLevel = String((item && item.level) || '').toLowerCase()
        if (level && itemLevel !== level) {
          return false
        }
        if (start && end) {
          const itemTime = this.parseServerTime(item && (item.timestampRaw || item.timestamp))
          if (!itemTime || itemTime < start || itemTime > end) {
            return false
          }
        }
        if (!query) {
          return true
        }
        const haystack = [
          item && item.timestamp,
          item && item.timestampRaw,
          item && item.level,
          item && item.source,
          item && item.message,
          item && item.raw
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
    },
    filterAuditRows (rows, actorFilter, keyword) {
      const list = Array.isArray(rows) ? rows : []
      const actor = String(actorFilter || '').trim().toLowerCase()
      const query = String(keyword || '').trim().toLowerCase()
      return list.filter(item => {
        const itemActor = String((item && item.actor) || '').trim().toLowerCase()
        if (actor && itemActor !== actor) {
          return false
        }
        if (!query) {
          return true
        }
        const haystack = [
          item && item.created_at,
          this.formatDisplayTime(item && item.created_at),
          item && item.action,
          item && item.target,
          item && item.actor,
          this.getAuditReason(item),
          this.summarizeAudit(item),
          this.formatJson(item && item.metadata)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(query)
      })
    },
    openLogDialog (type) {
      this.logDialogType = type === 'error' ? 'error' : 'app'
      if (this.logDialogType === 'error') {
        this.errorLogDialogText = ''
      } else {
        this.appLogDialogText = ''
      }
      this.logDialogDataLoaded = false
      this.logDialogVisible = true
      this.refreshActiveLogDialog()
    },
    openLogDetail (row) {
      this.detailDrawerType = 'log'
      this.detailDrawerRow = row || null
      this.detailDrawerVisible = true
    },
    openAuditDetail (row) {
      this.detailDrawerType = 'audit'
      this.detailDrawerRow = row || null
      this.detailDrawerVisible = true
    },
    openConfirm (actionType) {
      if (!this.operatorInput) {
        this.$message.warning('请先填写并保存操作人')
        return
      }
      if (actionType === 'trading' && this.hasChangedTrendFilterPayload(this.tradingForm) && !this.canEditTrendFilter) {
        this.$message.warning(this.trendFilterPermissionHelp)
        return
      }
      this.pendingAction = actionType
      this.confirmReason = ''
      this.confirmSubmitting = false
      this.confirmDialogVisible = true
    },
    hasChangedTrendFilterPayload (payload = {}) {
      const baseline = this.lastLoadedTradingForm || {}
      return Object.keys(payload || {}).some(key => {
        if (key.indexOf('trend_filter_') !== 0) return false
        if (!Object.prototype.hasOwnProperty.call(baseline, key)) return true
        return this.normalizeComparableValue(payload[key]) !== this.normalizeComparableValue(baseline[key])
      })
    },
    normalizeComparableValue (value) {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : ''
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      }
      return String(value === undefined || value === null ? '' : value).trim()
    },
    async runConfirmedAction () {
      const reason = String(this.confirmReason || '').trim()
      if (reason.length < 4) {
        this.$message.warning('请填写至少 4 个字的变更原因')
        return
      }
      this.confirmSubmitting = true
      try {
        const success = await this.submitChangeRequest(this.pendingAction, reason)
        if (success) {
          this.confirmDialogVisible = false
          this.pendingAction = ''
          this.confirmReason = ''
        }
      } finally {
        this.confirmSubmitting = false
      }
    },
    async submitChangeRequest (actionType, reason) {
      if (actionType !== 'settings' && actionType !== 'trading') return false
      const isSettings = actionType === 'settings'
      const loadingKey = isSettings ? 'saving' : 'tradingSaving'
      this[loadingKey] = true
      try {
        const operator = String(this.operatorInput || '').trim()
        if (operator) {
          setOperatorName(operator)
        }
        const requestType = isSettings ? 'system_settings' : 'trading_parameters'
        const payload = isSettings ? { ...this.settingsForm } : { ...this.tradingForm }
        const res = await createChangeRequest({
          request_type: requestType,
          payload,
          reason
        }, reason)
        const requestId = res.data && res.data.id ? `#${res.data.id}` : ''
        this.$message.success(`变更申请已提交 ${requestId}`)
        Promise.allSettled([
          this.loadChangeRequests(),
          this.loadAuditPreview()
        ])
        return true
      } catch (error) {
        this.$message.error(this.getErrorText(error, '提交变更申请失败'))
        return false
      } finally {
        this[loadingKey] = false
      }
    },
    async getHighRiskHeaders (actionLabel) {
      const token = String(this.riskTokenInput || '').trim()
      if (this.securityStatus.highRiskTokenRequired) {
        if (!token) {
          this.$message.warning('服务端已启用高风险令牌，请先在页面保存高风险令牌')
          return null
        }
        this.riskTokenInput = token
        setRiskToken(token)
        return {
          'X-Risk-Token': token
        }
      }
      if (this.securityStatus.highRiskAckRequired) {
        try {
          await this.$confirm(
            `${actionLabel} 属于高风险操作，请再次确认。`,
            '高风险确认',
            {
              type: 'warning',
              confirmButtonText: '确认继续',
              cancelButtonText: '取消'
            }
          )
        } catch (error) {
          return null
        }
        return {
          'X-Risk-Ack': 'CONFIRM'
        }
      }
      return {}
    },
    getRequestTypeLabel (requestType) {
      if (requestType === 'system_settings') return '策略与风控'
      if (requestType === 'trading_parameters') return '交易参数'
      return requestType || '-'
    },
    getRequestStatusType (status) {
      if (status === 'pending') return 'warning'
      if (status === 'applied') return 'success'
      if (status === 'rejected') return 'info'
      if (status === 'failed') return 'danger'
      return ''
    },
    getRequestKeys (row) {
      const payload = row && row.change_payload
      if (!payload || typeof payload !== 'object') return '-'
      const keys = Object.keys(payload)
      if (!keys.length) return '-'
      return keys.join(', ')
    },
    async approveRequest (row) {
      if (!this.operatorInput) {
        this.$message.warning('请先填写并保存操作人')
        return
      }
      setOperatorName(String(this.operatorInput || '').trim())
      let comment = ''
      try {
        const promptRes = await this.$prompt('请输入审批备注（可选）', `审批通过申请 #${row.id}`, {
          confirmButtonText: '通过并执行',
          cancelButtonText: '取消',
          inputValue: ''
        })
        comment = String(promptRes.value || '').trim()
      } catch (error) {
        return
      }

      this.reviewingRequestId = `approve_${row.id}`
      try {
        const riskHeaders = await this.getHighRiskHeaders(`审批通过申请 #${row.id}`)
        if (riskHeaders === null) {
          this.reviewingRequestId = ''
          return
        }
        await approveChangeRequest(row.id, comment, riskHeaders)
        this.$message.success(`申请 #${row.id} 已通过并执行`)
        await this.loadAll()
      } catch (error) {
        this.$message.error(this.getErrorText(error, '审批通过失败'))
      } finally {
        this.reviewingRequestId = ''
      }
    },
    async rejectRequest (row) {
      if (!this.operatorInput) {
        this.$message.warning('请先填写并保存操作人')
        return
      }
      setOperatorName(String(this.operatorInput || '').trim())
      let comment = ''
      try {
        const promptRes = await this.$prompt('请输入驳回原因（至少2个字）', `驳回申请 #${row.id}`, {
          confirmButtonText: '确认驳回',
          cancelButtonText: '取消',
          inputValue: '',
          inputValidator: value => String(value || '').trim().length >= 2,
          inputErrorMessage: '驳回原因至少2个字'
        })
        comment = String(promptRes.value || '').trim()
      } catch (error) {
        return
      }

      this.reviewingRequestId = `reject_${row.id}`
      try {
        const riskHeaders = await this.getHighRiskHeaders(`驳回申请 #${row.id}`)
        if (riskHeaders === null) {
          this.reviewingRequestId = ''
          return
        }
        await rejectChangeRequest(row.id, comment, riskHeaders)
        this.$message.success(`申请 #${row.id} 已驳回`)
        await this.loadAll()
      } catch (error) {
        this.$message.error(this.getErrorText(error, '审批驳回失败'))
      } finally {
        this.reviewingRequestId = ''
      }
    },
    async testAlert () {
      this.alertTesting = true
      try {
        const reason = this.operatorInput ? 'manual_test_from_control_ui' : ''
        const result = await sendTestAlert(this.settingsForm.alert_min_level || 'warn', reason)
        if (result.data && result.data.sent) {
          this.$message.success('测试告警已发送')
        } else {
          this.$message.warning('告警未发送，请检查告警配置')
        }
        await this.loadAll()
      } catch (error) {
        this.$message.error(this.getErrorText(error, '测试告警失败'))
      } finally {
        this.alertTesting = false
      }
    },
    async runReconciliation () {
      this.reconciling = true
      try {
        const reason = this.operatorInput ? 'manual_reconcile_from_control_ui' : ''
        const result = await runSystemReconciliation(reason)
        const totalMismatch = Number((result && result.data && result.data.totalMismatch) || 0)
        if (totalMismatch > 0) {
          this.$message.warning(`对账发现 ${totalMismatch} 项异常，请查看监控事件`)
        } else {
          this.$message.success('对账通过')
        }
        await this.loadAll()
      } catch (error) {
        this.$message.error(this.getErrorText(error, '执行对账失败'))
      } finally {
        this.reconciling = false
      }
    },
    async runMaintenance () {
      if (!this.operatorInput) {
        this.$message.warning('请先填写并保存操作人')
        return
      }
      setOperatorName(String(this.operatorInput || '').trim())
      this.maintenanceRunning = true
      try {
        const riskHeaders = await this.getHighRiskHeaders('执行系统维护')
        if (riskHeaders === null) {
          this.maintenanceRunning = false
          return
        }
        const reason = this.operatorInput ? 'manual_maintenance_from_control_ui' : ''
        const result = await runSystemMaintenance(reason, riskHeaders)
        const totalDeleted = Number((((result || {}).data || {}).retention || {}).totalDeleted || 0)
        this.$message.success(`维护任务完成，已清理 ${totalDeleted} 条历史数据`)
        await this.loadAll()
      } catch (error) {
        this.$message.error(this.getErrorText(error, '执行维护失败'))
      } finally {
        this.maintenanceRunning = false
      }
    },
    getAuditReason (row) {
      const metadata = row && row.metadata
      if (!metadata || typeof metadata !== 'object') return '-'
      return metadata.reason || '-'
    },
    summarizeAudit (row) {
      if (!row) return '-'
      const before = row.before_data && typeof row.before_data === 'object' ? Object.keys(row.before_data).length : 0
      const after = row.after_data && typeof row.after_data === 'object' ? Object.keys(row.after_data).length : 0
      const reason = this.getAuditReason(row)
      const action = row.action || '-'
      const target = row.target || '-'
      return `${action} ${target} | before:${before} after:${after} | reason:${reason}`
    },
    formatJson (value) {
      if (value === null || typeof value === 'undefined' || value === '') {
        return '-'
      }
      if (typeof value === 'string') {
        return value
      }
      try {
        return JSON.stringify(value, null, 2)
      } catch (error) {
        return String(value)
      }
    },
    getErrorText (error, fallback) {
      if (this.isMissingTokenError(error)) {
        return '未检测到 API Token，请先在“身份与鉴权”中填写并保存'
      }
      if (this.isAuthError(error)) {
        return 'API Token 无效或已失效，请在“身份与鉴权”中重新输入并保存'
      }
      if (error && error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          const message = String(error.response.data || '').trim()
          if (message === 'Forbidden') {
            return '当前访问来源未被服务器允许，请检查 IP 白名单配置'
          }
          return message || fallback
        }
        if (typeof error.response.data === 'object' && error.response.data.message) {
          return error.response.data.message
        }
      }
      if (error && error.message && error.message !== 'TOKEN_REQUIRED') {
        return error.message
      }
      return fallback
    },
    toPercent (value) {
      const num = Number(value || 0)
      return `${(num * 100).toFixed(2)}%`
    },
    tagType (level) {
      if (level === 'error') return 'danger'
      if (level === 'warn') return 'warning'
      return 'success'
    },
    formatSignedNumber (value, digits = 2) {
      const num = Number(value || 0)
      if (!Number.isFinite(num)) return '-'
      if (num > 0) return `+${num.toFixed(digits)}`
      return num.toFixed(digits)
    },
    numberClass (value) {
      const num = Number(value || 0)
      if (!Number.isFinite(num) || num === 0) return 'num-neutral'
      return num > 0 ? 'num-positive' : 'num-negative'
    },
    shouldFlashPnl (value) {
      const num = Number(value || 0)
      const threshold = Number(this.settingsForm.pnl_flash_threshold || 100)
      return Number.isFinite(num) && Number.isFinite(threshold) && threshold > 0 && Math.abs(num) >= threshold
    },
    onPositionSortChange ({ prop, order }) {
      if (!prop || !order) return
      this.positionSortProp = prop
      this.positionSortOrder = order
    },
    onPositionSortOptionChange () {
      this.positionSortProp = this.positionSortProp || 'symbol'
      this.positionSortOrder = this.positionSortOrder || 'ascending'
    },
    resetKlineCardWindow () {
      this.visibleKlineCardCount = Math.min(4, this.sortedPositions.length || 0)
      this.$nextTick(() => {
        const container = this.$refs.klineCardList
        if (container) {
          container.scrollTop = 0
        }
      })
    },
    loadMoreKlineCards () {
      if (!this.hasMoreKlineCards) return
      this.visibleKlineCardCount = Math.min(
        this.visibleKlineCardCount + this.klineCardBatchSize,
        this.sortedPositions.length
      )
    },
    onKlineCardScroll (event) {
      const target = event && event.target
      if (!target) return
      const nearBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 120
      if (nearBottom) {
        this.loadMoreKlineCards()
      }
    },
    onKlineCardAction (payload) {
      if (!payload || !payload.action) return
      const symbol = payload.symbol || '-'
      const positionSide = payload.positionSide || '-'
      if (payload.action === 'refresh') {
        return
      }
      if (payload.action === 'close') {
        this.$message.info(`[待接入] ${symbol} ${positionSide} 平仓`)
        return
      }
      if (payload.action === 'add') {
        this.$message.info(`[待接入] ${symbol} ${positionSide} 加仓数量 ${payload.quantity || '-'}`)
        return
      }
      if (payload.action === 'updateStop') {
        this.$message.info(`[待接入] ${symbol} ${positionSide} 更新止损 ${payload.stopPrice || '-'}`)
        return
      }
      if (payload.action === 'updateTakeProfit') {
        this.$message.info(`[待接入] ${symbol} ${positionSide} 更新止盈 ${payload.takeProfitPrice || '-'}`)
      }
    },
    switchToPositionTab () {
      this.activeTab = 'position-order'
      this.loadPositionsAndOrders()
    },
    syncThemeHostClass () {
      if (typeof document === 'undefined' || !document.body) return
      document.body.classList.remove('control-theme-dark', 'control-theme-light')
      document.body.classList.add(`control-theme-${this.themeMode}`)
    },
    setThemeMode (isDark) {
      this.themeMode = isDark ? 'dark' : 'light'
      this.syncThemeHostClass()
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('control_theme', this.themeMode)
      }
      this.$nextTick(() => {
        this.renderMarginChart()
      })
    },
    toggleTheme () {
      this.setThemeMode(this.themeMode !== 'dark')
    },
    async saveToken () {
      if (!this.tokenInput) {
        this.$message.warning('请输入 token')
        return
      }
      this.tokenInput = String(this.tokenInput || '').trim()
      setApiToken(this.tokenInput)
      this.authPanelUserToggled = false
      this.syncAuthPanelVisibility('pending', { force: true })
      try {
        await getSystemOverview()
        await this.loadAll()
        this.syncAuthPanelVisibility('success', { force: true })
        this.$message.success('Token 已保存并验证成功')
      } catch (error) {
        if (this.isAuthError(error)) {
          this.syncAuthPanelVisibility('failed', { force: true })
          this.resetProtectedData()
          this.$message.error('Token 校验失败，请检查后重试')
          return
        }
        this.$message.warning('Token 已保存，鉴权结果暂时无法确认')
      }
    },
    removeToken () {
      clearApiToken()
      this.tokenInput = ''
      this.resetProtectedData()
      this.syncAuthPanelVisibility('missing', { force: true })
      this.$message.success('Token 已清空')
    },
    saveOperator () {
      const value = String(this.operatorInput || '').trim()
      if (!value) {
        this.$message.warning('请输入操作人')
        return
      }
      this.operatorInput = value
      setOperatorName(value)
      this.$message.success('操作人已保存')
    },
    removeOperator () {
      clearOperatorName()
      this.operatorInput = ''
      this.$message.success('操作人已清空')
    },
    saveRiskToken () {
      const value = String(this.riskTokenInput || '').trim()
      if (!value) {
        this.$message.warning('请输入高风险令牌')
        return
      }
      this.riskTokenInput = value
      setRiskToken(value)
      this.$message.success('高风险令牌已保存')
    },
    removeRiskToken () {
      clearRiskToken()
      this.riskTokenInput = ''
      this.$message.success('高风险令牌已清空')
    }
  }
}
</script>

<style scoped>
.control-page {
  --text-main: #1f2a37;
  --text-sub: #5f6b7a;
  --primary: #1f6feb;
  --primary-soft: #dce9ff;
  --primary-strong: #1557c0;
  --success: #1f9d70;
  --success-soft: rgba(31, 157, 112, 0.14);
  --warning: #c97c14;
  --warning-soft: rgba(201, 124, 20, 0.16);
  --danger: #cc3d3d;
  --danger-soft: rgba(204, 61, 61, 0.14);
  --text-strong: #1f3554;
  --text-soft-strong: #2f4260;
  --bg-layer-1: #f4f8ff;
  --bg-layer-2: #eef3fa;
  --bg-layer-3: #edf2f8;
  --card-bg: rgba(255, 255, 255, 0.92);
  --card-border: #d7e2f2;
  --card-header-bg: linear-gradient(90deg, #f8fbff 0%, #eef4ff 100%);
  --card-header-border: #dde8f8;
  --table-header-bg: #f4f8ff;
  --table-header-text: #2f4260;
  --table-row-bg: rgba(255, 255, 255, 0.92);
  --table-hover-bg: #edf4ff;
  --toolbar-bg: rgba(255, 255, 255, 0.85);
  --toolbar-border: #d9e4f6;
  --surface-soft: rgba(255, 255, 255, 0.7);
  --surface-strong: rgba(255, 255, 255, 0.96);
  --panel-muted-bg: rgba(241, 247, 255, 0.78);
  --button-default-bg: rgba(248, 251, 255, 0.94);
  --button-default-bg-hover: rgba(255, 255, 255, 0.98);
  --button-default-border: #cfdaea;
  --button-default-text: #274062;
  --dialog-bg: rgba(248, 251, 255, 0.98);
  --dialog-header-bg: linear-gradient(90deg, #f8fbff 0%, #eef4ff 100%);
  --input-bg: rgba(255, 255, 255, 0.94);
  --input-border: #cfdaea;
  --input-placeholder: #8a99ac;
  --scrollbar-track: rgba(219, 230, 245, 0.78);
  --scrollbar-thumb: rgba(122, 147, 182, 0.68);
  --scrollbar-thumb-hover: rgba(94, 121, 160, 0.86);

  padding: 16px;
  min-height: 100vh;
  color: var(--text-main);
  font-family: 'IBM Plex Sans', 'Source Han Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background:
    radial-gradient(circle at 2% 2%, rgba(198, 221, 255, 0.7), transparent 35%),
    radial-gradient(circle at 98% 0%, rgba(223, 237, 255, 0.85), transparent 30%),
    linear-gradient(180deg, var(--bg-layer-1) 0%, var(--bg-layer-2) 45%, var(--bg-layer-3) 100%);
}

.control-page.theme-dark {
  --text-main: #e8edf7;
  --text-sub: #9aa8bf;
  --primary: #69a8ff;
  --primary-soft: rgba(48, 78, 115, 0.72);
  --primary-strong: #8fc0ff;
  --success: #4fd6a2;
  --success-soft: rgba(79, 214, 162, 0.16);
  --warning: #ffb454;
  --warning-soft: rgba(255, 180, 84, 0.18);
  --danger: #ff7a7a;
  --danger-soft: rgba(255, 122, 122, 0.16);
  --text-strong: #f4f7ff;
  --text-soft-strong: #c9d4e8;
  --bg-layer-1: #121922;
  --bg-layer-2: #121a26;
  --bg-layer-3: #101722;
  --card-bg: rgba(19, 30, 43, 0.94);
  --card-border: #2a3c57;
  --card-header-bg: linear-gradient(90deg, #1d2d44 0%, #1a263b 100%);
  --card-header-border: #2c3e5b;
  --table-header-bg: #1a2a42;
  --table-header-text: #d8e2f2;
  --table-row-bg: rgba(20, 31, 46, 0.9);
  --table-hover-bg: rgba(35, 54, 80, 0.82);
  --toolbar-bg: rgba(19, 29, 44, 0.86);
  --toolbar-border: #2a3e5c;
  --surface-soft: rgba(16, 28, 43, 0.72);
  --surface-strong: rgba(23, 35, 51, 0.96);
  --panel-muted-bg: rgba(13, 24, 37, 0.72);
  --button-default-bg: rgba(24, 37, 55, 0.96);
  --button-default-bg-hover: rgba(36, 53, 76, 0.98);
  --button-default-border: #385372;
  --button-default-text: #e4ecfb;
  --dialog-bg: rgba(16, 26, 40, 0.98);
  --dialog-header-bg: linear-gradient(90deg, #22344d 0%, #18253a 100%);
  --input-bg: rgba(14, 24, 37, 0.9);
  --input-border: #355172;
  --input-placeholder: #7f93af;
  --scrollbar-track: rgba(17, 29, 43, 0.88);
  --scrollbar-thumb: rgba(76, 104, 138, 0.74);
  --scrollbar-thumb-hover: rgba(110, 143, 184, 0.9);

  background:
    radial-gradient(circle at 4% 4%, rgba(53, 83, 126, 0.35), transparent 35%),
    radial-gradient(circle at 97% 2%, rgba(32, 58, 94, 0.35), transparent 34%),
    linear-gradient(180deg, var(--bg-layer-1) 0%, var(--bg-layer-2) 45%, var(--bg-layer-3) 100%);
}

.theme-switch-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid var(--button-default-border);
  background: var(--button-default-bg);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.theme-switch-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.theme-switch-title {
  color: var(--text-strong);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.theme-switch-subtitle {
  color: var(--text-sub);
  font-size: 11px;
  line-height: 1;
}
.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--toolbar-bg);
  border: 1px solid var(--toolbar-border);
  backdrop-filter: blur(6px);
}
.section {
  margin-bottom: 16px;
}

.trend-filter-panel {
  display: block;
  width: 100%;
  margin: 6px 0 14px;
  padding: 14px;
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: var(--panel-muted-bg);
}

.trend-filter-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.trend-filter-title {
  color: var(--text-main);
  font-size: 15px;
  font-weight: 700;
}

.trend-filter-subtitle {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.trend-filter-status {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.log-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.auth-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.auth-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auth-card-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.log-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.log-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.log-dialog-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.log-filter-select {
  width: 120px;
}

.log-source-select {
  width: 132px;
}

.audit-filter-select {
  width: 140px;
}

.log-filter-input {
  width: 180px;
}

.log-filter-input-wide {
  width: 320px;
}

.log-filter-date {
  width: 240px;
}

.log-filter-date-wide {
  width: 260px;
}

.log-table {
  border-radius: 10px;
  overflow: hidden;
}

.control-page /deep/ .el-table__body-wrapper,
.control-page /deep/ .el-table__fixed-body-wrapper,
.control-page /deep/ .el-table__fixed-right .el-table__fixed-body-wrapper,
.control-page /deep/ .el-scrollbar__wrap,
.control-page /deep/ .kline-card-list {
  scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  scrollbar-width: thin;
}

.control-page /deep/ .el-table__body-wrapper::-webkit-scrollbar,
.control-page /deep/ .el-table__fixed-body-wrapper::-webkit-scrollbar,
.control-page /deep/ .el-table__fixed-right .el-table__fixed-body-wrapper::-webkit-scrollbar,
.control-page /deep/ .el-scrollbar__wrap::-webkit-scrollbar,
.control-page /deep/ .kline-card-list::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.control-page /deep/ .el-table__body-wrapper::-webkit-scrollbar-track,
.control-page /deep/ .el-table__fixed-body-wrapper::-webkit-scrollbar-track,
.control-page /deep/ .el-table__fixed-right .el-table__fixed-body-wrapper::-webkit-scrollbar-track,
.control-page /deep/ .el-scrollbar__wrap::-webkit-scrollbar-track,
.control-page /deep/ .kline-card-list::-webkit-scrollbar-track {
  background: var(--scrollbar-track);
  border-radius: 999px;
}

.control-page /deep/ .el-table__body-wrapper::-webkit-scrollbar-thumb,
.control-page /deep/ .el-table__fixed-body-wrapper::-webkit-scrollbar-thumb,
.control-page /deep/ .el-table__fixed-right .el-table__fixed-body-wrapper::-webkit-scrollbar-thumb,
.control-page /deep/ .el-scrollbar__wrap::-webkit-scrollbar-thumb,
.control-page /deep/ .kline-card-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.control-page /deep/ .el-table__body-wrapper::-webkit-scrollbar-thumb:hover,
.control-page /deep/ .el-table__fixed-body-wrapper::-webkit-scrollbar-thumb:hover,
.control-page /deep/ .el-table__fixed-right .el-table__fixed-body-wrapper::-webkit-scrollbar-thumb:hover,
.control-page /deep/ .el-scrollbar__wrap::-webkit-scrollbar-thumb:hover,
.control-page /deep/ .kline-card-list::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
  background-clip: padding-box;
}

.margin-chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.margin-chart-header-left {
  display: flex;
  align-items: center;
}

.margin-chart-header-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.margin-chart {
  width: 100%;
  height: 320px;
}

.tips {
  color: var(--text-sub);
  font-size: 12px;
  margin-top: 6px;
}

.tips-warning {
  color: #d6a23c;
}

.tips-error {
  color: #f56c6c;
}

.metric-title {
  color: var(--text-sub);
  font-size: 12px;
  letter-spacing: 0.2px;
}
.metric-value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 600;
  color: var(--text-strong);
}
.metric-value.small {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-soft-strong);
}
.metric-sub {
  margin-top: 6px;
  color: var(--text-sub);
  font-size: 12px;
}
.inline-hint {
  margin-left: 8px;
  color: var(--text-sub);
  font-size: 12px;
}
.audit-summary {
  color: var(--text-sub);
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.status-item {
  padding: 12px 14px;
  border: 1px solid var(--card-border);
  border-radius: 12px;
  background: var(--table-row-bg);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-label {
  font-size: 12px;
  color: var(--text-sub);
}

.status-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-strong);
}

.maintenance-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px dashed var(--card-border);
  background: var(--table-row-bg);
}

.maintenance-summary {
  margin-top: 6px;
  color: var(--text-main);
  line-height: 1.6;
}

.detail-drawer-body {
  padding: 0 18px 24px;
}

.detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  margin-bottom: 16px;
}

.detail-meta-grid > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-label {
  font-size: 12px;
  color: var(--text-sub);
}

.detail-section {
  margin-bottom: 14px;
}

.detail-pre {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--table-header-bg);
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
.confirm-desc {
  margin-bottom: 12px;
  color: var(--text-sub);
}

.kline-card-list {
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px dashed var(--card-border);
  border-radius: 12px;
  padding: 10px;
  background: var(--surface-soft);
}

.kline-list-footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-sub);
  padding: 8px 0 2px;
}

.control-page /deep/ .el-card {
  border: 1px solid var(--card-border);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: 0 10px 28px rgba(31, 62, 104, 0.07);
}

.control-page /deep/ .el-card__header {
  padding: 12px 16px;
  background: var(--card-header-bg);
  border-bottom: 1px solid var(--card-header-border);
  color: var(--text-strong);
  font-weight: 600;
}

.control-page /deep/ .el-card__body {
  padding: 14px 16px;
}

.control-page /deep/ .el-tabs__item {
  color: var(--text-sub);
}

.control-page /deep/ .el-tabs__item:hover {
  color: var(--text-strong);
}

.control-page /deep/ .el-tabs__item.is-active {
  color: var(--primary);
  font-weight: 600;
}

.control-page /deep/ .el-tabs__active-bar {
  background-color: var(--primary);
}

.control-page /deep/ .el-button {
  border-radius: 10px;
  font-weight: 500;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
}

.control-page /deep/ .el-button--default {
  background: var(--button-default-bg);
  border-color: var(--button-default-border);
  color: var(--button-default-text);
}

.control-page /deep/ .el-button--default:hover,
.control-page /deep/ .el-button--default:focus {
  background: var(--button-default-bg-hover);
  border-color: var(--primary);
  color: var(--text-strong);
}

.control-page /deep/ .el-button--primary {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%);
  border-color: var(--primary);
  color: #f8fbff;
  box-shadow: 0 8px 18px rgba(31, 111, 235, 0.18);
}

.control-page /deep/ .el-button--primary.is-plain {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--primary-soft);
}

.control-page /deep/ .el-button--success.is-plain {
  color: var(--success);
  border-color: var(--success);
  background: var(--success-soft);
}

.control-page /deep/ .el-button--warning.is-plain {
  color: var(--warning);
  border-color: var(--warning);
  background: var(--warning-soft);
}

.control-page /deep/ .el-button--danger.is-plain {
  color: var(--danger);
  border-color: var(--danger);
  background: var(--danger-soft);
}

.control-page /deep/ .el-button--text {
  color: var(--primary);
}

.control-page /deep/ .el-button--text:hover,
.control-page /deep/ .el-button--text:focus {
  color: var(--primary-strong);
  background: var(--primary-soft);
}

.control-page /deep/ .el-table th {
  background: var(--table-header-bg);
  color: var(--table-header-text);
}

.control-page /deep/ .el-table tr {
  background: var(--table-row-bg);
}

.control-page /deep/ .el-table tbody tr:hover > td {
  background: var(--table-hover-bg) !important;
}

.control-page /deep/ .el-table,
.control-page /deep/ .el-table td,
.control-page /deep/ .el-table th.is-leaf {
  border-color: var(--card-border);
  color: var(--text-main);
}

.control-page /deep/ .el-table,
.control-page /deep/ .el-table__expanded-cell {
  background: var(--table-row-bg);
}

.control-page.theme-dark /deep/ .el-table--striped .el-table__body tr.el-table__row--striped td,
.control-page.theme-dark /deep/ .el-table--striped .el-table__body tr.el-table__row--striped td.el-table__cell {
  background: rgba(25, 39, 58, 0.94);
}

.control-page /deep/ .el-table__expanded-cell {
  color: var(--text-main);
}

.control-page /deep/ .el-table__empty-text {
  color: var(--text-sub);
}

.control-page /deep/ .el-tabs__nav-wrap::after {
  background-color: var(--card-border);
}

.control-page /deep/ .change-request-table .el-table__body-wrapper .cell {
  line-height: 1.5;
}

.control-page /deep/ .change-request-table .el-tag {
  min-width: 56px;
  text-align: center;
}

.control-page /deep/ .el-input__inner,
.control-page /deep/ .el-textarea__inner {
  background: var(--input-bg);
  border-color: var(--input-border);
  color: var(--text-main);
}

.control-page.theme-dark /deep/ .el-input__inner,
.control-page.theme-dark /deep/ .el-textarea__inner,
.control-page.theme-dark /deep/ .el-range-editor,
.control-page.theme-dark /deep/ .el-input-group__append,
.control-page.theme-dark /deep/ .el-input-group__prepend {
  background: rgba(14, 24, 37, 0.96) !important;
  border-color: #355172 !important;
  color: #e8edf7 !important;
}

.control-page.theme-dark /deep/ .el-input__inner,
.control-page.theme-dark /deep/ .el-textarea__inner,
.control-page.theme-dark /deep/ .el-range-input {
  -webkit-text-fill-color: #e8edf7;
  caret-color: #8fc0ff;
}

.control-page.theme-dark /deep/ .el-select .el-input__inner,
.control-page.theme-dark /deep/ .el-date-editor .el-input__inner,
.control-page.theme-dark /deep/ .el-date-editor .el-range-input,
.control-page.theme-dark /deep/ .el-input-number .el-input__inner {
  background: rgba(14, 24, 37, 0.96) !important;
  border-color: #355172 !important;
  color: #e8edf7 !important;
}

.control-page.theme-dark /deep/ .el-input.is-disabled .el-input__inner,
.control-page.theme-dark /deep/ .el-textarea.is-disabled .el-textarea__inner,
.control-page.theme-dark /deep/ .el-range-editor.is-disabled,
.control-page.theme-dark /deep/ .el-range-editor.is-disabled .el-range-input {
  background: rgba(20, 31, 46, 0.78);
  border-color: #2f4561;
  color: #8fa1bc;
}

.control-page.theme-dark /deep/ .el-range-editor.is-disabled .el-range-separator,
.control-page.theme-dark /deep/ .el-input.is-disabled .el-input__icon,
.control-page.theme-dark /deep/ .el-select .el-input.is-disabled .el-select__caret {
  color: #70829e;
}

.control-page.theme-dark /deep/ .el-select .el-input.is-disabled .el-input__inner {
  background: rgba(20, 31, 46, 0.78);
  border-color: #2f4561;
  color: #8fa1bc;
}

.control-page.theme-dark /deep/ .el-input.is-disabled .el-input__inner::placeholder,
.control-page.theme-dark /deep/ .el-textarea.is-disabled .el-textarea__inner::placeholder,
.control-page.theme-dark /deep/ .el-range-editor.is-disabled .el-range-input::placeholder {
  color: #6e809a;
}

.control-page /deep/ .el-input__inner::placeholder,
.control-page /deep/ .el-textarea__inner::placeholder {
  color: var(--input-placeholder);
}

.control-page.theme-dark /deep/ .el-input__inner::placeholder,
.control-page.theme-dark /deep/ .el-textarea__inner::placeholder,
.control-page.theme-dark /deep/ .el-range-input::placeholder {
  color: #7f93af;
  -webkit-text-fill-color: #7f93af;
}

.control-page /deep/ .el-input__inner:hover,
.control-page /deep/ .el-textarea__inner:hover,
.control-page /deep/ .el-input__inner:focus,
.control-page /deep/ .el-textarea__inner:focus {
  border-color: var(--primary);
}

.control-page /deep/ .el-form-item__label,
.control-page /deep/ .el-checkbox__label,
.control-page /deep/ .el-radio__label,
.control-page /deep/ .el-select .el-input .el-select__caret,
.control-page /deep/ .el-input__icon {
  color: var(--text-sub);
}

.control-page /deep/ .el-input-number__decrease,
.control-page /deep/ .el-input-number__increase {
  background: var(--button-default-bg);
  border-color: var(--input-border);
  color: var(--text-sub);
}

.control-page /deep/ .el-input-number__decrease:hover,
.control-page /deep/ .el-input-number__increase:hover {
  color: var(--text-strong);
}

.control-page /deep/ .el-input-number__decrease {
  border-right-color: var(--input-border);
}

.control-page /deep/ .el-input-number__increase {
  border-left-color: var(--input-border);
}

.control-page /deep/ .el-switch__label {
  color: var(--text-sub);
}

.control-page /deep/ .el-switch__label.is-active {
  color: var(--text-strong);
}

.control-page.theme-dark /deep/ .el-switch__core {
  background: #22354f;
  border-color: #355172;
}

.control-page.theme-dark /deep/ .el-switch.is-checked .el-switch__core {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%);
  border-color: var(--primary);
}

.control-page.theme-dark /deep/ .el-switch.is-disabled {
  opacity: 1;
}

.control-page.theme-dark /deep/ .el-switch.is-disabled .el-switch__core {
  background: rgba(43, 60, 84, 0.86);
  border-color: #324967;
}

.control-page.theme-dark /deep/ .el-switch.is-disabled.is-checked .el-switch__core {
  background: rgba(84, 132, 199, 0.52);
  border-color: rgba(84, 132, 199, 0.72);
}

.control-page.theme-dark /deep/ .el-switch.is-disabled .el-switch__label {
  color: #7f90aa;
}

.control-page /deep/ .el-radio-button__inner {
  background: var(--button-default-bg);
  border-color: var(--input-border);
  color: var(--button-default-text);
}

.control-page /deep/ .el-radio-button:first-child .el-radio-button__inner {
  border-left-color: var(--input-border);
}

.control-page /deep/ .el-radio-button__orig-radio:checked + .el-radio-button__inner {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-strong) 100%);
  border-color: var(--primary);
  color: #f8fbff;
  box-shadow: none;
}

.control-page /deep/ .el-dialog,
.control-page /deep/ .el-drawer {
  background: var(--dialog-bg);
  color: var(--text-main);
}

.control-page /deep/ .el-dialog__header,
.control-page /deep/ .el-drawer__header {
  margin-bottom: 0;
  padding: 16px 20px 14px;
  background: var(--dialog-header-bg);
  border-bottom: 1px solid var(--card-header-border);
}

.control-page /deep/ .el-dialog__title,
.control-page /deep/ .el-drawer__header span,
.control-page /deep/ .el-dialog__headerbtn .el-dialog__close,
.control-page /deep/ .el-drawer__close-btn {
  color: var(--text-strong);
}

.control-page /deep/ .el-dialog__body,
.control-page /deep/ .el-dialog__footer,
.control-page /deep/ .el-drawer__body {
  background: var(--dialog-bg);
  color: var(--text-main);
}

.control-page /deep/ .el-dialog__footer {
  border-top: 1px solid var(--card-border);
}

.control-page.theme-dark /deep/ .el-table::before {
  background-color: var(--card-border);
}

.control-page.theme-dark /deep/ .el-table--border::after,
.control-page.theme-dark /deep/ .el-table--group::after,
.control-page.theme-dark /deep/ .el-table::before {
  background-color: var(--card-border);
}

.control-page /deep/ .el-tag {
  border-radius: 999px;
  border-color: transparent;
  padding: 0 10px;
}

.control-page /deep/ .el-tag--info {
  background: var(--button-default-bg);
  color: var(--button-default-text);
}

.control-page /deep/ .el-tag--success {
  background: var(--success-soft);
  color: var(--success);
}

.control-page /deep/ .el-tag--warning {
  background: var(--warning-soft);
  color: var(--warning);
}

.control-page /deep/ .el-tag--danger {
  background: var(--danger-soft);
  color: var(--danger);
}

.theme-switch-pill /deep/ .el-switch__core {
  border-color: var(--button-default-border);
}

.num-positive {
  color: #158f56;
  font-weight: 600;
}

.num-negative {
  color: #d94848;
  font-weight: 600;
}

.num-neutral {
  color: var(--text-sub);
}

.control-page.theme-dark .num-positive {
  color: #51d49f;
}

.control-page.theme-dark .num-negative {
  color: #ff8080;
}

.num-flash {
  animation: pnlPulse 1.15s ease-in-out infinite;
}

@keyframes pnlPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.55;
  }
}

@media (max-width: 768px) {
  .control-page {
    padding: 12px;
  }

  .toolbar {
    position: static;
    padding: 8px;
  }

  .theme-switch-pill {
    width: 100%;
    justify-content: space-between;
  }
}
</style>

<style>
body.control-theme-dark .v-modal {
  background: rgba(7, 14, 24, 0.82);
}

body.control-theme-dark .el-message-box,
body.control-theme-dark .el-select-dropdown,
body.control-theme-dark .el-dropdown-menu,
body.control-theme-dark .el-picker-panel {
  background: #132033;
  border-color: #304863;
  color: #e8edf7;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.38);
}

body.control-theme-dark .el-message-box__title,
body.control-theme-dark .el-message-box__close,
body.control-theme-dark .el-select-dropdown__item,
body.control-theme-dark .el-dropdown-menu__item,
body.control-theme-dark .el-picker-panel__icon-btn,
body.control-theme-dark .el-date-picker__header-label {
  color: #e8edf7;
}

body.control-theme-dark .el-message-box__header {
  border-bottom: 1px solid #304863;
}

body.control-theme-dark .el-message-box__content,
body.control-theme-dark .el-message-box__message p,
body.control-theme-dark .el-select-dropdown__empty,
body.control-theme-dark .el-picker-panel__footer {
  color: #a6b6cf;
}

body.control-theme-dark .el-message-box__input input {
  background: #101a29;
  border-color: #385372;
  color: #e8edf7;
}

body.control-theme-dark .el-message-box__input input::placeholder {
  color: #7f93af;
}

body.control-theme-dark .el-message-box__btns {
  border-top: 1px solid #304863;
}

body.control-theme-dark .el-message-box__btns .el-button--default {
  background: #1a2a40;
  border-color: #385372;
  color: #e8edf7;
}

body.control-theme-dark .el-message-box__btns .el-button--default:hover,
body.control-theme-dark .el-message-box__btns .el-button--default:focus {
  background: #243753;
  border-color: #69a8ff;
  color: #f4f7ff;
}

body.control-theme-dark .el-message-box__btns .el-button--primary {
  background: linear-gradient(135deg, #69a8ff 0%, #8fc0ff 100%);
  border-color: #69a8ff;
  color: #f8fbff;
}

body.control-theme-dark .el-select-dropdown__item.hover,
body.control-theme-dark .el-select-dropdown__item:hover,
body.control-theme-dark .el-dropdown-menu__item:focus,
body.control-theme-dark .el-dropdown-menu__item:not(.is-disabled):hover {
  background: rgba(55, 82, 116, 0.68);
  color: #f4f7ff;
}

body.control-theme-dark .el-select-dropdown__item.selected {
  color: #8fc0ff;
  font-weight: 600;
}

body.control-theme-dark .el-picker-panel__content td.available:hover span,
body.control-theme-dark .el-date-table td.available:hover {
  color: #8fc0ff;
}

body.control-theme-dark .el-date-table td.current:not(.disabled) span,
body.control-theme-dark .el-date-table td.today span {
  color: #8fc0ff;
}
</style>
