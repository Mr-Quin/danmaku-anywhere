import { i18n } from '@/common/localization/i18n'
import type { OcclusionStatusReason } from './Occlusion.types'

export function occlusionStatusText(reason: OcclusionStatusReason): string {
  switch (reason) {
    case 'downloading':
      return i18n.t(
        'stylePage.occlusionStatus.downloadingModel',
        'Downloading the occlusion model. This happens once and may take a while.'
      )
    case 'taint':
      return i18n.t(
        'stylePage.occlusionError.crossOrigin',
        'Occlusion turned off: this video is served from another site that does not allow its frames to be read.'
      )
    case 'drm':
      return i18n.t(
        'stylePage.occlusionError.drm',
        'Occlusion turned off: this video is DRM-protected and its frames cannot be read.'
      )
    case 'unreadable':
      return i18n.t(
        'stylePage.occlusionError.unreadable',
        "Occlusion turned off: the extension could not read this video's frames. The site may be blocking the extra request."
      )
    case 'webgpu':
      return i18n.t(
        'stylePage.occlusionError.webgpuUnavailable',
        'This occlusion model needs WebGPU, and the GPU is not available to this browser. Switch to the People model.'
      )
    case 'segment':
      return i18n.t(
        'stylePage.occlusionError.segmentFailing',
        'Occlusion stopped: the model kept failing on this video.'
      )
    case 'unavailable':
      return i18n.t(
        'stylePage.occlusionError.unavailable',
        'Occlusion is not supported on this video.'
      )
    case 'init':
      return i18n.t(
        'stylePage.occlusionError.init',
        'Failed to load the occlusion model.'
      )
  }
}
