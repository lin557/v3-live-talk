<p align="center">
  <a href="https://www.npmjs.org/package/v3-live-talk">
    <img src="https://img.shields.io/npm/v/v3-live-talk.svg">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg">
  </a>
</p>


# v3-live-talk

Vue3 1078 websocket 实时对讲

关于录音，使用 [xiangyuecn](https://github.com/xiangyuecn) 大神的代码，地址: https://github.com/xiangyuecn/Recorder



## Installation

```sh
npm i v3-live-talk
```

```sh
npm install --save v3-live-talk
```



## Usage

To include v3-live-talk on your website or web application, use any of the following methods.



#### Fully import

In main.ts

```js
import Vue from 'vue'
import V3LiveTalk from 'v3-live-talk'
Vue.use(V3LiveTalk)
```



#### On demand

```vue
<script setup lang="ts">
import { reactive } from 'vue'
import V3LiveTalk from 'v3-live-talk'
import 'v3-live-talk/dist/style.css'

interface TalkOptions {
  url: string
  imei: string
  chn: number
  enabled: boolean
  lang: string
  sampleRate: 16000
}

const _data: TalkOptions = {
  url: 'ws://localhost:9090/ws/talk',
  imei: '10000012348',
  chn: 1,
  enabled: false,
  lang: 'zh-cn',
  sampleRate: 16000
}

const self = reactive(_data)
</script>

<template>
  <div>
    <V3LiveTalk
      :ws="self.url"
      :imei="self.imei"
      :chn="self.chn"
      :sample-rate="self.sampleRate"
      :lang="self.lang"
      v-model:enabled="self.enabled"
    />

    <div style="margin-top: 20px;">
      <button @click="self.enabled = true">打开对讲</button>
      <button @click="self.enabled = false">关闭对讲</button>
    </div>
  </div>
</template>
```



## Attributes



| Property   | Description                                            | Type             | Default                     |
| :--------- | ------------------------------------------------------ | :--------------- | :-------------------------- |
| sampleRate | 采样率. 8000, 11025, 16000, 22050, 32000, 44100, 48000 | number           | number            |
| bitRate    | 采样深度. 8, 16                                        | number           | 16                          |
| ws         | websocket地址                                          | string           | ws://localhost:9090/ws/talk |
| imei       | 设备id                                                 | string           | 12345                       |
| chn        | 通道号                                                 | number           | 1                           |
| lang       | 本地化(小写). zh-cn, en, th                            | string           | en                          |
| enabled    | 启动开关                                               | boolean          | false                       |




## License

MIT. Copyright (c) lin557
