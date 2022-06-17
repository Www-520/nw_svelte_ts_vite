import { promisify } from 'util';
import { parse } from 'url';
import { readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import {
    type InlineConfig,
    build,
    createServer,
    transformWithEsbuild,
} from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import legacy  from '@vitejs/plugin-legacy';
import sveltePreprocess from 'svelte-preprocess';
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
const DEV_PORT = Number(parse(main).port);

console.log(`当前传入的环境变量: ${JSON.stringify(env, null, 4)}`);
console.log(`输出目标 ${TARGET}`);
console.log(`输出平台 ${PLATFORM}`);
IS_PROD || console.log(`监听端口 ${DEV_PORT}`);

const config: InlineConfig = {
    build: {
        target: 'esnext',
        emptyOutDir: false,
        outDir: 'dist/nw_svelte_ts_vite-1.0.0-win-x86',
    },
    server: {
        hmr: !IS_PROD,
    },
    plugins: [
        svelte({
            preprocess: sveltePreprocess({
                async typescript({ content }) {
                    const { code, map } = await transformWithEsbuild(content, '', {
                        loader: 'ts',
                    });
                    return { code, map };
                }
            }),
        }),
        legacy({
            targets: 'chrome 50',
        }),
    ],
};

// 应该动态生成一致的名称, 自定义命名, 同时读取package.json的此配置来读取要操作的文件夹
const dir = 'nw_svelte_ts_vite-1.0.0-win-x86';
const file = `dist/${dir}/package.json`;
const oldField = `"main":"${main}"`;
const newField = '"main":"index.html"';

IS_PROD
    ? promisify(exec)(`build --tasks ${PLATFORM} .`)
        .then(() => writeFileSync(file, readFileSync(file).toString('utf-8').replace(oldField, newField)))
        .then(() => build(config))
    : createServer(config)
        .then(server => server.listen(DEV_PORT))
        // .then(() => exec('run .'));
        .then(() => exec('nw .'));
