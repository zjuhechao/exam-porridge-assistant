# 考试粥助手

一款基于 AI 的本地化学习与考试辅助工具。上传学习资料，AI 自动生成复习纲要、学习笔记和练习题，支持刷题、错题追踪和针对性训练。

所有数据完全存储在本地浏览器中，不依赖任何云端服务。

---

## 快速开始

如果你已经有 Git 和 Node.js 环境：

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

---

## 更新到最新版本

如果你已经下载过旧版本，在项目文件夹中执行：

```bash
git pull
npm install
npm run dev
```

> **遇到「本地有修改」的提示？** 先暂存再拉取：
> ```bash
> git stash
> git pull
> git stash pop
> npm install
> ```
>
> **如果是从很老的版本升级**（项目旧名 `personal-study-assistant`）：旧版数据库与新版不兼容，需要重新上传资料和配置 API。

---

## 功能一览

- 上传学习资料（PDF、DOCX、TXT、图片等），自动提取文本或 OCR 识别
- AI 智能生成复习纲要和学习笔记
- 自动生成练习题（选择题、填空题、判断题、简答题）
- 刷题器模式：导入已有题目文件或试卷图片，AI 自动识别题目
- 错题追踪与针对性训练
- 按课程隔离管理所有学习数据
- 打包为 Windows / macOS / Linux 桌面应用

---

## 在你的电脑上运行本项目

下面的教程面向**完全零基础**的用户，请按顺序操作。根据你的操作系统选择对应的方法。

### 第一步：安装 Git

Git 是一个代码管理工具，用来把项目从 GitHub 下载到你的电脑上。

<details>
<summary><b>Windows</b>（点击展开）</summary>

1. 打开浏览器，访问 https://git-scm.com/downloads
2. 点击 **Windows** 版本下载（会自动下载一个 `.exe` 安装文件）
3. 双击安装文件，**一路点 Next**，所有选项保持默认即可
4. 安装完成后点击 **Finish**

</details>

<details>
<summary><b>macOS</b>（点击展开）</summary>

