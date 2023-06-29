<script setup lang="ts">
import { ref, reactive } from 'vue'
import V3LiveTalk from './components/v3-live-talk.vue'

interface SelectOption {
  id: number
  value: number
}

interface LangOption {
  id: number
  value: string
}

interface TalkOptions {
  url: string
  mode: boolean
  imei: string
  chn: number
  enabled: boolean
  lang: string
  debug: boolean
  sampleRate: number
  sampleList: SelectOption[]
  langList: LangOption[]
  ready: string
}

const _data: TalkOptions = {
  url: 'ws://localhost:9090/ws',
  mode: false,
  imei: '10000012348',
  chn: 1,
  enabled: false,
  lang: 'en',
  debug: true,
  sampleRate: 16000,
  sampleList: [
    { id: 0, value: 8000 },
    { id: 1, value: 11025 },
    { id: 2, value: 16000 },
    { id: 3, value: 22050 },
    { id: 4, value: 32000 },
    { id: 5, value: 44100 },
    { id: 6, value: 48000 }
  ],
  langList: [
    { id: 0, value: 'zh-cn' },
    { id: 1, value: 'en' },
    { id: 2, value: 'th' }
  ],
  ready: '初始化'
}

const self = reactive(_data)
const talkRef = ref()

const reset = () => {
  talkRef.value.reset()
}
</script>

<template>
  <V3LiveTalk
    ref="talkRef"
    :ws="self.url"
    :imei="self.imei"
    :chn="self.chn"
    :sample-rate="self.sampleRate"
    :lang="self.lang"
    :ready="self.ready"
    :mode="self.mode"
    :debug="self.debug"
    v-model:enabled="self.enabled"
  />
  <div class="around">
    <div class="device">
      <label for="imei">设备号</label>
      <input type="text" name="imei" v-model="self.imei" />
    </div>
    <div class="device">
      <label for="chn">通道</label>
      <input type="text" name="chn" v-model.number="self.chn" />
    </div>
  </div>
  <div class="around">
    <div class="url">
      <label for="url">WS地址</label>
      <input type="text" name="url" v-model="self.url" />
    </div>
  </div>
  <div class="around">
    <div class="device">
      <label>采样率</label>
      <select v-model.number="self.sampleRate" :disabled="self.enabled">
        <option v-for="option in self.sampleList" :key="option.id">
          {{ option.value }}
        </option>
      </select>
    </div>
    <div class="device">
      <label>语言</label>
      <select v-model.number="self.lang">
        <option v-for="option in self.langList" :key="option.id">
          {{ option.value }}
        </option>
      </select>
    </div>
  </div>
  <div class="around">
    <label>监听模式</label>
    <input style="width: 50px" type="checkbox" v-model="self.mode" />
  </div>
  <div class="around">
    <label>Debug 开关(对讲前开启)</label>
    <input style="width: 50px" type="checkbox" v-model="self.debug" />
  </div>
  <div class="around">
    <button @click="self.enabled = true">打开</button>
    <button @click="self.enabled = false">关闭</button>
    <button @click="reset">重置</button>
  </div>
</template>
<style lang="scss">
$border-color: #afb3ff;
.around {
  display: flex;
  justify-content: center;
  margin-top: 18px;

  input,
  select {
    border-radius: 5px;
    border: 1px solid $border-color;
    margin: auto 10px;
    width: 110px;
    padding: 5px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.25s;
  }

  button {
    border-radius: 8px;
    border: 1px solid $border-color;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.25s;
  }

  input:hover,
  select:hover,
  button:hover {
    border-color: #646cff;
  }

  button:focus,
  button:focus-visible {
    background-color: #e0e2ff;
  }

  input:focus,
  input:focus-visible {
    border-color: #424bff;
  }

  button:active {
    background-color: #f0f1ff;
  }

  button {
    margin-left: 5px;
    margin-right: 5px;
    padding: 5px;
    width: 100px;
  }
}

.url {
  input {
    width: 280px;
  }
}
</style>
