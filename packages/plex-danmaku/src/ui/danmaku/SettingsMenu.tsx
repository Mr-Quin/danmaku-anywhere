import { DanDanChConvert } from '@danmaku-anywhere/danmaku-engine'
import { ComponentProps } from 'preact'
import { TargetedEvent } from 'preact/compat'
import styles from './panel.module.scss'
import { PopupPanelWrapper } from './PopupPanelWrapper'
import { SectionHeader } from './SectionHeader'
import { useDanmaku, useStore } from '@/store/store'

interface SliderInputProps extends Omit<ComponentProps<'input'>, 'onChange'> {
  title: string
  value: number | string
  onChange?: (value: string) => void
}

const SliderInput = ({
  title,
  value,
  onChange,
  ...props
}: SliderInputProps) => {
  const handleChange = (e: TargetedEvent<HTMLInputElement, Event>) => {
    const target = e.target as HTMLInputElement
    if (!target || target.value === undefined) return
    onChange?.(target.value)
  }

  return (
    <div className={styles.sliderInput}>
      <div>{title}</div>
      <input {...props} value={value} type="range" onChange={handleChange} />
      <div>{value}</div>
    </div>
  )
}

export const SettingsMenu = () => {
  const { config } = useDanmaku()
  const setDanmakuSpeed = useStore.use.setDanmakuSpeed()
  const updateDanmakuStyle = useStore.use.updateDanmakuStyle()
  const updateDanmakuConfig = useStore.use.updateDanmakuConfig()

  const { style } = config

  const handleOpacityChange = (value: string) => {
    updateDanmakuStyle({
      opacity: parseInt(value) / 100,
    })
  }

  const handleFontSizeChange = (value: string) => {
    updateDanmakuStyle({
      fontSize: parseInt(value),
    })
  }

  const handleSpeedChange = (value: string) => {
    setDanmakuSpeed(parseInt(value))
  }

  const handleRadioChange = (e: TargetedEvent<HTMLInputElement, Event>) => {
    const target = e.target as HTMLInputElement
    if (!target || target.value === undefined) return
    updateDanmakuConfig({
      chConvert: parseInt(target.value),
    })
  }

  return (
    <PopupPanelWrapper>
      <SectionHeader>Settings</SectionHeader>
      <div className={styles.chSelection}>
        <div>
          <div>None</div>
          <input
            type="radio"
            name="mode"
            value={DanDanChConvert.None}
            checked={config.chConvert === DanDanChConvert.None}
            onChange={handleRadioChange}
          />
        </div>
        <div>
          <div>Chs</div>
          <input
            type="radio"
            name="mode"
            value={DanDanChConvert.Simplified}
            checked={config.chConvert === DanDanChConvert.Simplified}
            onChange={handleRadioChange}
          />
        </div>
        <div>
          <div>Cht</div>
          <input
            type="radio"
            name="mode"
            value={DanDanChConvert.Traditional}
            checked={config.chConvert === DanDanChConvert.Traditional}
            onChange={handleRadioChange}
          />
        </div>
      </div>
      <SliderInput
        title={'Opacity'}
        value={(style.opacity * 100).toFixed(0)}
        onChange={handleOpacityChange}
        min={0}
        max={100}
      />
      <SliderInput
        title={'Font size'}
        value={style.fontSize}
        onChange={handleFontSizeChange}
        min={10}
        max={100}
      />
      <SliderInput
        title={'Speed'}
        value={config.speed}
        onChange={handleSpeedChange}
        min={1}
        max={400}
      />
    </PopupPanelWrapper>
  )
}
