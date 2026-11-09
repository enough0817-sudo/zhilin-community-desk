# 智邻 · 业委会工作台

桌面 Web 流程演示，支持入驻建档、事务分类、待办、资料与业务办理。

访问：https://enough0817-sudo.github.io/zhilin-community-desk/

当前为演示版：短信使用页面显示的示例验证码，不发送真实短信；材料识别、AI 与业务操作均为本地流程演示。数据和附件仅保存在当前浏览器，不支持跨设备同步。

## 开发与验证

- `dist/`：可直接部署的 27 个独立 HTML 页面及公共资源
- `scripts/generate-pages.cjs`：生成页面入口
- `tests/`：模型与页面测试

```sh
node scripts/generate-pages.cjs
node --test tests/*.test.cjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

主分支保存源文件；gh-pages 分支只发布 dist 内容。GitHub Pages 使用 gh-pages 的根目录。
