# 上线 GitHub Pages

当前音频布局：

```text
audio/
  female_normal/
    PC_0001.mp3 ... PC_1000.mp3
  female_fast/
    PC_0001.mp3 ... PC_1000.mp3
  male_normal/
    PC_0001.mp3 ... PC_1000.mp3
  male_fast/
    PC_0001.mp3 ... PC_1000.mp3
```

每个目录 1000 个文件，不需要再拆分。

## A. 上线前检查

先双击：

`prepare_github.bat`

最后应看到：

`PASS: structurally ready for GitHub Pages.`

重点确认：

- Expected MP3 = 4000
- Missing MP3 = 0
- Whole project < 1024 MiB
- Files >= 100 MiB = 0
- Directories > 3000 entries = 0

## B. 建仓库

GitHub → New repository

建议名称：

`pronoun-cluster-reflex`

如果使用 GitHub Free，Public 仓库最直接支持 Pages。

新仓库先不要自动添加 README / .gitignore / license，因为本地项目已经有文件。

## C. 从本地项目推送

在项目根目录打开 PowerShell：

```powershell
git init
git branch -M main
git add .
git commit -m "Initial Pronoun Cluster Reflex release"
git remote add origin https://github.com/YOUR_USERNAME/pronoun-cluster-reflex.git
git push -u origin main
```

4000 个 MP3 会让第一次 `git add` / `git push` 明显比普通网页项目慢，这是正常的。

不要使用 Git LFS：GitHub Pages 不能把 Git LFS 对象作为 Pages 站点资源使用。

## D. 开启 Pages

仓库：

Settings → Pages

Build and deployment:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/(root)`

保存。

项目站点地址通常是：

`https://YOUR_USERNAME.github.io/pronoun-cluster-reflex/`

本项目所有资源路径均为相对路径，因此不要求站点部署在域名根目录。

## E. 首次上线验收

建议手机和电脑各测试一次：

1. 首页正常出现 8 个模块；
2. 模块可多选；
3. 开一轮 20 题；
4. 四个 voice profile 都能播放；
5. 正确答案自动跳下一题；
6. 错误答案停留，显示法语原文和正确中文；
7. 手动 Next 正常；
8. 统计页记录 module 与 error_contrast；
9. 刷新页面后 IndexedDB 统计仍存在；
10. 手机可 Add to Home Screen / 安装 PWA。

电脑和手机 IndexedDB 仍然各自独立，不会因为放到 GitHub Pages 就自动同步。

## F. 以后更新

修改 `stimuli.csv` 后：

`build.bat`

如果某条文本或 TTS profile 改了，再运行 Google TTS 生成器；fingerprint manifest 会跳过未变化音频。

然后：

```powershell
git add .
git commit -m "Update stimuli"
git push
```

Pages 会从 `main` 自动重新发布。
