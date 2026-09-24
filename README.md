# Pronoun Cluster Reflex — V1

独立 PWA，沿用 Number Reflex 已验证的交互逻辑。

## 已实现

- 1000 条 Pronoun Cluster stimuli
- `module` 多选：全选 / 清空 / 上次选择
- 4 个音频变体：female/male × normal/fast
- 正确回答：短暂高亮后自动下一题
- 错误回答：停止自动跳题，显示法语原文 + 正确中文，由用户手动“下一题”
- IndexedDB 独立数据库：`pronounClusterReflexDB`
- 每次 trial 保存 cluster / frame / semantic / acoustic metadata
- 错答额外保存 `error_contrast`
- 累计统计：总正确率、模块正确率、contrast 错误分布
- PWA / GitHub Pages 兼容
- 不与 Number Reflex 的 IndexedDB / Service Worker 共用命名空间

## 文件

- `stimuli.csv`：可维护源数据
- `stimuli.js`：浏览器加载数据（由 `tools/build_stimuli.py` 生成）
- `index.html / app.js / style.css`
- `db.js`：IndexedDB
- `service-worker.js / manifest.webmanifest / pwa.js`
- `audio/`：MP3
- `tools/generate_audio.py`：TTS 批量生成
- `tools/check_audio.py`：音频完整性检查

## 本地运行

双击：

`start_local.bat`

然后访问：

`http://localhost:8000`

不要直接双击 `index.html`，因为 Service Worker 和部分浏览器音频行为要求 HTTP(S)。

## 修改 stimuli.csv 后

运行：

`build.bat`

它会重建 `stimuli.js` 并检查音频缺口。

## 音频命名

例如：

`audio/PC_0001__female_normal.mp3`
`audio/PC_0001__female_fast.mp3`
`audio/PC_0001__male_normal.mp3`
`audio/PC_0001__male_fast.mp3`

程序随机从本次勾选的变体中播放。

## 生成音频：Google Cloud TTS

本项目沿用之前 Number Reflex / 疑问前缀训练的 Google Cloud Text-to-Speech REST 方案。

配置文件：

`config/tts_config.json`

当前四个 profile：

- `female_normal` — `fr-FR-Wavenet-F`, rate `1.00`, pitch `0`
- `female_fast` — `fr-FR-Neural2-F`, rate `1.10`, pitch `-0.8`
- `male_normal` — `fr-FR-Neural2-G`, rate `1.00`, pitch `0`
- `male_fast` — `fr-FR-Wavenet-G`, rate `1.10`, pitch `+0.8`

API Key 不写入项目。脚本读取：

`GOOGLE_CLOUD_TTS_API_KEY`

最方便的 Windows 方式是直接双击：

`generate_audio_test.bat`

先生成前 20 条 × 4 profiles = 80 个 MP3。

确认声音后双击：

`generate_audio_all.bat`

全库为 1000 × 4 = 4000 个 MP3。

也可以用 PowerShell：

```powershell
$env:GOOGLE_CLOUD_TTS_API_KEY="你的 Google Cloud TTS API key"
python tools/generate_audio.py --limit 20
```

只生成两个 normal profile：

```powershell
python tools/generate_audio.py --profiles female_normal male_normal
```

音频按如下规则命名：

`audio/PC_0001__female_normal.mp3`

生成器维护：

`audio/_tts_manifest.json`

其中保存 `text + voice + speakingRate + pitch + encoding` 的 fingerprint。
文件存在且 fingerprint 未变时会跳过；修改语料或 TTS 配置后只会重生成受影响的文件。

**不要把 API key 写入任何文件，也不要提交到 GitHub。**

## GitHub Pages

建立一个新的仓库，例如：

`pronoun-cluster-reflex`

把本目录内容上传到仓库根目录，Pages 选择：

- branch: `main`
- folder: `/(root)`

`.nojekyll` 已包含。

## 数据隔离

此项目使用：

`pronounClusterReflexDB`

因此不会读取或覆盖 `numberReflexDB`。电脑和手机依然各自维护自己的 IndexedDB，符合当前“不做跨设备同步”的架构。

## V1 模块

- SINGLE_CLITIC
- COD_CLUSTER
- EN_CLUSTER
- REFLEXIVE
- Y_CLUSTER
- SPECIAL_HIGH_FREQ
- INFINITIVE_ENV
- ADVANCED_EXPOSURE
