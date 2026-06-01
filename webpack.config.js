const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode !== 'production';

  return {
    mode: isDev ? 'development' : 'production',
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.js',
      // 使用 './' 而非 'auto'：
      // Electron 通过 file:// 协议加载页面，'auto' 在 asar 打包中可能解析出错误的绝对路径
      // './' 确保所有资源路径相对于 index.html，兼容 file:// 和 http(s)://
      publicPath: './'
    },
    module: {
      rules: [
        {
          test: /\.mjs$/,
          include: /node_modules/,
          exclude: /pdf\.worker/,
          type: 'javascript/auto',
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-react',
                  {
                    runtime: 'automatic',
                    development: isDev
                  }
                ],
                '@babel/preset-env',
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader', 'postcss-loader']
        },
        {
          test: /\.(png|jpe?g|gif|webp|ico|svg)$/i,
          type: 'asset',
          parser: { dataUrlCondition: { maxSize: 1024 * 1024 } }
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource'
        },
        // pdfjs-dist worker 文件 — 打包为静态资源，解决 Electron 离线环境无法从 CDN 加载的问题
        {
          test: /pdf\.worker\.(min\.)?m?js$/,
          type: 'asset/resource',
        },
        {
          exclude: /\.(js|jsx|ts|tsx|mjs|css|json|html)$/i,
          type: 'asset/resource'
        }
      ]
    },
    resolve: {
      extensions: ['.mjs', '.ts', '.tsx', '.js', '.jsx']
    },
    devServer: {
      port: 3015,
      host: '0.0.0.0',
      allowedHosts: 'all',
      historyApiFallback: {
        index: '/index.html',
        rewrites: [
          { from: /^\/_p\/\d+\//, to: '/index.html' }
        ]
      }
    },
    // 关闭 webpack 默认的包体积警告 — Electron 桌面应用从本地加载，不受网络传输限制
    performance: {
      hints: false,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './index.html',
        inject: 'body'
      })
    ]
  };
};
