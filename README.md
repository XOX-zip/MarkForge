# 🛠️ MarkForge

> ✍️ 一个专注书写的专业级 Markdown 在线编辑器  
> 由 **MarkSkecher** 设计与开发

![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Dependencies](https://img.shields.io/badge/Dependencies-0-brightgreen?style=for-the-badge)
![SPA](https://img.shields.io/badge/SPA-Single%20Page-orange?style=for-the-badge)
![Made with](https://img.shields.io/badge/Made%20with-HTML%20%7C%20CSS%20%7C%20JS-yellow?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)
[![GitHub](https://img.shields.io/badge/GitHub-XOX--zip%2FMarkForge-181717?style=for-the-badge&logo=github)](https://github.com/XOX-zip/MarkForge)

MarkForge 是一个 **零依赖、单页运行** 的 Markdown 编辑器。界面借鉴专业软件的分区布局，却始终保持轻盈、克制与舒适。所有数据只在本地处理，从不上传。

---

## ✨ 简介

MarkForge 把「写」和「看」放在一起。左侧敲 Markdown 源码，右侧实时渲染成排版精美的文档。

它不需要安装、不需要构建、不需要联网——打开 `index.html` 就能用。整个项目由三个文件组成：`index.html`、`styles.css`、`app.js`，没有任何第三方依赖。

它的目标只有一个：**让你专注于内容本身。**

---

## 🚀 核心特性

### 🖥️ 编辑与预览

| 特性 | 说明 |
| --- | --- |
| **双栏实时预览** | 左写右看，即改即现；拖动中间分隔条可自由调整两栏比例 |
| **三种布局** | 一键切换「仅编辑器」「分栏」「仅预览」 |
| **同步滚动** | 编辑区与预览区按比例映射，无论文档多长，两边始终保持对齐 |

> **关于滚动同步的顺滑度**
> 为了做到顺滑无抽搐，滚动同步采用了**缓存尺寸 + 帧级驱动锁**的方案：谁在驱动滚动，持锁窗口内另一栏的回声事件就被忽略。程序化滚动一律即时执行，绕过 CSS 的平滑动画，避免回灌。

### 🧠 解析与高亮

**自研 Markdown 解析器**，支持：

- **块级**：1–6 级标题、段落、引用、分隔线、围栏代码块、表格、有序列表、无序列表、嵌套列表、任务清单、原生 `<details>` 折叠块
- **行内**：超链接、图片、行内代码，以及加粗、斜体、删除线、高亮等文本格式

**内置轻量语法高亮器**，无第三方依赖：

- 支持 **JavaScript、TypeScript、Python、Ruby、Bash、YAML、HTML、CSS、JSON、Markdown、SQL、Go、Rust、Java、C、C++** 等十余种语言
- 按语言**预编译正则数组**，顺序敏感处理，注释与字符串优先匹配
- 使用 **LRU 缓存**避免重复解析
- 超长代码自动降级为纯文本，保证性能

### ⚡ 效率工具

| 功能 | 说明 |
| --- | --- |
| **命令面板** | `Ctrl + P` 唤出，模糊搜索全部操作，按文件、格式、插入、视图、主题、帮助分类展示，键盘流用户的福音 |
| **文档大纲** | 左侧面板自动生成标题导航，点击任意标题即可跳转 |
| **实时统计** | 右侧面板显示字数、字符数、行数、段落数、标题数及预计阅读时长；状态栏实时显示光标行列与选中字符数 |

### 🎨 外观与文件

**主题系统。** 支持浅色、深色、跟随系统三种模式，另有六种强调色（蓝、紫、粉、橙、绿、青）可选。主题基于 CSS 变量实现，切换无闪烁，首屏加载前即已应用。

**文件操作。**

- `Ctrl + S` 保存为 `.md`
- `Ctrl + Shift + S` 导出带完整样式的独立 HTML 页面
- 可打开本地 `.md`、`.markdown`、`.txt` 文件
- 文档内容**不再自动保存**到本地；若关闭页面前尚有未保存修改，浏览器会提醒你

---

## 🏁 快速开始

MarkForge 是纯静态单页应用，无需构建、无需安装依赖。

### 方式一：直接打开

```bash
git clone https://github.com/XOX-zip/MarkForge.git
cd MarkForge
# 双击 index.html 即可运行
```

### 方式二：本地服务器

推荐使用，避免个别浏览器的本地文件限制。

```bash
python -m http.server 8000
# 或
npx serve .
```

然后访问 `http://localhost:8000`。

### 📂 项目目录结构

```
MarkForge/
├── index.html    # 页面结构
├── styles.css    # 样式表
├── app.js        # 应用逻辑
├── LICENSE       # 开源许可证
└── README.md
```

---

## ⌨️ 快捷键

### ✏️ 编辑

| 快捷键 | 操作 | 快捷键 | 操作 |
| --- | --- | --- | --- |
| `Ctrl + B` | 加粗 | `Ctrl + Z` | 撤销 |
| `Ctrl + I` | 斜体 | `Ctrl + Y` | 重做 |
| `Ctrl + K` | 插入链接 | `Tab` | 增加缩进 |
| `Shift + Tab` | 减少缩进 | | |

### 📁 文件

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl + N` | 新建文档 |
| `Ctrl + O` | 打开文件 |
| `Ctrl + S` | 保存为 `.md` |
| `Ctrl + Shift + S` | 导出 HTML |

### 👁️ 视图

| 快捷键 | 操作 | 快捷键 | 操作 |
| --- | --- | --- | --- |
| `Ctrl + P` | 打开命令面板 | `Ctrl + Shift + B` | 切换右侧面板 |
| `Ctrl + 1` | 仅编辑器 | `F11` | 全屏 |
| `Ctrl + 2` | 分栏 | `Esc` | 关闭弹窗或面板 |
| `Ctrl + 3` | 仅预览 | | |

---

## 📝 Markdown 语法速查

| 效果 | 语法 |
| --- | --- |
| **粗体** | `**粗体**` |
| *斜体* | `*斜体*` |
| ~~删除线~~ | `~~删除线~~` |
| 高亮 | `==高亮==` |
| 行内代码 | `` `行内代码` `` |
| 1–6 级标题 | `#` 到 `######` |
| 引用 | `>` |
| 分隔线 | `---` |
| 无序列表 | `-` |
| 有序列表 | `1.` |
| 未完成任务 | `- [ ]` |
| 已完成任务 | `- [x]` |
| 链接 | `[文字](url)` |
| 图片 | `![描述](地址)` |
| 折叠块 | `<details>` 与 `<summary>` |
| 代码块 | 三个反引号包裹，并在起始处标注语言，例如 `javascript` |
| 表格 | 用竖线分隔列，第二行用 `---` 控制对齐 |

---

## 🧩 技术实现

| 模块 | 方案 |
| --- | --- |
| 渲染引擎 | 原生 JavaScript，无任何第三方依赖 |
| 语法高亮 | 按语言预编译正则数组 + LRU 缓存 |
| 滚动同步 | 缓存尺寸 + 驱动锁 + 即时滚动 |
| 主题系统 | CSS 变量 + `prefers-color-scheme` 媒体查询 |
| 渲染节流 | 时间片合并 + `requestAnimationFrame` |
| 用户设置 | 保存于 `localStorage`；**文档内容不入本地存储** |

---

## ⚙️ 可配置项

右侧面板提供丰富的编辑器设置，全部保存于浏览器本地，可通过「恢复默认设置」一键重置。

| 配置项 | 可选值 / 范围 |
| --- | --- |
| 编辑器字体 | 等宽 / 系统 / 衬线 |
| Tab 宽度 | 2 / 4 / 8 |
| 字号 | 11 – 20 px |
| 行高 | 1.3 – 2.4 |
| 预览宽度 | 560 – 1400 px（1400 表示铺满） |
| 渲染节流 | 0 – 200 ms |
| 同步滚动 | 开 / 关 |
| 自动换行 | 开 / 关 |
| 显示行号 | 开 / 关 |
| 拼写检查 | 开 / 关 |
| 平滑滚动 | 开 / 关 |

---

## 🌐 浏览器支持

推荐使用现代浏览器：

| 浏览器 | 最低版本 |
| --- | --- |
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

需支持 CSS 自定义属性、Pointer Events、`matchMedia`、`requestAnimationFrame` 等特性。

---

## 📌 说明

- 所有文档内容**仅在你的浏览器内存中处理**，不会上传到任何服务器。
- 文档内容**不会自动保存到本地**，请按 `Ctrl + S` 导出 `.md` 文件来保存。
- GitHub 仓库地址：`https://github.com/XOX-zip/MarkForge`
  一般网络可能连不上，建议开启加速器（如瓦特工具箱）。

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request。

---

## 📄 许可证

本项目基于 **MIT License** 开源。

Copyright © 2026 MarkSkecher。保留所有权利。
