# 拧走小烦恼

彩色玻璃板件螺丝消除网页游戏，支持电脑鼠标和手机触控。

- [基础版试玩](https://zzylanmengqingchuan.github.io/screw-puzzle-game/index.html?version=basic&rev=20261107-mobile)
- [增强版试玩](https://zzylanmengqingchuan.github.io/screw-puzzle-game/index.html?version=enhanced&rev=20261107-mobile)

点击露出的螺丝，同色装入收纳盒，其他颜色先进入暂存孔。每盒收满三颗后更换颜色；拆空板件会露出下层。暂存位置有限，需要安排拆卸顺序。

两版使用同一套画面。增强版在左上角暂停菜单中提供提示、撤销、本机成绩和音效开关。先拆一颗螺丝，才可以撤销。手机首次点击后可启用音效。

本机运行：在项目目录执行 `node serve-preview.mjs 8094`，再打开 `http://localhost:8094/`。

Three.js 随项目提供，许可文件位于 `js/vendor/THREE-LICENSE.txt`。
