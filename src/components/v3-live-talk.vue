<script setup lang="ts">
import {
  ref,
  reactive,
  computed,
  watch,
  onMounted,
  onUnmounted,
  onBeforeUnmount
} from 'vue'
import Recorder from 'recorder-core'
//可选的插件支持项
import 'recorder-core/src/extensions/frequency.histogram.view'
import 'recorder-core/src/extensions/lib.fft'
// 实时流播放器
import 'recorder-core/src/extensions/buffer_stream.player'
import i18n from './i18n'
import { SampleRate } from '../../d.ts/index.d'

Recorder.ConnectEnableWorklet = true

const OLD_LOG = Recorder.CLog
// eslint-disable-next-line @typescript-eslint/no-empty-function
const EMP_LOG = () => {}
Recorder.CLog = EMP_LOG

const MEDIA_TYPE = 'pcm'

interface PropsType {
  sampleRate?: SampleRate
  bitRate?: number
  ws?: string
  imei?: string
  chn?: number
  enabled: boolean
  lang?: string
  debug?: boolean
}

const props = withDefaults(defineProps<PropsType>(), {
  sampleRate: SampleRate.SR8K,
  bitRate: 16,
  url: 'ws://localhost:9090/ws/talk',
  imei: '12345',
  chn: 1,
  enabled: false,
  lang: navigator.language.toLowerCase(),
  debug: false
})

const emit = defineEmits<{
  (event: 'update:enabled', val: boolean): void
}>()

interface Data {
  status: number
  volume: number
}

const self: Data = reactive({
  status: 0,
  volume: 0.5
})

interface RecorderX {
  open(
    success: () => void,
    fail: (msg: string, isUserNotAllow: boolean) => void
  ): void
  close(): void
  start(): void
  stop(): void
  buffers: Int16Array[]
}

interface WaveX {
  input(buffer: Int16Array, powerLevel: number, bufferSampleRate: number): void
}

interface PlayerX {
  input(arrayBuffe: ArrayBuffer): void
  stop(): void
  start(success: () => void, fail: (msg: string) => void): void
}

let gRecorder: RecorderX | undefined
let gWave: WaveX | undefined
let gPlayer: PlayerX | undefined
let gSocket: WebSocket | undefined

const waveRef = ref()

const runlog = computed(() => {
  let ret = ''
  switch (self.status) {
    case 0:
      ret = locale('init')
      break
    case 1:
      ret = locale('connecting')
      break
    case 2:
      ret = locale('connected')
      break
    case 3:
      ret = locale('disconnected')
      break
    case 4:
      ret = locale('errSocket')
      break
    case 5:
      ret = locale('noAllow')
      break
    case 6:
      ret = locale('talking')
      break
    case 7:
      ret = locale('errCross')
      break
    case 8:
      ret = locale('errHttps')
      break
    case 9:
      ret = locale('noMic')
      break
    case 99:
      ret = locale('error')
      break
    case 3000:
      ret = locale('error')
      break
    case 3001:
      ret = locale('timeout')
      break
    case 3002:
      ret = locale('busy')
      break
    case 3003:
      ret = locale('errCodec')
      break
    case 3004:
      ret = locale('kickout')
      break
    case 3005:
      ret = locale('offline')
      break
  }
  return ret
})

/**
 * 关闭对讲
 */
const close = (no?: boolean) => {
  if (gPlayer) {
    gPlayer.stop()
    gPlayer = undefined
  }
  if (gSocket) {
    gSocket.close()
    gSocket = undefined
  }
  if (gWave) {
    gWave = undefined
  }
  recordStop()
  recordClose()
  emit('update:enabled', false)
  if (!no) {
    self.status = 0
  }
}

/**
 * 创建录音对象
 */
