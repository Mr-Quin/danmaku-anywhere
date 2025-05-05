import { BiliBiliIcon } from '@/common/components/icons/BilibiliIcon'
import { DanDanPlayIcon } from '@/common/components/icons/DanDanPlayIcon'
import { TencentVideoIcon } from '@/common/components/icons/TencentVideoIcon'
import { DanmakuSourceType } from '@/common/danmaku/enums'
import { alpha, styled } from '@mui/material'

const Logo = styled('div')(({ theme }) => {
  return {
    position: 'absolute',
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    top: 0,
    left: 0,
    width: 24,
    height: 24,
  }
})

const makeProviderIcon = (provider: DanmakuSourceType) => {
  switch (provider) {
    case DanmakuSourceType.Bilibili:
      return <BiliBiliIcon />
    case DanmakuSourceType.DanDanPlay:
      return <DanDanPlayIcon />
    case DanmakuSourceType.Tencent:
      return <TencentVideoIcon />
    default:
      return null
  }
}

export const ProviderLogo = ({ provider }: { provider: DanmakuSourceType }) => {
  return <Logo>{makeProviderIcon(provider)}</Logo>
}
