# h5player for tampermonkey
网页播放器增强脚本  
项目地址：[https://github.com/xxxily/h5player](https://github.com/xxxily/h5player)  
脚本安装地址：[https://greasyfork.org/zh-CN/scripts/381682](https://greasyfork.org/zh-CN/scripts/381682)

## 特性
* 兼容广泛：iframe、shadowdom下均可兼容
* 支持多实例（如：twitter，instagram下一样可兼容）
* 支持播放进度记录
* 支持播放速度记录
* 支持视频画面缩放

## 简介

对HTML5播放器的功能进行增强，快捷键仿照Potplayer的快捷键布局，实现调节亮度，饱和度，对比度，速度等功能，并增加各种实用功能，提供良好的在线播剧体验  
PS：本脚基于：[https://greasyfork.org/users/49622](https://greasyfork.org/users/49622)    

由于之前作者已长期不维护，故接坑自己开干，在原作者的基础上进行了大幅度的代码改造，提供更多的功能和兼容更多网站


## 支持网站列表

` 本插件支持支持所有使用HTML5技术进行视频播放的网站 `

下面列出一些常见网站列表方便点击测试：
* [https://netflix.com](https://netflix.com)
* [https://www.ted.com](https://www.ted.com)
* [https://www.youtube.com](https://www.youtube.com)
* [https://www.instagram.com](https://www.instagram.com)
* [https://twitter.com](https://twitter.com)
* [https://www.bilibili.com](https://www.bilibili.com)
* [https://www.douyu.com](https://www.douyu.com)
* [https://www.huya.com](https://www.huya.com)
* [https://www.iqiyi.com](https://www.iqiyi.com)
* [https://www.youku.com](https://www.youku.com)

如果你常去的网站使用支持不好欢迎提[issues](https://github.com/xxxily/h5player/issues)  

  
## 快捷键列表
|  快捷键   | 说明    |
| --- | --- |
| ctrl+\ | 快捷键是否全网页可用，默认只有鼠标在video标签上才可用 |
| Ctrl+space | 禁用/启用 该播放插件 |
| → | 快进3秒 |
| ← | 后退3秒 |
| ↑ | 音量升高 1% |
| ↓ | 音量降低 1% |
| C | 加速播放 +0.1 |
| X | 减速播放 -0.1 |
| Z | 正常速度播放 |
| shift+C | 放大视频画面 +0.1 |
| shift+X | 缩小视频画面 -0.1 |
| shift+Z | 恢复视频画面 |
| E | 亮度增加% |
| W | 亮度减少% |
| T | 对比度增加% |
| R | 对比度减少% |
| U | 饱和度增加% |
| Y | 饱和度减少% |
| O | 色相增加 1 度 |
| I | 色相减少 1 度 |
| K | 模糊增加 1 px |
| J | 模糊减少 1 px |
| Q | 图像复位 |
| S | 画面旋转 90 度 |
| Enter | 进入全屏（只支持部分网站 B站，油管） |

## 更新说明：

### 1.1.2
* 接坑，梳理代码
* 优化调整部分代码

### 1.2.0
* 增加缩放视频画面大小功能
* 增加对netflix网站的支持
* 全面调整代码结构
* 修正部分兼容性问题和相关BUG
* 脚本代码工程化，代码遵循js standard 规范
* 完善文档说明

### 1.3.0
* 增加恢复播放进度功能
* 增加记录播放速度功能
* 增加禁用插件快捷功能（Ctrl+space）
* 快捷键变成全局可用，增强兼容
* 修复其它相关BUG


### 2.0.0
* 解锁shadowdom下的video组件
* 支持多实例环境
* 大幅度优化性能，使用更快的侦听方式
* 代码重构和提炼
* 修复其它相关BUG
