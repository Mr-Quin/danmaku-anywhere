import { BiliBiliIcon } from '@/common/components/icons/BilibiliIcon'
import { DanDanPlayIcon } from '@/common/components/icons/DanDanPlayIcon'
import { TencentVideoIcon } from '@/common/components/icons/TencentVideoIcon'
import { DanmakuSourceType } from '@/common/danmaku/enums'

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
  return makeProviderIcon(provider)
}
