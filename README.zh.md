<p align="center">
  <img src="assets/icon.svg" width="96" height="96" alt="dsh-find-in-conversation 图标">
</p>

<h1 align="center">dsh-find-in-conversation</h1>

<p align="center">
  为 DeepSeek Harness 当前会话提供一个 macOS 风格的查找条。
</p>

<p align="center">
  <a href="https://github.com/donggongailv/dsh-find-in-conversation/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/donggongailv/dsh-find-in-conversation/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/donggongailv/dsh-find-in-conversation/blob/main/LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-blue.svg"></a>
  <a href="https://github.com/donggongailv/dsh-find-in-conversation"><img alt="DeepSeek Harness plugin" src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-4c6ef5"></a>
</p>

[English](README.md) | 中文

## 为什么做这个

DeepSeek Harness 的会话通常是一条很长的滚动记录。这个插件增加一个键盘优先的查找条，让你在匹配项之间跳转时不会丢失当前阅读位置。

它刻意保持为纯客户端插件：不注册 Host 工具、不写入 Session、不发起网络请求，也不改写会话正文。

## 功能

- **从当前位置开始**：优先选择当前视口内第一个**完整可见**的匹配项；只露出边缘的不算，会继续找下一个完整可见项。
- **区分翻页与同屏**：同屏匹配只做最小滚动；另一屏的匹配会移到视口中央，方便立刻看到。
- **导航跟随视口**：手动滚动后，下一次 `⌘G` / `⇧⌘G` 会先重新锚定到当前屏幕第一个完整可见的匹配项，而不是从旧的当前项继续；之后再按才会从新锚点前后移动。
- **清晰的黄色高亮**：所有匹配使用 `#FFFB00` 背景 + 黑色文字。
- **当前项动效**：当前项先保持黄色，并显示一个约 500ms 的放大光环，然后切换为 `#B4D8FD` 背景 + 黑色文字。
- **按行绘制光环**：跨行匹配会按实际行分段，不会出现包住所有行的大矩形。
- **循环提示**：从末项回到首项、或从首项回到末项时，视口中央偏上会短暂显示提示。
- **输入法友好**：中文/日文候选框打开时暂停搜索并清除高亮，候选确认后再搜索最终文本。
- **快捷键不越界**：只在焦点位于会话内、查找按钮上、页面本身无焦点，或查找条已打开时接管快捷键。设置、侧栏、终端等区域保持原行为。
- **中英文界面**：UI 文案和插件元数据均支持中英文。

## 快捷键

| macOS              | Windows / Linux         | 作用                                         |
| ------------------ | ----------------------- | -------------------------------------------- |
| `⌘F`               | `Ctrl+F`                | 打开查找条并聚焦输入框；已打开时重新选中文本 |
| `⌘G`               | `Ctrl+G`                | 下一项                                       |
| `⇧⌘G`              | `Ctrl+Shift+G`          | 上一项                                       |
| `Esc`              | `Esc`                   | 关闭查找条并恢复原焦点                       |
| `Enter` / `⇧Enter` | `Enter` / `Shift+Enter` | 输入框内下一项 / 上一项                      |

macOS 上不会拦截 `Ctrl+F`；Windows/Linux 上不会拦截 `Meta` 组合。

## 安装

bundle 名称为 **`dsh-find-in-conversation`**。在 npm 发布之前，可以直接从
GitHub 安装。

### 从 GitHub 安装

打开 DeepSeek Harness 的 **Plugins** 页面，从外部 bundle 安装：

```text
git+https://github.com/donggongailv/dsh-find-in-conversation.git
```

也可以使用 DSH CLI（profile 参数请以当前版本的 `dsh plugin --help` 为准）：

```bash
dsh plugin --profile <profile> install git+https://github.com/donggongailv/dsh-find-in-conversation.git
```

启用插件，打开一个会话，在 macOS 上按 `⌘F`，在 Windows/Linux 上按 `Ctrl+F`。

### 从 npm 安装

npm 发布后：

```bash
dsh plugin --profile <profile> install dsh-find-in-conversation
```

也可以在 DSH 的 **Plugins** 页面按包名安装。

### 从源码安装

开发时先克隆仓库，再通过 DSH Plugin Manager 安装目录，或加入 profile 的
bundle 列表：

```bash
git clone https://github.com/donggongailv/dsh-find-in-conversation.git
cd dsh-find-in-conversation
npm install
npm test
```

要求：

- DeepSeek Harness `>=0.2.2-rc.1 <0.3.0-0`
- 支持 CSS Custom Highlight API 的 Chromium 内核 DSH 客户端
- macOS、Windows 或 Linux

插件为纯客户端，没有服务端配置。

## 实现说明

- 查找条注册在 `conversation.session.header.actions`，固定定位 UI 通过 body portal 渲染。
- 搜索只遍历当前 `[data-conversation-session]` 内的文本节点，排除输入框、侧栏和插件自身界面。
- 匹配使用 `CSS.highlights` 绘制，不包裹、不改写会话 DOM。
- 通过防抖的 `MutationObserver` 在流式输出或展开/折叠内容时刷新结果。
- 定时器、观察器、监听器、样式和 locale 注册都由 React/Cordis effect 管理；关闭查找条、HMR 或卸载插件时会清理。

## 范围与限制

- 只搜索当前已渲染的会话内容；尚未加载的历史、虚拟化行和不在 DOM 中的折叠内容无法搜索。
- 搜索是字面文本匹配，不支持正则或模糊搜索。
- 依赖浏览器的 CSS Custom Highlight API；不支持该 API 时仍可计数和导航，但不会绘制高亮。
- 由于 CSS Highlight API 不能直接缩放文字，当前项的“放大”由外圈光环完成；黄色背景本身是精确的。
- 图标是为本项目原创绘制的 SVG，视觉风格与 DSH 内置插件保持一致，随项目以 MIT 协议分发。

## 开发

```bash
git clone https://github.com/donggongailv/dsh-find-in-conversation.git
cd dsh-find-in-conversation
npm install
npm test
npm run check
npm run format:check
```

没有构建步骤：`client.js` 就是 Harness 模块加载器直接加载的浏览器模块，React 和 React DOM 由平台提供，不打包进插件。

`npm test` 校验清单、patch、locale、客户端入口、图标和许可证文件；`npm run check` 额外运行 `node --check client.js`。

## 项目结构

| 路径                       | 用途                                        |
| -------------------------- | ------------------------------------------- |
| `client.js`                | 完整客户端插件：UI、搜索、高亮、快捷键      |
| `index.js`                 | Host 半侧入口；插件为纯客户端，因此为空实现 |
| `package.json`             | 包元数据与 DSH client/bundle 声明           |
| `cordis.patch.yml`         | 插入 `dsh-find-in-conversation` 插件行      |
| `locale/`                  | Plugin Manager 使用的标题与描述             |
| `assets/icon.svg`          | 与 DSH 内置插件同风格的原创矢量图标         |
| `test/`                    | 清单、资源和打包检查                        |
| `.github/workflows/ci.yml` | 格式化与测试 CI                             |

## 链接

- [仓库](https://github.com/donggongailv/dsh-find-in-conversation)
- [Issues](https://github.com/donggongailv/dsh-find-in-conversation/issues)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [更新日志](CHANGELOG.md)

## 许可证

[MIT](LICENSE) © imhansai。

图标是为本项目原创绘制的 SVG，随项目以 MIT 协议分发。
