/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
declare const _default: import('vue').DefineComponent<
  {
    sampleRate: {
      type: import('vue').PropType<number>
      default: number
    }
    bitRate: {
      type: import('vue').PropType<number>
      default: number
    }
    ws: {
      type: import('vue').PropType<string>
    }
    imei: {
      type: import('vue').PropType<string>
      default: string
    }
    chn: {
      type: import('vue').PropType<number>
      default: number
    }
    enabled: {
      type: import('vue').PropType<boolean>
      required: true
      default: boolean
    }
    lang: {
      type: import('vue').PropType<string>
      default: string
    }
    debug: {
      type: import('vue').PropType<boolean>
      default: boolean
    }
  },
  {},
  unknown,
  {},
  {},
  import('vue').ComponentOptionsMixin,
  import('vue').ComponentOptionsMixin,
  {
    'update:enabled': (val: boolean) => void
  },
  string,
  import('vue').VNodeProps &
    import('vue').AllowedComponentProps &
    import('vue').ComponentCustomProps,
  Readonly<
    import('vue').ExtractPropTypes<{
      sampleRate: {
        type: import('vue').PropType<number>
        default: number
      }
      bitRate: {
        type: import('vue').PropType<number>
        default: number
      }
      ws: {
        type: import('vue').PropType<string>
      }
      imei: {
        type: import('vue').PropType<string>
        default: string
      }
      chn: {
        type: import('vue').PropType<number>
        default: number
      }
      enabled: {
        type: import('vue').PropType<boolean>
        required: true
        default: boolean
      }
      lang: {
        type: import('vue').PropType<string>
        default: string
      }
      debug: {
        type: import('vue').PropType<boolean>
        default: boolean
      }
    }>
  > & {
    'onUpdate:enabled'?: ((val: boolean) => any) | undefined
  },
  {
    sampleRate: number
    bitRate: number
    imei: string
    chn: number
    enabled: boolean
    lang: string
    debug: boolean
  },
  {}
>
export default _default
