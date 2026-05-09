# QQ群成员提取平台

纯前端静态站点，用于处理已合法导出的 QQ 群成员名单文件。所有操作（文件解析、筛选、分页、导出）均在浏览器本地完成。

## 功能

- 导入 QQ 群成员文件（JSON / CSV / TXT）
- 自定义输出字段
- 关键词筛选、角色过滤、去重
- 分页预览结果
- 导出 CSV / TXT / JSON
- 一键复制 QQ 群官网控制台导出脚本

## 项目结构

```text
├─ index.html            主页面
├─ browser_export.js     QQ 群官网控制台抓取脚本
└─ static/
   ├─ app.js             前端逻辑
   └─ style.css          样式
```

## 部署

将上述文件保持目录结构放到任意静态服务器即可，无需后端。

## QQ 群官网导出脚本用法

1. 登录 QQ 群官网，进入成员管理页面：`https://qun.qq.com/#/member-manage/base-manage`
2. 按 F12 打开开发者工具，切到 Console
3. 复制并运行 `browser_export.js` 中的脚本
4. 浏览器自动下载 `qq_members.json` 和 `qq_members.csv`
5. 回到本平台上传文件，筛选预览后导出

## 注意事项

- 平台本身不绕过权限，只有你的账号能看到群成员数据时脚本才能正常导出
- 推荐优先上传 `qq_members.json`，字段兼容性更好
- 脚本运行期间不要切走页面，等待自动翻页采集完成
