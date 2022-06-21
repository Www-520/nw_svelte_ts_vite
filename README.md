兼容性问题
vite dev 只允许使用esm 那么就不能在dev环境下测试低版本兼容性
1. 看能不能在dev环境下不使用esm, 能够与生产保持一致性(实际开发web一般都不会在dev环境开启polyfill 原因浏览器兼容性本来就不一致 但这是桌面端, 版本固定是chrome50) 如果不能不使用esm 那么侧面印证自定义成程度vite并不如webpack 虽然vite配置更简单 说明本来就是它们是往来个不同的方向走的
2. 使用最新的nwjs进行调试(需要额外安装 pnpm add -D nw 通过 nw . 来运行), 不能够与生产保持一致性


需要保护的代码应单独编译, 不使用SDK版能否使用编译后的代码？

!!!废弃!!!
原因: vite对nwjs支持性并不好, 首先esm的dev环境针对于版本固定的nwjs来讲是没有意义的, 但vite没有提供友善的方式修改dev环境 针对node api也无法正常编译 其次是ts的支持性很差 故抛弃vite拥抱webpack

webpack5版
1. dev环境下依旧没有编译为目标版本(chrome50) 但庆幸的是webpack允许以生产环境的形式开启dev服务(vite无法实现 其dev服务使用的是vite.createServer 默认就是使用esm) 但编译效率差别较大(dev hot reload 毫秒级 prod hot reload 1秒多) 但console devtool就无法显示源码(这是缺点)
   经过查找prod环境与dev环境下配置不同点 得出是受svelye-loader的options.hotReload影响 如果hotReoload为true那么就不会编译为chrome50 但不配置svelte就不会热更新(那就没有意义了)
   经查看svelte的hot相关的文件 发现文件是js 而我并未配置任何转换js的loader导致了js没有被处理 因此并不是dev环境下不能编译到目标版本chrome50 而是我未配置相关loader才导致的 但esbuild仅支持部分es6toes5 如果出现无法处理的词法语法那么将抛出错误 也就是说目前来讲esbuild并不能完全替代掉babel的位置 严格意义上来讲esbuild是用来打包用的而不是编译用的 babel的平替应该是swc(但也未能完全平替掉)
   swc需要用到rust使用rust需要安装Microsoft Visual C++(实际是需要安装这个https://aka.ms/vs/17/release/vc_redist.x64.exe) 这个对于纯网页开发是额外步骤, 但使用nw必然会安装的
   参考：https://stackoverflow.com/questions/69859120/the-specified-module-could-not-be-found-d-next-js-firstapp-node-modules-n
   以上只解决了编译问题 并未解决热更新问题 首次热更新时nw控制台报出"Update failed: ReferenceError: __dirname is not defined"
   偶然间将devServer.hot设置为false 热更新可用了... 猜测svelte-loader或nw(大概率是nw因为svelte-loader在web环境下是可行的)热更新处理的内部代码应该与我的配置相冲突了 导致我的配置覆盖掉了它的配置导致热更新失效
   仅分别在web环境和node-webkit环境下测试热更新 发现仅在node-webkit出现此问题
   swc-loader缺陷 不会去做类型检查, esbuild-loader也不会去做 只会做类型擦除 因此需要在打包/提交代码之前进行类型检查
2. webpack5配置 如果需要处理css 那么无论框架如何实现的css注入 都需要css-loader来进行处理 必须写上test: /.css$/i use: ['style-loader', 'css-loader'] style-loader是可选的(也可用换成MiniCssExtractPlugin.loader) 而预处理则根据框架不同有不同的处理方式 svelte就是在preprocess中处理 当然如果是存在预处理样式文件如.scss 那么依旧需要安装对于的预处理样式处理器进行处理

faq
1. 在项目中读取文件等路径相关的操作, 需要注意现在的应用不是web应用而是app应用 不能使用绝对路径(绝对路径会指向所在盘) 只能使用相对路径(相对于.exe文件) 为此使用路径必须带上path.resolve()去将相对路径处理为绝对路径 但这里衍生出一个问题, dev是在内存中的并不在文件系统中 任何文件系统操作都无法操作去获取dev编译出来的内容 还有一个问题 nw命令run .是指以当前项目根目录开启nw应用(根目录许包含package.json), 那么相对路径指向的就是项目根目录(那么就出现一个问题 如果读取本地文件的话 dev环境和prod环境的路径不能保持一致) 为解决这个问题可用考虑两个方案 1. 查找nw文档看是否有针对当前路径的修改 2. 本地开启node服务来进行处理

todo
1. nwjc编译二进制文件
