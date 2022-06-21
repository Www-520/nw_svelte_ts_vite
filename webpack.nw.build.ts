import { promisify } from 'util';
import path from 'path';
import url from 'url';
import fs from 'fs';
import { exec } from 'child_process';
import webpack, { type Configuration } from 'webpack';
import preprocess from 'svelte-preprocess';
import esbuild from 'esbuild';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import WebpackDevServer from 'webpack-dev-server';
import { main } from './package.json';

interface Env {
    TARGET: 'dev' | 'prod' | undefined
    PLATFORM: 'win-x86' | undefined
}

const env = process
.argv
.slice(2)
.reduce((a, b) => {
    const [key, value] = b.slice(2).split('=');
    return { ...a, [key]: value };
}, {}) as Env;

const DEFAULT_TARGET = 'prod';
const DEFAULT_PLATFORM = 'win-x86';
const { TARGET = DEFAULT_TARGET, PLATFORM = DEFAULT_PLATFORM } = env;
const IS_PROD = TARGET === 'prod';
const DEV_PORT = Number(url.parse(main).port);

console.log(`当前传入的环境变量: ${JSON.stringify(env, null, 4)}`);
console.log(`输出目标 ${TARGET}`);
console.log(`输出平台 ${PLATFORM}`);
IS_PROD || console.log(`监听端口 ${DEV_PORT}`);

const config: Configuration = {
    target: 'node-webkit',
    mode: IS_PROD ? 'production' : 'development',
    entry: path.resolve(__dirname, './src/main.ts'),
    output: {
        path: path.resolve(__dirname, './dist/nw_svelte_ts_vite-1.0.0-win-x86'),
        filename: 'js/[name].[contenthash:8].js',
        // clean: true,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: 'swc-loader',
            },
            {
                test: /\.ts$/,
                use: {
                    loader: 'esbuild-loader',
                    options: {
                        loader: 'ts',
                    },
                },
            },
            {
                test: /\.svelte$/,
                use: {
                    loader: 'svelte-loader',
                    options: {
                        compilerOptions: {
                            dev: !IS_PROD,
                        },
                        emitCss: IS_PROD,
                        hotReload: !IS_PROD,
                        preprocess: preprocess({
                            typescript({ content }) {
                                const { code, map } = esbuild.transformSync(content, {
                                    loader: 'ts',
                                });
                                return { code, map };
                            },
                        }),
                    },
                },
            },
            {
                // 假设修改样式相关内容遇到打包后出错的问题, 把本地缓存(增量编译)的内容删除重新打包即可
				test: /\.css$/,
				use: [
					'style-loader',
                    'css-loader',
				],
			},
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, './public/index.html'),
        }),
    ],
    cache: IS_PROD
        ? {
            type: 'filesystem',
            cacheDirectory: path.resolve(__dirname, '.cache'),
        }
        : undefined,
};

// 应该动态生成一致的名称, 自定义命名, 同时读取package.json的此配置来读取要操作的文件夹
const dir = 'nw_svelte_ts_vite-1.0.0-win-x86';
const file = `dist/${dir}/package.json`;
const oldField = `"main":"${main}"`;
const newField = '"main":"index.html"';

if (IS_PROD) {
    console.time('build');
    console.time('nw-build');
    promisify(exec)(`build --tasks ${PLATFORM} .`)
        .then(() => console.timeEnd('nw-build'))
        .then(() => fs.writeFileSync(file, fs.readFileSync(file).toString('utf-8').replace(oldField, newField)))
        .then(() => console.time('webpack-build'))
        .then(() => webpack(config, (error, stats) => {
            console.timeEnd('webpack-build');
            console.timeEnd('build');
            // console.log(error, stats);
        }));
} else {
    const compiler = webpack(config);
    const server = new WebpackDevServer({
        port: DEV_PORT,
        hot: false,
    }, compiler);
    server.start().then(() => exec('run .'));
}
