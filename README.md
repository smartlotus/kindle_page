# Kindle 黑白仪表盘

这是一个为旧 Kindle 设计的黑白网页，包含：

- 十分钟刻度桌面时钟（页面每 10 分钟自动刷新）
- 天气提示（可选城市）
- 每日一言（每天固定一条，次日自动切换）

## 文件结构

- `index.html`：页面结构
- `styles.css`：黑白风格样式
- `script.js`：时钟、天气、每日一言逻辑
- `data/cities.js`：天气城市库（分组）
- `tools/build_quote_library.py`：从豆瓣导出 CSV 自动生成语录库
- `data/quote-library.json` / `data/quote-library.js`：生成后的语录库

## 天气城市覆盖

`data/cities.js` 已内置以下分组：

- 中国 - 省会及省级行政中心（含全部省会、直辖市、自治区首府及港澳台主要城市）
- 亚洲主要城市
- 欧洲主要城市
- 美洲主要城市
- 中东与非洲主要城市
- 大洋洲主要城市

页面支持：

- 先选“区域”，再选“城市”
- 自动记住上次选择（浏览器本地存储）
- 每次刷新后仍保持所选城市

## 语录库生成

默认读取：

- `have_read.csv`
- `have_watch.csv`
- `want_read.csv`
- `want_watch.csv`

优先读取当前目录；如果当前目录缺失，会自动回退到：

`C:\Users\28389\Desktop\访谈\豆瓣导出`

执行命令：

```bash
python tools/build_quote_library.py
```

## 本地预览

建议使用静态服务打开（不要直接双击 `index.html`）：

```bash
python -m http.server 8000
```

访问：`http://localhost:8000`

## 扩展城市库

编辑 `data/cities.js`，在任意分组下新增城市对象即可：

```js
{ id: "example_city", label: "示例城市", country: "示例国家", latitude: 0, longitude: 0 }
```
