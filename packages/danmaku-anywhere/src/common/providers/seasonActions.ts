import { i18n } from '@/common/localization/i18n'
import type {
  SourceCapability,
  SourceCapabilityAnswer,
} from './sourceCapabilities'

export type ActionAvailability =
  | { state: 'enabled' }
  | { state: 'hidden' }
  | { state: 'disabled'; because: 'sourceRemoved' | 'sourceUnavailable' }

export interface SeasonActions {
  refreshMetadata: ActionAvailability
  follow: ActionAvailability
  refreshEpisodes: ActionAvailability
}

function availability(
  answer: SourceCapabilityAnswer | undefined,
  capability: SourceCapability
): ActionAvailability {
  if (answer === undefined) {
    return { state: 'hidden' }
  }
  // A source that is gone or broken keeps its actions in view, disabled, so
  // the user sees why they stopped working.
  if (answer.status === 'removed') {
    return { state: 'disabled', because: 'sourceRemoved' }
  }
  if (answer.status === 'unavailable') {
    return { state: 'disabled', because: 'sourceUnavailable' }
  }
  if (answer.capabilities[capability]) {
    return { state: 'enabled' }
  }
  return { state: 'hidden' }
}

export function seasonActions(
  answer: SourceCapabilityAnswer | undefined
): SeasonActions {
  return {
    refreshMetadata: availability(answer, 'seasonRefresh'),
    follow: availability(answer, 'episodes'),
    refreshEpisodes: availability(answer, 'episodes'),
  }
}

export function menuItemState(
  action: ActionAvailability
): { disabled: boolean; tooltip?: string } | null {
  if (action.state === 'hidden') {
    return null
  }
  if (action.state === 'enabled') {
    return { disabled: false }
  }
  if (action.because === 'sourceRemoved') {
    return {
      disabled: true,
      tooltip: i18n.t(
        'anime.sourceRemovedTooltip',
        'This source has been deleted.'
      ),
    }
  }
  return {
    disabled: true,
    tooltip: i18n.t(
      'anime.sourceUnavailableTooltip',
      "This source can't be used right now."
    ),
  }
}
