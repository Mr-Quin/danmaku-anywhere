export const DANMAKU_STYLE_PRESETS = [
  {
    name: 'Clear',
    label: '默认',
    css: '',
  },
  {
    name: 'Soft Shadow',
    label: '阴影',
    css: `.da-danmaku {
  text-shadow: 0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.4);
}`,
  },
  {
    name: 'Neon',
    label: '荧光',
    css: `.da-danmaku {
  text-shadow: 0 0 5px var(--color), 0 0 10px var(--color), 0 0 20px var(--color);
}`,
  },
  {
    name: 'Boxed',
    label: '方框',
    css: `.da-danmaku {
  background-color: rgba(0, 0, 0, 0.5);
  padding: 2px 4px;
  border: 1px solid var(--color);
  border-radius: 4px;
}`,
  },
  {
    name: 'Glitch',
    label: '故障风',
    css: `
.da-danmaku::before,
.da-danmaku::after {
  content: attr(data-text);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
}

.da-danmaku::before {
  left: 2px;
  text-shadow: -1px 0 #ff00c1;
  clip-path: inset(44% 0 61% 0);
  animation: glitch-anim-1 2s infinite linear alternate-reverse;
}

.da-danmaku::after {
  left: -2px;
  text-shadow: -1px 0 #00fff9;
  clip-path: inset(58% 0 43% 0);
  animation: glitch-anim-2 2s infinite linear alternate-reverse;
}

@keyframes glitch-anim-1 {
  0% { clip-path: inset(20% 0 80% 0); }
  20% { clip-path: inset(60% 0 10% 0); }
  40% { clip-path: inset(40% 0 50% 0); }
  60% { clip-path: inset(80% 0 5% 0); }
  80% { clip-path: inset(10% 0 70% 0); }
  100% { clip-path: inset(30% 0 20% 0); }
}

@keyframes glitch-anim-2 {
  0% { clip-path: inset(10% 0 60% 0); }
  20% { clip-path: inset(30% 0 30% 0); }
  40% { clip-path: inset(70% 0 20% 0); }
  60% { clip-path: inset(20% 0 10% 0); }
  80% { clip-path: inset(50% 0 40% 0); }
  100% { clip-path: inset(0% 0 80% 0); }
}`,
  },
  {
    name: 'Top/Bottom Color',
    label: '顶底高亮',
    css: `
.da-danmaku-top, .da-danmaku-bottom {
  background-color: rgba(255, 255, 0, 0.2);
  border-bottom: 2px solid var(--color);
  padding: 0 8px;
}

.da-danmaku-rtl {
  opacity: 0.8;
}`,
  },
  {
    name: 'Glass',
    label: '磨砂玻璃',
    css: `.da-danmaku {
  font-weight: 900;
  color: transparent;

  text-shadow: unset;
  
  background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0) 51%, rgba(255,255,255,0.2) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  
  filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));
  
  -webkit-text-stroke: 1px rgba(255,255,255,0.4);
}`,
  },
  {
    name: 'Gradient',
    label: '渐变',
    css: `.da-danmaku {
  font-weight: 800;
  background: linear-gradient(180deg, #FFFFFF 30%, var(--color) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.9));
  text-shadow: unset;
}`,
  },
]
