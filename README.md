# 考试粥助手

AI 驱动的本地化学习与考试辅助工具。上传学习资料，AI 自动生成复习纲要、学习笔记和练习题，支持刷题、错题追踪和针对性训练。**所有数据存储在本地浏览器，不依赖云端服务。**

---

## 快速开始

### 新用户（首次安装）

```bash
git clone https://github.com/zjuhechao/exam-porridge-assistant.git
cd exam-porridge-assistant
npm install
npm run dev
```

浏览器打开 `http://localhost:3015` 即可使用。

> 如果 `npm install` 很慢，切换到国内镜像：
> ```bash
> npm config set registry https://registry.npmmirror.com
> npm install
> ```

### 老用户（更新到最新版本）

在项目目录中执行：

```bash
git pull
npm install
npm run dev
```

> **注意**：如果提示有本地修改冲突，先暂存再拉取：
> ```bash
> git stash
> git pull
> git stash pop
> npm install
> ```
>
> **如果是从 v1.x 升级**（旧版名为 `personal-study-assistant`）：旧数据在 `personal-study-assistant` 的 IndexedDB 中，新版数据库名为 `StudyAssistantDB`，是全新的，需要重新上传资料和配置 API。

---

## 桌面应用（Electron）

支持 Windows / macOS / Linux 桌面应用，无需手动打开浏览器。

```bash
npm run electron:dev     # 开发模式（热更新）
npm run electron:build   # 打包安装程序（.exe / .dmg / .AppImage）
```

打包产物在 `release/` 目录。给 `src/assets/icon.png` 放一张 256x256 的图标即可自动生成带图标的应用。

---

## 配置 AI 功能

生成题目、纲要、笔记、OCR 识别需要 AI API。

### 获取 API Key（任选一个）

| 服务商 | 地址 | 特点 |
|--------|------|------|
| DeepSeek | https://platform.deepseek.com | 国内直连，价格低 |
| 通义千问 | https://dashscope.console.aliyun.com | 有免费额度 |
| OpenAI | https://platform.openai.com | 需海外网络 |

### 在应用中配置

1. 打开应用 → 导航栏 **设置** → **添加 API 配置**
2. 以 DeepSeek 为例：

| 字段 | 值 |
|------|-----|
| API Key | `sk-xxxxxxxx`（你的密钥） |
| API Base URL | `https://api.deepseek.com` |
| 模型名称 | `deepseek-chat` |

3. 保存后在 **功能 API 分配** 中为各功能指定配置 → 点 **保存设置**

> **OCR 功能**需要多模态模型（如 `gpt-4o`），普通文本模型不支持图片识别。

---

## 使用流程

1. **课程管理** — 创建课程，所有学习资料按课程隔离
2. **知识库** — 上传 PDF / DOCX / TXT / 图片，或粘贴网页链接自动抓取
3. **复习助手** — 选择文档，AI 生成复习纲要和学习笔记
4. **智能答题** — AI 根据资料出题，支持选择题/填空题/判断题/简答题
5. **错题本** — 自动收集错题，支持错题重练和针对性出题

---

## 环境准备（零基础详细版）

<details>
<summary><b>展开查看完整安装教程（Windows / macOS / Linux）</b></summary>

### 1. 安装 Git

**Windows**：从 https://git-scm.com/downloads 下载，一路 Next。

**macOS**：
```bash
brew install git
```

**Linux (Ubuntu)**：
```bash
sudo apt update && sudo apt install git -y
```

验证：`git --version`

### 2. 安装 Node.js

**Windows**：https://nodejs.org/zh-cn → 下载 LTS 版 → 一路 Next。

**macOS**：
```bash
brew install node
```

**Linux (Ubuntu)**：
```bash
sudo apt install nodejs npm -y
```

验证：`node --version` 和 `npm --version`

### 3. 下载项目

```bash
git clone https://github.com/zjuhechao/exam-porridge-assistant.git
cd exam-porridge-assistant
```

### 4. 安装依赖并启动

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3015`。

> **停止服务**：终端按 `Ctrl + C`。

</details>

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 18 + TypeScript |
| 路由 | react-router-dom v6 (HashRouter) |
| 样式 | Tailwind CSS 3 |
| 动画 | framer-motion |
| 数据库 | Dexie (IndexedDB) |
| 文档解析 | pdfjs-dist / mammoth |
| Markdown | react-markdown + KaTeX |
| 构建 | Webpack 5 |
| 桌面应用 | Electron + electron-builder |
| AI 接口 | OpenAI 兼容格式 |

---

## 常见问题

<details>
<summary><b>命令找不到（git / node / npm）？</b></summary>
Windows 用户安装后**重启电脑**；macOS/Linux 打开**新终端窗口**再试。
</details>

<details>
<summary><b>npm install 失败或很慢？</b></summary>
```bash
npm config set registry https://registry.npmmirror.com
npm install
```
</details>

<details>
<summary><b>AI 功能不工作？</b></summary>
检查：API Key 是否正确 → Base URL 和模型名是否匹配 → 设置是否保存。按 `F12` 看控制台错误。
</details>

<details>
<summary><b>数据存在哪？</b></summary>
浏览器 IndexedDB（数据库名 `StudyAssistantDB`）。清除浏览器数据会丢失，不同浏览器数据不互通。
</details>

<details>
<summary><b>如何更新？</b></summary>
```bash
git pull
npm install
npm run dev
```
如有冲突：`git stash` → `git pull` → `git stash pop`。
</details>

---

## 作者

**阿刀** — [GitHub](https://github.com/zjuhechao) | [个人空间](https://zjuhechao.github.io/) | 3230101238@zju.edu.cn