1. 打开终端（在"启动台" → "其他" → "终端"，或按 `Cmd + 空格` 搜索"终端"）
2. 安装 [Homebrew](https://brew.sh/)（若已安装可跳过）：

   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. 通过 Homebrew 安装 Git：

   ```
   brew install git
   ```

</details>

<details>
<summary><b>Linux（以 Ubuntu 为例）</b>（点击展开）</summary>

1. 打开终端（`Ctrl + Alt + T`）
2. 更新软件包列表并安装 Git：

   ```
   sudo apt update
   sudo apt install git -y
   ```

   其他发行版（如 Fedora 使用 `sudo dnf install git`，Arch Linux 使用 `sudo pacman -S git`）。

</details>

**验证安装：** 在终端中输入：

```
git --version
```

看到类似 `git version 2.xx.x` 的输出就说明安装成功。

> Windows 用户如果提示"不是内部或外部命令"，请重启电脑后重试。

### 第二步：安装 Node.js

Node.js 是运行本项目所必需的 JavaScript 运行时。

<details>
<summary><b>Windows</b>（点击展开）</summary>

1. 打开浏览器，访问 https://nodejs.org/zh-cn
2. 点击 **LTS（长期支持版）** 下载按钮
3. 双击下载好的 `.msi` 安装文件
4. 一路点 **Next**，保持默认设置
5. 如果看到 "Automatically install the necessary tools" 选项，**勾选它**
6. 点击 **Install**，等待安装完成，点击 **Finish**

</details>

<details>
<summary><b>macOS</b>（点击展开）</summary>

**方法一（推荐）：使用 Homebrew**

```
brew install node
```

**方法二：从官网下载**

1. 打开浏览器，访问 https://nodejs.org/zh-cn
2. 点击 **LTS（长期支持版）** 下载按钮
3. 双击下载好的 `.pkg` 安装文件，按提示完成安装

</details>

<details>
<summary><b>Linux（以 Ubuntu 为例）</b>（点击展开）</summary>

```
sudo apt update
sudo apt install nodejs npm -y
```

> 注意：系统自带的 Node.js 版本可能较旧，如需最新版本，建议使用 [nvm](https://github.com/nvm-sh/nvm) 安装：
> ```
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
> # 重启终端后
> nvm install --lts
> ```

</details>

**验证安装：** 打开终端输入：

```
node --version
```

看到类似 `v20.11.0` 的版本号即成功。再输入：

```
npm --version
```

看到类似 `10.2.4` 的版本号即成功。

> Windows 用户如果提示"不是内部或外部命令"，请重启电脑后重试。

### 第三步：下载项目代码

1. 打开**终端**（见下方说明），进入你希望存放项目的目录（如桌面）：

   - **Windows 11：** 在桌面文件夹中 **右键** → **"在终端中打开"**
   - **Windows 旧版：** 按 `Win + R`，输入 `cmd`，回车，然后输入 `cd %USERPROFILE%\Desktop`
   - **macOS：** 打开"终端"（`Cmd + 空格` 搜索"终端"），输入 `cd ~/Desktop`
   - **Linux：** `Ctrl + Alt + T` 打开终端，输入 `cd ~/Desktop`

2. 克隆项目到本地：

   ```
   git clone https://github.com/zjuhechao/exam-porridge-assistant.git
   ```

3. 进入项目文件夹：

   ```
   cd exam-porridge-assistant
   ```

### 第四步：安装项目依赖

在终端中输入：

```
npm install
```

**等待说明：**
- 首次安装需要下载约 200MB 的依赖包，耗时 2-5 分钟
- 屏幕上会不断滚动下载进度，这是正常的
- 出现黄色的 `WARN` 警告是正常的，不影响使用
- 看到 `added xxx packages` 就表示安装完成

**如果安装很慢或失败：** 切换到国内镜像源后重试：

```
npm config set registry https://registry.npmmirror.com
npm install
```

### 第五步：启动项目

```
npm run dev
```

等待几秒钟，当终端显示类似以下内容时，说明启动成功：

```
webpack compiled successfully
```

> **重要：** 启动后这个终端窗口不要关闭！关闭终端 = 关闭应用。

### 第六步：打开应用

打开浏览器（推荐 Chrome 或 Edge），在地址栏输入：

```
http://localhost:3015
```

按回车，你应该能看到考试粥助手的首页。

---

## 配置 AI 功能

应用的核心功能（生成题目、纲要、笔记、OCR 识别）需要 AI API 支持。首次使用请按以下步骤配置。

### 获取 API Key

你需要从 AI 服务商获取一个 API Key。推荐选择（任选其一）：

| 服务商 | 注册地址 | 费用 | 说明 |
|--------|----------|------|------|
| DeepSeek | https://platform.deepseek.com | 按量付费，价格低 | 国内直连，无需翻墙 |
| 通义千问 | https://dashscope.console.aliyun.com | 有免费额度 | 阿里云旗下 |
| OpenAI | https://platform.openai.com | 按量付费 | 需要海外网络 |

**以 DeepSeek 为例：**

1. 访问 https://platform.deepseek.com ，注册并登录
2. 进入控制台，点击左侧 **"API Keys"**
3. 点击 **"创建 API Key"**，复制生成的密钥（以 `sk-` 开头）
4. 在 **"充值"** 页面充入少量余额（如 10 元）

> 请妥善保管 API Key，不要分享给他人。

### 在应用中配置

1. 打开应用后，点击导航栏 **"设置"**
2. 在 "API 配置" 区域点击 **"添加 API 配置"**
3. 填写信息：

| 字段 | DeepSeek 示例 |
|------|--------------|
| 配置名称 | `DeepSeek` |
| API Key | `sk-xxxxxxxxxx`（你的密钥） |
| API Base URL | `https://api.deepseek.com` |
| 模型名称 | `deepseek-chat` |
| Temperature | `0.7` |
| Max Tokens | `2048` |

4. 点击 **"保存"**
5. 在 **"功能 API 分配"** 中为各功能选择对应的 API 配置
6. 点击页面底部 **"保存设置"**

> 如果需要图片 OCR 识别功能，OCR 配置需要使用支持视觉的多模态模型（如 `gpt-4o`），普通文本模型不支持图片识别。

---

## 日常使用

### 浏览器方式

```bash
# 1. 打开终端，进入项目文件夹
cd 你的项目路径/exam-porridge-assistant

# 2. 启动服务
npm run dev
```

然后打开浏览器访问 `http://localhost:3015` 即可。

### 桌面应用方式

如果已经打包过桌面应用，直接双击安装后的快捷方式启动。否则先参考下方"桌面应用"章节打包。

```bash
# 快速启动（使用已构建的 dist，无需 dev server）
npm run build && npx electron .
```

不需要每次都运行 `npm install`，只有首次或更新项目后才需要。

**停止服务：** 在终端按 `Ctrl + C`，输入 `Y` 确认（macOS/Linux 按 `Ctrl + C` 即可）。

---

## 桌面应用（Electron）

除了浏览器访问，本项目也支持打包为 Windows / macOS / Linux 桌面应用，无需手动打开浏览器。

### 开发模式

```bash
# 启动 Electron 开发窗口（Webpack dev server + 热更新）
npm run electron:dev
```

### 打包安装程序

```bash
# 生成安装包（Windows: .exe / macOS: .dmg / Linux: .AppImage）
npm run electron:build
```

构建产物在 `release/` 目录下：
- Windows：`考试粥助手 Setup x.x.x.exe`
- macOS：`考试粥助手-x.x.x.dmg`
- Linux：`考试粥助手-x.x.x.AppImage`

### 仅打包不生成安装包

```bash
npm run electron:pack
```

产物在 `release/win-unpacked/`（可直接运行）。

### 添加应用图标

在 `src/assets/icon.png` 放置 256×256 或更大的 PNG 图标，然后取消 `electron/main.js` 和 `package.json` 中 icon 路径的注释，重新打包即可。

### 通过 GitHub Actions 自动发布

推送版本标签即可触发三平台自动构建并发布到 GitHub Releases：

```bash
git tag v2.1.0
git push origin v2.1.0
```

构建完成后，前往仓库的 **Releases** 页面下载对应平台的安装包。也可以在 Actions 页面手动触发（`workflow_dispatch`）。

---

## 常见问题

**Q: 终端提示 `git` / `node` / `npm` 找不到或不是内部命令？**
A: Windows 用户安装后需要**重启电脑**；macOS/Linux 用户请确认已打开**新的终端窗口**再试。

**Q: `npm install` 卡住或报错？**
A: 大概率是网络问题，运行以下命令切换到国内镜像源后重试：
```
npm config set registry https://registry.npmmirror.com
npm install
```

**Q: 想更新到最新版本？**
A: 在项目文件夹中运行：
```
git pull
npm install
npm run dev
```
如果提示本地有修改冲突，先 `git stash` → `git pull` → `git stash pop`。

**Q: `npm run dev` 启动失败？**
A: 确认你已经在项目文件夹内运行命令。终端中的路径应该以 `exam-porridge-assistant` 结尾。

**Q: 打开 `localhost:3015` 显示无法访问？**
A: 确认终端中显示了 `compiled successfully`，且终端窗口没有关闭。

**Q: AI 功能不工作？**
A: 在设置页面检查 API Key、Base URL 和模型名称是否正确填写，并确保点击了"保存设置"。同时可按 `F12` 查看控制台是否有具体的错误信息（如网络错误、CORS 错误、API 鉴权失败等）。

**Q: 数据存在哪里？会丢失吗？**
A: 所有数据存储在浏览器本地（IndexedDB）。清除浏览器缓存/数据会丢失所有记录，不同浏览器之间数据不共享。建议用导出功能定期备份重要内容。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 18 + TypeScript |
| 路由 | react-router-dom v6 |
| 样式 | Tailwind CSS 3 |
| 动画 | framer-motion |
| 本地数据库 | Dexie (IndexedDB) |
| PDF 解析 | pdfjs-dist |
| DOCX 解析 | mammoth |
| Markdown 渲染 | react-markdown + KaTeX |
| 构建工具 | Webpack 5 |
| 桌面应用 | Electron + electron-builder |
| AI 接口 | OpenAI 兼容格式（支持多模态） |

---

## 作者

**阿刀**
- 主页：https://zjuhechao.github.io/
- GitHub：zjuhechao
- 邮箱：3230101238@zju.edu.cn