const createRecord = () => {
  const rec = Recorder({
    type: MEDIA_TYPE,
    sampleRate: props.sampleRate,
    bitRate: props.bitRate,
    audioTrackSet: { echoCancellation: true, noiseSuppression: true },
    onProcess: (
      buffers: Int16Array[],
      powerLevel: number,
      bufferDuration: number,
      bufferSampleRate: number
    ) => {
      // 输入音频数据，更新显示波形
      drawWave(buffers[buffers.length - 1], powerLevel, bufferSampleRate)
      // // 实时数据处理，清理内存
      realTimeOnProcess(buffers, powerLevel, bufferDuration, bufferSampleRate)
    }
  })
  return rec
}

/**
 * 创建实时流播放器
 */
const createPlayer = (playSampleRate: number) => {
  if (gPlayer) {
    gPlayer.stop()
  }
  const player = Recorder.BufferStreamPlayer({
    // 传输过来的不是pcm就需要开启解码
    decode: false,
    onInputError: (errMsg: string, inputIndex: number) => {
      window.console.log(
        '第' + inputIndex + '次的音频片段input输入出错: ' + errMsg,
        1
      )
    },
    transform: (
      pcm: ArrayBuffer,
      sampleRate: number,
      success: (pcm: Int16Array, sampleRate: number) => void
    ) => {
      sampleRate = playSampleRate
      // pcm需指定sampleRate，为传输过来pcm的采样率
      success(new Int16Array(pcm), sampleRate)
      // True(pcm, sampleRate)
    }
  })
  // 切换成了实时模式，如果缓冲中积压的未播放数据量过大，会直接丢弃数据或者加速播放，达到尽快播放新输入的数据的目的，可有效降低播放延迟
  // this.player.set.realtime = true
  // 打开
  player.start(
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    () => {},
    (err: string) => {
      window.console.log('播放器打开失败: ' + err)
    }
  )
  gPlayer = player
}

const wsUrl = () => {
  let url = props.ws || 'ws://localhost/ws/talk'
  const sTmp = url.slice(url.length - 1, url.length)
  if (sTmp === '/') {
    url = url.substring(0, url.length - 1)
  }
  return (
    url +
    '/' +
    props.imei +
    '?codec=pcm&sample_rate=' +
    props.sampleRate +
    '&chn=' +
    props.chn
  )
}

/**
 * 创建websocket通讯
 */
const createWs = () => {
  if (typeof WebSocket === 'undefined') {
    window.console.log('您的浏览器不支持WebSocket')
  } else {
    self.status = 1
    // 实现化WebSocket对象
    // 指定要连接的服务器地址与端口建立连接
    // 注意ws、wss使用不同的端口。我使用自签名的证书测试，
    // 无法使用wss，浏览器打开WebSocket时报错
    // ws对应http、wss对应https。
    const url = wsUrl()
    gSocket = new WebSocket(url)
    // 连接打开事件
    gSocket.onopen = () => {
      self.status = 2
    }
    // 收到消息事件
    gSocket.onmessage = (msg: MessageEvent) => {
      // 收到消息后 播放
      processMsg(msg.data)
    }
    // 连接关闭事件
    gSocket.onclose = (e: CloseEvent) => {
      if (e.code > 2999) {
        self.status = e.code
      } else {
        self.status = 3
      }
    }
    // 发生了错误事件
    gSocket.onerror = () => {
      self.status = 4
    }
  }
}

const drawWave = (
  buffer: Int16Array,
  powerLevel: number,
  bufferSampleRate: number
) => {
  // 复制一次 防止调整音量后影响波形显示
  const newbuf = Int16Array.from(buffer)
  if (gWave) {
    gWave.input(newbuf, powerLevel, bufferSampleRate)
  }
}

/**
 * 语言文本
 * @param key 字段
 */
const locale = (key: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let locale = i18n.en as any
  if (Object.prototype.hasOwnProperty.call(i18n, props.lang)) {
    locale = i18n[props.lang]
  }
  return locale[key]
}

/**
 * 播放实时流
 */
