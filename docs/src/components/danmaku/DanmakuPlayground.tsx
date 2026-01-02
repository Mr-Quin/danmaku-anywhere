import { useState } from 'react'
import { DANMAKU_STYLE_PRESETS } from './danmakuStylePresets.ts'
import { MockDanmaku } from './MockDanmaku.tsx'
import '../../daisy.css'

export const DanmakuPlayground = () => {
  const [css, setCss] = useState('')

  return (
    <div className="card bg-base-100 shadow-xl border border-base-300 not-content">
      <style>{css}</style>

      <div className="card-body p-0 overflow-hidden rounded-xl">
        <div className="relative h-64 bg-gray-900 w-full overflow-hidden playground-preview bg-[url('https://picsum.photos/seed/anime/800/400')] bg-cover bg-center">
          <div className="absolute inset-0 bg-black/40" />

          <MockDanmaku
            text="233333333"
            mode="rtl"
            color="#ffffff"
            style={{ top: '10%', left: '80%' }}
          />
          <MockDanmaku
            text="前方高能"
            mode="rtl"
            color="#ff0000"
            style={{ top: '25%', left: '40%' }}
          />
          <MockDanmaku
            text="AWSL"
            mode="rtl"
            color="#ffffff"
            style={{ top: '50%', left: '60%' }}
          />
          <MockDanmaku
            text="逆向弹幕"
            mode="ltr"
            color="#ffffff"
            style={{ top: '30%', left: '10%' }}
          />
          <MockDanmaku
            text="底部弹幕"
            mode="bottom"
            color="#ffff00"
            style={{
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
          <MockDanmaku
            text="顶部弹幕"
            mode="top"
            color="#00ff00"
            style={{ top: '10px', left: '50%', transform: 'translateX(-50%)' }}
          />
        </div>

        <div className="p-4 bg-base-200">
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {DANMAKU_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                className="btn btn-sm btn-outline"
                onClick={() => setCss(preset.css)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <fieldset className="fieldset">
            <legend className="fieldset-legend">自定义 CSS</legend>
            <textarea
              className="textarea textarea-bordered font-mono h-32 w-full"
              placeholder=".da-danmaku { color: pink; }"
              value={css}
              onChange={(e) => setCss(e.target.value)}
            />
          </fieldset>
        </div>
      </div>
    </div>
  )
}
