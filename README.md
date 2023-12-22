# 量化交易系统前端界面

这是一个使用Vue构建的量化交易系统的前端界面，该界面通过调用`binan`项目中的接口来实现功能，并部署在`binan`项目的Node程序中。

## 功能特点

- 提供用户友好的界面，方便用户进行量化交易操作。
- 调用`binan`项目中的接口，获取实时市场数据、执行交易等操作。
- 支持各种交易策略的配置和管理。
- 提供丰富的图表和数据展示，帮助用户分析市场趋势和交易结果。
- 整合了常见的技术指标和分析工具，辅助用户进行决策和风险控制。

## 环境要求

在运行该前端界面之前，请确保已经满足以下环境要求：

- Node.js
- npm 或 yarn

## 安装和运行

1. 克隆本仓库到本地：

```
git clone https://github.com/shiki2014/binan-view
```

2. 进入项目目录：

```
cd binan-view
```

3. 安装依赖：

如果使用 npm：

```
npm install
```

如果使用 yarn：

```
yarn install
```

4. 配置接口地址：

打开项目根目录下的 `.env` 文件，将接口地址修改为`binan`项目中的接口地址：

```
VUE_APP_API_URL=http://your-binan-api-url.com
```

5. 启动前端服务：

如果使用 npm：

```
npm run dev
```

如果使用 yarn：

```
yarn dev
```

6. 打开浏览器，访问 `http://localhost:8080`，即可进入量化交易系统的前端界面。

## 配置和使用

在界面中，你可以进行以下操作：

- 登录/注册账号。
- 查看实时市场数据。
- 编写和管理交易策略。
- 执行交易和查看交易记录。
- 分析交易结果和市场趋势。

## 贡献

如果你发现了任何问题或有改进建议，欢迎提交 Issue 或 Pull Request。感谢你的贡献！

## 许可证

该项目采用 MIT 许可证。详细信息请参阅 [LICENSE](./LICENSE) 文件。

## 联系方式

如有任何疑问，请联系：
- 作者：Your Name
- 邮箱：your.email@example.com