const playBuffer = (arrayBuffer: ArrayBuffer, sampleRate: number) => {
  self.status = 6
  // 创建播放器
  if (gPlayer == null) {
    createPlayer(sampleRate)
  }
  if (gPlayer) {
    gPlayer.input(arrayBuffer)
  }
}

const processMsg = (msg: Blob) => {
  if (msg === null) {
    return
  }
  // blob 转 ArrayBuffer
  msg.arrayBuffer().then((buffer: ArrayBuffer) => {
    playBuffer(buffer, props.sampleRate)
  })
}

/**
 * 实时处理时清理一下内存（延迟清理），本方法先于RealTimeSendTry执行
 */
const realTimeOnProcess = (
  buffers: Int16Array[],
  _powerLevel: number,
  _bufferDuration: number,
  bufferSampleRate: number
) => {
  let sendChunk = undefined
  // 调整音量
  const newBuf = buffers
  scaleSamples(newBuf[0], 0, newBuf[0].length, self.volume)
  // 借用SampleData函数进行数据的连续处理，采样率转换是顺带的
  const chunk = Recorder.SampleData(
    buffers,
    bufferSampleRate,
    props.sampleRate,
    sendChunk,
    { frameType: MEDIA_TYPE }
  )

  // 清理已处理完的缓冲数据，释放内存以支持长时间录音，最后完成录音时不能调用stop，因为数据已经被清掉了
  if (gRecorder) {
    gRecorder.buffers = []
  }
  // 此时的chunk.data就是原始的音频pcm数据，直接保存即为pcm文件、加个wav头即为wav文件、丢给mp3编码器转一下码即为mp3文件
  // this.sendChunk = chunk

  // 没有新数据，或结束时的数据量太小，不能进行mock转码
  if (chunk.data.length === 0) {
    return
  }
  // console.log(chunk.data)
  const data = new Uint8Array(chunk.data.buffer)
  // console.log(data)
  transferUpload(data)
}

/**
 * 打开麦克风授权获得相关资源
 */
const recordOpen = () => {
  let rec = createRecord()
  gRecorder = rec
  rec.open(
    () => {
      // 打开麦克风授权获得相关资源

      // 此处创建这些音频可视化图形绘制浏览器支持妥妥的
      gWave = Recorder.FrequencyHistogramView({
        elem: waveRef.value,
        lineCount: 15,
        position: 0,
        minHeight: 1,
        fallDuration: 400,
        stripeEnable: false,
        mirrorEnable: true
      })
      // 创建websocket
      createWs()
      // 开始录音
      recordStart()
    },
    (msg: string, isUserNotAllow: boolean) => {
      // 用户拒绝未授权或不支持
      if (isUserNotAllow) {
        self.status = 5
      } else {
        if (msg.indexOf('跨域') !== -1) {
          self.status = 7
        }
        if (msg.indexOf('https') !== -1) {
          self.status = 8
        }
        if (msg.indexOf('麦克风') !== -1) {
          self.status = 9
        }
        if (self.status === 7 || self.status === 8 || self.status === 9) {
          // no code
        } else {
          // self.otherError = msg
          self.status = 99
        }
      }
    }
  )
}

/**
 * 关闭录音 释放资源
 */
const recordClose = () => {
  if (gRecorder) {
    gRecorder.close()
    gRecorder = undefined
  }
}

/**
 * 开始录音
 */
const recordStart = () => {
  if (gRecorder && Recorder.IsOpen()) {
    gRecorder.start()
  }
}

/**
 * 停止录音
 */
const recordStop = () => {
  if (!(gRecorder && Recorder.IsOpen())) {
    return
  }
  gRecorder.stop()
}

/**
 * 音量调节
 */
const scaleSamples = (
  samples: Int16Array,
  position: number,
  numSamples: number,
  volume: number
) => {
  const numChannels = 1
  const fixedPointVolume = Math.floor(volume * 4096.0)
  const start = position * numChannels
  const stop = start + numSamples * numChannels

  for (let xSample = start; xSample < stop; xSample++) {
    let value = (samples[xSample] * fixedPointVolume) >> 12
    if (value > 32767) {
      value = 32767
    } else if (value < -32767) {
      value = -32767
    }
    samples[xSample] = value
  }
}

