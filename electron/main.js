const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

// 开发模式: NODE_ENV=development 或命令行 --dev 参数
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: '考试粥助手',
    // TODO: 添加应用图标到 src/assets/icon.png (256x256 或更大)
    // icon: path.join(__dirname, '../src/assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // 隐藏默认菜单栏, 干净的学习工具界面
    autoHideMenuBar: true,
  });

  // 在外部浏览器打开链接
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.loadURL('http://localhost:3015');
    // 开发模式打开 DevTools
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    console.log('[Main] Loading:', indexPath);
    win.loadFile(indexPath);

    // 监听页面加载失败
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('[Main] Page load failed:', errorCode, errorDescription, validatedURL);
    });
  }

  // 监听控制台消息（方便调试）
  win.webContents.on('console-message', (event, level, message) => {
    if (level >= 2) { // warning 及以上
      console.log(`[Renderer] ${message}`);
    }
  });

  return win;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // macOS: 点击 Dock 图标时重建窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 所有窗口关闭时退出 (macOS 除外)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
