// ==UserScript==
// @name         HTML5播放器增强插件 - 修订版
// @namespace    https://github.com/xxxily/h5player
// @homepage     https://github.com/xxxily/h5player
// @version      2.0.0
// @description  对HTML5播放器的功能进行增强，支持所有使用H5进行视频播放的网站，快捷键仿照Potplayer的快捷键布局，实现调节亮度，饱和度，对比度，速度等功能。
// @author       ankvps
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  /**
   * 元素监听器
   * @param selector -必选
   * @param fn -必选，元素存在时的回调
   * @param shadowRoot -可选 指定监听某个shadowRoot下面的DOM元素
   * 参考：https://javascript.ruanyifeng.com/dom/mutationobserver.html
   */
  function ready (selector, fn, shadowRoot) {
    let listeners = []
    let win = window
    let doc = shadowRoot || win.document
    let MutationObserver = win.MutationObserver || win.WebKitMutationObserver
    let observer

    function $ready (selector, fn) {
      // 储存选择器和回调函数
      listeners.push({
        selector: selector,
        fn: fn
      })
      if (!observer) {
        // 监听document变化
        observer = new MutationObserver(check)
        observer.observe(shadowRoot || doc.documentElement, {
          childList: true,
          subtree: true
        })
      }
      // 检查该节点是否已经在DOM中
      check()
    }

    function check () {
      for (let i = 0; i < listeners.length; i++) {
        var listener = listeners[i]
        var elements = doc.querySelectorAll(listener.selector)
        for (let j = 0; j < elements.length; j++) {
          var element = elements[j]
          if (!element._isMutationReady_) {
            element._isMutationReady_ = true
            listener.fn.call(element, element)
          }
        }
      }
    }

    $ready(selector, fn)
  }

  /**
   * 某些网页用了attachShadow closed mode，需要open才能获取video标签，例如百度云盘
   * 解决参考：
   * https://developers.google.com/web/fundamentals/web-components/shadowdom?hl=zh-cn#closed
   * https://stackoverflow.com/questions/54954383/override-element-prototype-attachshadow-using-chrome-extension
   */
  function hackAttachShadow () {
    if (window._hasHackAttachShadow_) return
    try {
      window._shadowDomList_ = []
      window.Element.prototype._attachShadow = window.Element.prototype.attachShadow
      window.Element.prototype.attachShadow = function () {
        let arg = arguments
        if (arg[0] && arg[0]['mode']) {
          // 强制使用 open mode
          arg[0]['mode'] = 'open'
        }
        let shadowRoot = this._attachShadow.apply(this, arg)
        // 存一份shadowDomList
        window._shadowDomList_.push(shadowRoot)

        // 在document下面添加 addShadowRoot 自定义事件
        let shadowEvent = new window.CustomEvent('addShadowRoot', {
          shadowRoot,
          detail: {
            shadowRoot,
            message: 'addShadowRoot',
            time: new Date()
          },
          bubbles: true,
          cancelable: true
        })
        document.dispatchEvent(shadowEvent)

        return shadowRoot
      }
      window._hasHackAttachShadow_ = true
    } catch (e) {
      console.error('hackAttachShadow error by h5player plug-in')
    }
  }
  hackAttachShadow()

  let quickSort = function (arr) {
    if (arr.length <= 1) { return arr }
    var pivotIndex = Math.floor(arr.length / 2)
    var pivot = arr.splice(pivotIndex, 1)[0]
    var left = []
    var right = []
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] < pivot) {
        left.push(arr[i])
      } else {
        right.push(arr[i])
      }
    }
    return quickSort(left).concat([pivot], quickSort(right))
  }

  let h5Player = {
    /* 提示文本的字号 */
    fontSize: 20,
    enable: true,
    globalMode: true,
    playerInstance: null,
    /* 获取当前播放器的实例 */
    player: function () {
      let t = this
      return t.playerInstance || t.getPlayerList()[0]
    },
    /* 每个网页可能存在的多个video播放器 */
    getPlayerList: function () {
      let list = []
      function findPlayer (context) {
        context.querySelectorAll('video').forEach(function (player) {
          list.push(player)
        })
      }
      findPlayer(document)

      // 被封装在 shadow dom 里面的video
      if (window._shadowDomList_) {
        window._shadowDomList_.forEach(function (shadowRoot) {
          findPlayer(shadowRoot)
        })
      }

      return list
    },
    /**
     * 初始化播放器实例
     * @param isSingle 是否为单实例video标签
     */
    initPlayerInstance: function (isSingle) {
      let t = this
      if (!t.playerInstance) return

      let player = t.playerInstance
      t.filter.reset()
      t.initTips()
      t.initPlaybackRate()
      t.isFoucs()

      /* 播放的时候进行相关同步操作 */
      if (player._hasPlayingInitEvent_) return
      let setPlaybackRateOnPlayingCount = 0
      player.addEventListener('playing', function (event) {
        if (setPlaybackRateOnPlayingCount === 0) {
          /* 同步之前设定的播放速度 */
          t.setPlaybackRate()

          if (isSingle === true) {
            /* 恢复播放进度和进行进度记录 */
            t.setPlayProgress(player)
            setTimeout(function () {
              t.playProgressRecorder(player)
            }, 1000 * 3)
          }
        } else {
          t.setPlaybackRate(null, true)
        }
        setPlaybackRateOnPlayingCount += 1
      })
      player._hasPlayingInitEvent_ = true
    },
    scale: 1,
    playbackRate: 1,
    initPlaybackRate: function () {
      let t = this
      t.playbackRate = t.getPlaybackRate()
    },
    getPlaybackRate: function () {
      let t = this
      let playbackRate = window.localStorage.getItem('_h5_player_playback_rate_') || t.playbackRate
      return Number(Number(playbackRate).toFixed(1))
    },
    /* 设置播放速度 */
    setPlaybackRate: function (num, notips) {
      let t = this
      let player = t.player()
      let curPlaybackRate
      if (num) {
        num = Number(num)
        if (Number.isNaN(num)) {
          console.error('h5player: 播放速度转换出错')
          return false
        }
        if (num <= 0) {
          num = 0.1
        }
        num = Number(num.toFixed(1))
        curPlaybackRate = num
      } else {
        curPlaybackRate = t.getPlaybackRate()
      }
      window.localStorage.setItem('_h5_player_playback_rate_', curPlaybackRate)
      t.playbackRate = curPlaybackRate
      player.playbackRate = curPlaybackRate
      if (!notips) {
        /* 本身处于1被播放速度的时候不再提示 */
        if (!num && curPlaybackRate === 1) return
        t.tips('播放速度：' + player.playbackRate + '倍')
      }
    },

    tipsClassName: 'html_player_enhance_tips',
    tips: function (str) {
      let t = h5Player
      let player = t.player()
      if (!player) {
        console.log('h5Player Tips:', str)
        return true
      }

      let tipsSelector = '.' + t.tipsClassName
      let tipsDom = player.parentNode.querySelector(tipsSelector)

      /* 提示dom未初始化的，则进行初始化 */
      if (!tipsDom) {
        t.initTips()
        tipsDom = player.parentNode.querySelector(tipsSelector)
        if (!tipsDom) {
          console.log('init h5player tips dom error...')
          return false
        }
      }

      let style = tipsDom.style
      tipsDom.innerText = str

      for (var i = 0; i < 3; i++) {
        if (this.on_off[i]) clearTimeout(this.on_off[i])
      }

      function showTips () {
        style.display = 'block'
        t.on_off[0] = setTimeout(function () {
          style.opacity = 1
        }, 50)
        t.on_off[1] = setTimeout(function () {
          style.opacity = 0
        }, 2000)
        t.on_off[2] = setTimeout(function () {
          style.display = 'none'
        }, 2500)
      }

      if (style.display === 'block') {
        style.display = 'none'
        clearTimeout(this.on_off[3])
        t.on_off[3] = setTimeout(function () {
          showTips()
        }, 100)
      } else {
        showTips()
      }
    },
    /* 设置提示DOM的样式 */
    initTips: function () {
      let t = this
      let player = t.player()
      let parentNode = player.parentNode
      if (parentNode.querySelector('.' + t.tipsClassName)) return

      let tipsStyle = `
        position: absolute;
        z-index: 999999;
        font-size: ${t.fontSize || 16}px;
        padding: 10px;
        background: rgba(0,0,0,0.8);
        color:white;top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
        transition: all 500ms ease;
        opacity: 0;
        display: none;
        -webkit-font-smoothing: subpixel-antialiased;
        font-family: 'microsoft yahei', Verdana, Geneva, sans-serif;
        -webkit-user-select: none;
      `
      let tips = document.createElement('div')
      tips.setAttribute('style', tipsStyle)
      tips.setAttribute('class', t.tipsClassName)

      // 修复油管的兼容性问题
      if (window.location.hostname === 'www.youtube.com') {
        player.parentNode.style.height = '100%'
      }

      player.parentNode.appendChild(tips)
    },
    on_off: new Array(3),
    rotate: 0,
    fps: 30,
    /* 滤镜效果 */
    filter: {
      key: new Array(5),
      setup: function () {
        var view = 'brightness({0}) contrast({1}) saturate({2}) hue-rotate({3}deg) blur({4}px)'
        for (var i = 0; i < 5; i++) {
          view = view.replace('{' + i + '}', String(this.key[i]))
          this.key[i] = Number(this.key[i])
        }
        h5Player.player().style.WebkitFilter = view
      },
      reset: function () {
        this.key[0] = 1
        this.key[1] = 1
        this.key[2] = 1
        this.key[3] = 0
        this.key[4] = 0
        this.setup()
      }
    },
    _isFoucs: false,

    /* 播放器的聚焦事件 */
    foucsEvent: function () {
      let t = h5Player
      let player = t.player()
      if (!player) return

      player.onmouseover = function () {
        h5Player._isFoucs = true
      }
      player.onmouseout = function () {
        h5Player._isFoucs = false
      }
    },

    isFoucs: function () {
      let t = h5Player
      let player = t.player()
      if (!player) return

      player.onmouseenter = function (e) {
        h5Player._isFoucs = true
      }
      player.onmouseleave = function (e) {
        h5Player._isFoucs = false
      }
    },
    keyList: [13, 16, 17, 18, 27, 32, 37, 38, 39, 40, 49, 50, 51, 52, 67, 68, 69, 70, 73, 74, 75, 79, 81, 82, 83, 84, 85, 87, 88, 89, 90, 97, 98, 99, 100, 220],
    keyMap: {
      'enter': 14,
      'shift': 16,
      'ctrl': 17,
      'alt': 18,
      'esc': 27,
      'space': 32,
      '←': 37,
      '↑': 38,
      '→': 39,
      '↓': 40,
      '1': 49,
      '2': 50,
      '3': 51,
      '4': 52,
      'c': 67,
      'd': 68,
      'e': 69,
      'f': 70,
      'i': 73,
      'j': 74,
      'k': 75,
      'o': 79,
      'q': 81,
      'r': 82,
      's': 83,
      't': 84,
      'u': 85,
      'w': 87,
      'x': 88,
      'y': 89,
      'z': 90,
      'pad1': 97,
      'pad2': 98,
      'pad3': 99,
      'pad4': 100,
      '\\': 220
    },

    /* 播放器事件响应器 */
    palyerTrigger: function (player, event) {
      if (!player || !event) return
      let t = h5Player
      let keyCode = event.keyCode

      if (event.shiftKey) {
        let isScaleKeyCode = keyCode === 88 || keyCode === 67 || keyCode === 90
        if (!isScaleKeyCode) return

        // shift+X：视频缩小 -0.1
        if (keyCode === 88) {
          t.scale -= 0.1
        }

        // shift+C：视频放大 +0.1
        if (keyCode === 67) {
          t.scale = Number(t.scale)
          t.scale += 0.1
        }

        // shift+Z：视频恢复正常大小
        if (keyCode === 90) {
          t.scale = 1
        }

        let scale = t.scale = t.scale.toFixed(1)
        player.style.transform = 'scale(' + scale + ')'
        t.tips('视频缩放率：' + scale)
        return true
      }

      // 防止其它无关组合键冲突
      if (event.altKey || event.ctrlKey || event.shiftKey) return

      // 方向键右→：快进3秒
      if (keyCode === 39) {
        if (window.location.hostname === 'www.netflix.com') {
          return
        }
        player.currentTime += 3
        t.tips('快进：3秒')
      }
      // 方向键左←：后退3秒
      if (keyCode === 37) {
        if (window.location.hostname === 'www.netflix.com') {
          return
        }
        player.currentTime -= 3
        t.tips('后退：3秒')
      }

      // 方向键上↑：音量升高 1%
      if (keyCode === 38) {
        if (player.volume < 1) {
          player.volume += 0.01
        }
        player.volume = player.volume.toFixed(2)
        t.tips('音量：' + parseInt(player.volume * 100) + '%')
      }
      // 方向键下↓：音量降低 1%
      if (keyCode === 40) {
        if (player.volume > 0) {
          player.volume -= 0.01
        }
        player.volume = player.volume.toFixed(2)
        t.tips('音量：' + parseInt(player.volume * 100) + '%')
      }

      // 空格键：暂停/播放
      if (keyCode === 32) {
        if (player.paused) {
          player.play()
          t.tips('播放')
        } else {
          player.pause()
          t.tips('暂停')
        }
      }

      // 按键X：减速播放 -0.1
      if (keyCode === 88) {
        if (player.playbackRate > 0) {
          player.playbackRate -= 0.1
          t.setPlaybackRate(player.playbackRate)
        }
      }
      // 按键C：加速播放 +0.1
      if (keyCode === 67) {
        if (player.playbackRate < 16) {
          player.playbackRate += 0.1
          t.setPlaybackRate(player.playbackRate)
        }
      }
      // 按键Z：正常速度播放
      if (keyCode === 90) {
        player.playbackRate = 1
        t.setPlaybackRate(player.playbackRate)
      }

      // 按1-4设置播放速度 49-52;97-100
      if ((keyCode >= 49 && keyCode <= 52) || (keyCode >= 97 && keyCode <= 100)) {
        player.playbackRate = Number(event.key)
        t.setPlaybackRate(player.playbackRate)
      }

      // 按键F：下一帧
      if (keyCode === 70) {
        if (window.location.hostname === 'www.netflix.com') {
          /* netflix 的F键是全屏的意思 */
          return
        }
        if (!player.paused) player.pause()
        player.currentTime += Number(1 / t.fps)
        t.tips('定位：下一帧')
      }
      // 按键D：上一帧
      if (keyCode === 68) {
        if (!player.paused) player.pause()
        player.currentTime -= Number(1 / t.fps)
        t.tips('定位：上一帧')
      }

      // 按键E：亮度增加%
      if (keyCode === 69) {
        if (t.filter.key[0] > 1) {
          t.filter.key[0] += 1
        } else {
          t.filter.key[0] += 0.1
        }
        t.filter.key[0] = t.filter.key[0].toFixed(2)
        t.filter.setup()
        t.tips('图像亮度增加：' + parseInt(t.filter.key[0] * 100) + '%')
      }
      // 按键W：亮度减少%
      if (keyCode === 87) {
        if (t.filter.key[0] > 0) {
          if (t.filter.key[0] > 1) {
            t.filter.key[0] -= 1
          } else {
            t.filter.key[0] -= 0.1
          }
          t.filter.key[0] = t.filter.key[0].toFixed(2)
          t.filter.setup()
        }
        t.tips('图像亮度减少：' + parseInt(t.filter.key[0] * 100) + '%')
      }

      // 按键T：对比度增加%
      if (keyCode === 84) {
        if (t.filter.key[1] > 1) {
          t.filter.key[1] += 1
        } else {
          t.filter.key[1] += 0.1
        }
        t.filter.key[1] = t.filter.key[1].toFixed(2)
        t.filter.setup()
        t.tips('图像对比度增加：' + parseInt(t.filter.key[1] * 100) + '%')
      }
      // 按键R：对比度减少%
      if (keyCode === 82) {
        if (t.filter.key[1] > 0) {
          if (t.filter.key[1] > 1) {
            t.filter.key[1] -= 1
          } else {
            t.filter.key[1] -= 0.1
          }
          t.filter.key[1] = t.filter.key[1].toFixed(2)
          t.filter.setup()
        }
        t.tips('图像对比度减少：' + parseInt(t.filter.key[1] * 100) + '%')
      }

      // 按键U：饱和度增加%
      if (keyCode === 85) {
        if (t.filter.key[2] > 1) {
          t.filter.key[2] += 1
        } else {
          t.filter.key[2] += 0.1
        }
        t.filter.key[2] = t.filter.key[2].toFixed(2)
        t.filter.setup()
        t.tips('图像饱和度增加：' + parseInt(t.filter.key[2] * 100) + '%')
      }
      // 按键Y：饱和度减少%
      if (keyCode === 89) {
        if (t.filter.key[2] > 0) {
          if (t.filter.key[2] > 1) {
            t.filter.key[2] -= 1
          } else {
            t.filter.key[2] -= 0.1
          }
          t.filter.key[2] = t.filter.key[2].toFixed(2)
          t.filter.setup()
        }
        t.tips('图像饱和度减少：' + parseInt(t.filter.key[2] * 100) + '%')
      }

      // 按键O：色相增加 1 度
      if (keyCode === 79) {
        t.filter.key[3] += 1
        t.filter.setup()
        t.tips('图像色相增加：' + t.filter.key[3] + '度')
      }
      // 按键I：色相减少 1 度
      if (keyCode === 73) {
        t.filter.key[3] -= 1
        t.filter.setup()
        t.tips('图像色相减少：' + t.filter.key[3] + '度')
      }

      // 按键K：模糊增加 1 px
      if (keyCode === 75) {
        t.filter.key[4] += 1
        t.filter.setup()
        t.tips('图像模糊增加：' + t.filter.key[4] + 'PX')
      }
      // 按键J：模糊减少 1 px
      if (keyCode === 74) {
        if (t.filter.key[4] > 0) {
          t.filter.key[4] -= 1
          t.filter.setup()
        }
        t.tips('图像模糊减少：' + t.filter.key[4] + 'PX')
      }

      // 按键Q：图像复位
      if (keyCode === 81) {
        t.filter.reset()
        t.tips('图像属性：复位')
      }

      // 按键S：画面旋转 90 度
      if (keyCode === 83) {
        t.rotate += 90
        if (t.rotate % 360 === 0) t.rotate = 0
        player.style.transform = 'rotate(' + t.rotate + 'deg)'
        t.tips('画面旋转：' + t.rotate + '度')
      }

      // 按键回车，进入全屏，支持仅部分网站(B站，油管)
      if (keyCode === 13) {
        if (window.location.hostname === 'www.bilibili.com') {
          if (document.querySelector('[data-text="进入全屏"]')) {
            document.querySelector('[data-text="进入全屏"]').click()
          }
        }
        if (window.location.hostname === 'www.youtube.com') {
          if (document.querySelector('[class="ytp-fullscreen-button ytp-button"]')) {
            document.querySelector('[class="ytp-fullscreen-button ytp-button"]').click()
          }
        }
      }

      // 阻止事件冒泡
      event.stopPropagation()
      event.preventDefault()
      return true
    },

    /* 按键响应方法 */
    keydownEvent: function (event) {
      let t = h5Player
      let keyCode = event.keyCode
      let player = t.player()

      /* 未用到的按键不进行任何事件监听 */
      let isInUseCode = t.keyList.includes(keyCode)
      if (!isInUseCode) return

      if (!player) {
        // console.log('无可用的播放，不执行相关操作')
        return
      }

      /* 切换插件的可用状态 */
      if (event.ctrlKey && keyCode === 32) {
        t.enable = !t.enable
        if (t.enable) {
          t.tips('启用h5Player插件')
        } else {
          t.tips('禁用h5Player插件')
        }
      }

      if (!t.enable) {
        console.log('h5Player 已禁用~')
        return false
      }

      // 按shift+\ 键进入聚焦或取消聚焦状态，用于视频标签被遮挡的场景
      if (event.ctrlKey && keyCode === 220) {
        t.globalMode = !t.globalMode
        if (t.globalMode) {
          t.tips('全局模式')
        } else {
          t.tips('禁用全局模式')
        }
      }

      /* 未聚焦，且不是全局模式则锁定快捷键的操作 */
      if (t.globalMode) {
        let target = event.target
        let isEditable = target.getAttribute && target.getAttribute('contenteditable') === 'true'
        let isInputDom = /INPUT|TEXTAREA|SELECT/.test(target.nodeName)
        if (isEditable || isInputDom) return
      } else {
        if (!t._isFoucs) return
      }

      /* 响应播放器相关操作 */
      t.palyerTrigger(player, event)
    },

    /**
     * 获取播放进度
     * @param player -可选 对应的h5 播放器对象， 如果不传，则获取到的是整个播放进度表，传则获取当前播放器的播放进度
     */
    getPlayProgress: function (player) {
      let progressMap = window.localStorage.getItem('_h5_player_play_progress_')
      if (!progressMap) {
        progressMap = {}
      } else {
        progressMap = JSON.parse(progressMap)
      }
      if (!player) {
        return progressMap
      } else {
        let keyName = window.location.href || player.src
        if (progressMap[keyName]) {
          return progressMap[keyName].progress
        } else {
          return player.currentTime
        }
      }
    },
    /* 播放进度记录器 */
    playProgressRecorder: function (player) {
      let t = h5Player
      clearTimeout(player._playProgressTimer_)
      function recorder (player) {
        player._playProgressTimer_ = setTimeout(function () {
          let progressMap = t.getPlayProgress()

          let keyName = window.location.href || player.src
          let list = Object.keys(progressMap)

          /* 只保存最近10个视频的播放进度 */
          if (list.length > 10) {
            /* 根据更新的时间戳，取出最早添加播放进度的记录项 */
            let timeList = []
            list.forEach(function (keyName) {
              progressMap[keyName] && progressMap[keyName].t && timeList.push(progressMap[keyName].t)
            })
            timeList = quickSort(timeList)
            let timestamp = timeList[0]

            /* 删除最早添加的记录项 */
            list.forEach(function (keyName) {
              if (progressMap[keyName].t === timestamp) {
                delete progressMap[keyName]
              }
            })
          }

          /* 记录当前播放进度 */
          progressMap[keyName] = {
            progress: player.currentTime,
            t: new Date().getTime()
          }

          /* 存储播放进度表 */
          window.localStorage.setItem('_h5_player_play_progress_', JSON.stringify(progressMap))

          /* 循环侦听 */
          recorder(player)
        }, 1000 * 2)
      }
      recorder(player)
    },
    /* 设置播放进度 */
    setPlayProgress: function (player, time) {
      if (!player) return
      let t = h5Player
      let curTime = Number(t.getPlayProgress(player))
      if (!curTime || Number.isNaN(curTime)) return

      player.currentTime = curTime || player.currentTime
      if (curTime > 3) {
        t.tips('为你恢复上次播放进度~')
      }
    },
    /**
     * 检测h5播放器是否存在
     * @param callback
     */
    detecH5Player: function () {
      let t = this
      let playerList = t.getPlayerList()
      if (playerList.length) {
        console.log('检测到HTML5视频！')

        /* 单video实例标签的情况 */
        if (playerList.length === 1) {
          t.playerInstance = playerList[0]
          t.initPlayerInstance(true)
        } else {
          /* 多video实例标签的情况 */
          playerList.forEach(function (player) {
            /* 鼠标移到其上面的时候重新指定实例 */
            if (player._hasMouseRedirectEvent_) return
            player.addEventListener('mouseenter', function (event) {
              t.playerInstance = event.target
              t.initPlayerInstance(false)
            })
            player._hasMouseRedirectEvent_ = true

            /* 播放器开始播放的时候重新指向实例 */
            if (player._hasPlayingRedirectEvent_) return
            player.addEventListener('playing', function (event) {
              t.playerInstance = event.target
              t.initPlayerInstance(false)

              /* 同步之前设定的播放速度 */
              t.setPlaybackRate()
            })
            player._hasPlayingRedirectEvent_ = true
          })
        }
      }
    },
    /* 绑定相关事件 */
    bindEvent: function () {
      var t = this
      if (t._hasBindEvent_) return

      document.removeEventListener('keydown', t.keydownEvent)
      document.addEventListener('keydown', t.keydownEvent, true)

      /* 兼容iframe操作 */
      if (window.top !== window && window.top.document) {
        window.top.document.removeEventListener('keydown', t.keydownEvent)
        window.top.document.addEventListener('keydown', t.keydownEvent, true)
      }
      t._hasBindEvent_ = true
    },
    init: function () {
      var t = this
      /* 绑定键盘事件 */
      t.bindEvent()
      /* 检测是否存在H5播放器 */
      t.detecH5Player()
    },
    load: false
  }

  /* 检测到有视频标签就进行初始化 */
  ready('video', function () {
    h5Player.init()
  })
  /* 检测shadow dom 下面的video */
  document.addEventListener('addShadowRoot', function (e) {
    let shadowRoot = e.detail.shadowRoot
    ready('video', function (element) {
      h5Player.init()
    }, shadowRoot)
  })
})()