const open = () => {
  recordOpen()
}

/**
 * 上传
 */
const transferUpload = (buffer: ArrayBufferLike | ArrayBufferView) => {
  // Socket.readyState，0 - 表示连接尚未建立，1 - 表示连接已建立，可以进行通信，2 - 表示连接正在进行关闭，3 - 表示连接已经关闭或者连接不能打开
  if (buffer && gSocket && gSocket.readyState === 1) {
    gSocket.send(buffer)
  }
}

const debugLog = (val: boolean) => {
  if (val) {
    Recorder.CLog = OLD_LOG
  } else {
    Recorder.CLog = EMP_LOG
  }
}

watch(
  () => props.enabled,
  (newVal: boolean) => {
    if (newVal) {
      open()
    } else {
      close()
    }
  }
)

watch(
  () => self.status,
  (newVal: number) => {
    if (newVal === 3 || newVal === 4 || newVal > 2999) {
      close(true)
    }
  }
)

watch(
  () => props.debug,
  (newVal: boolean) => {
    debugLog(newVal)
  }
)

onMounted(() => {
  debugLog(props.debug)
})

onBeforeUnmount(() => {
  close()
})

onUnmounted(() => {
  // 销毁已持有的所有全局资源
  Recorder.Destroy()
})
</script>

<template>
  <div class="vlt-wrapper">
    <div>
      <svg
        t="1641739095332"
        class="icon"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        p-id="30001"
        width="100"
        height="120"
      >
        <path
          d="M746.666667 405.333333a21.333333 21.333333 0 0 0-21.333334 21.333334v106.666666a213.333333 213.333333 0 0 1-426.666666 0v-106.666666a21.333333 21.333333 0 0 0-42.666667 0v106.666666a256 256 0 0 0 234.666667 256v106.666667h-128a21.333333 21.333333 0 0 0 0 42.666667h298.666666a21.333333 21.333333 0 1 0 0-42.666667h-128v-106.666667a256 256 0 0 0 234.666667-256v-106.666666a21.333333 21.333333 0 0 0-21.333333-21.333334z"
          p-id="30002"
          fill="#e6e6e6"
        ></path>
        <path
          d="M512 704a170.666667 170.666667 0 0 0 170.666667-170.666667V256a170.666667 170.666667 0 0 0-341.333334 0v277.333333a170.666667 170.666667 0 0 0 170.666667 170.666667z m-128-448a128 128 0 0 1 256 0v277.333333a128 128 0 0 1-256 0z"
          p-id="30003"
          fill="#e6e6e6"
        ></path>
      </svg>
    </div>
    <div class="vlt-wave" ref="waveRef"></div>
    <div class="vlt-volume">
      <input
        type="range"
        min="0.0"
        max="1.0"
        step="0.01"
        v-model="self.volume"
      />
    </div>
    <div class="vlt-runlog">{{ runlog }}</div>
    <div class="vlt-player"></div>
  </div>
</template>

<style lang="scss">
.vlt-wrapper {
  position: relative;
  width: 160px;
  height: 200px;
  padding: 10px;
  box-sizing: border-box;
  border: 1px solid #ccc;
  font-size: 13px;
  margin: 0 auto;

  .vlt-dialog {
    position: absolute;
    width: calc(100% - 20px);
  }

  .vlt-wave {
    height: 100px;
    width: calc(100% - 20px);
    position: absolute;
    top: 10px;
    left: 10px;
  }

  .vlt-runlog {
    color: #f00;
    position: absolute;
    left: 0;
    bottom: 5px;
    width: 100%;
    height: 30px;
    line-height: 30px;
  }

  .vlt-volume {
    width: 100%;
    input {
      width: 100%;
    }
  }
}
</style>
