import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
} from '@mui/material'
import { Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import { getElementByXpath, tryCatchSync } from '@/common/utils/utils'
import {
  getFirstElement,
  parseMediaFromTitle,
  parseMediaString,
  parseMultipleRegex,
} from '@/content/controller/danmaku/integration/observers/parse'
import { CollapsableSection } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/CollapsableSection'
import type { ArrayFieldNames } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/InputFieldArray'
import { InputFieldArray } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/InputFieldArray'
import { ValidationIcon } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/ValidationIcon'

interface XPathEditorProps {
  onOpenSelector: (name: ArrayFieldNames, index: number) => void
}

export const XPathEditor = ({ onOpenSelector }: XPathEditorProps) => {
  const { t } = useTranslation()

  const { getValues, control } = useFormContext<IntegrationInput>()

  const handleOpenSelector = (name: ArrayFieldNames) => {
    return (index: number) => onOpenSelector(name, index)
  }

  const renderXPathValidation = (name: ArrayFieldNames) => {
    const values = getValues(name)

    return (index: number) => {
      const xPath = values[index]
      const element = getElementByXpath(xPath.value)

      return (
        <ValidationIcon
          state={xPath ? (element ? 'success' : 'error') : 'disabled'}
          tooltip={element?.textContent ?? ''}
        />
      )
    }
  }

  const renderRegexValidation = (
    name: ArrayFieldNames,
    selectorName: ArrayFieldNames,
    isTitle = false
  ) => {
    const selectors = getValues(selectorName)
    const values = getValues(name)
    const isTitleOnly = getValues('policy.options.titleOnly')

    return (index: number) => {
      const regex = values[index]
      const element = getFirstElement(selectors)

      const processRegex = () => {
        if (!element?.textContent)
          return {
            success: false,
            tooltip: 'No element found',
          }

        if (isTitle && isTitleOnly) {
          const [tooltip, err] = tryCatchSync(() => {
            const { seasonTitle, episodeTitle, episode, seasonDecorator } =
              parseMediaFromTitle(element.textContent!, [regex])

            return `Title: ${seasonTitle}, Episode: ${episode}, Season: ${seasonDecorator}, Episode Title: ${episodeTitle}`
          })

          return {
            success: !err,
            tooltip: err ? err.message : tooltip,
          }
        }
        const [tooltip, err] = tryCatchSync(() =>
          parseMultipleRegex(parseMediaString, element.textContent!, [regex])
        )

        return {
          success: !err && !!tooltip,
          tooltip: err ? err.message : tooltip ? tooltip : 'No match',
        }
      }

      const { success, tooltip } = processRegex()

      return (
        <ValidationIcon
          state={regex ? (success ? 'success' : 'error') : 'disabled'}
          tooltip={tooltip ?? ''}
        />
      )
    }
  }

  return (
    <>
      <CollapsableSection
        name={t('integrationPolicyPage.editor.advanced', 'Advanced Options')}
        initialOpen={false}
      >
        <FormControl>
          <FormControlLabel
            control={
              <Controller
                name="policy.options.titleOnly"
                control={control}
                render={({ field: { value, ref, ...field } }) => (
                  <Checkbox
                    {...field}
                    inputRef={ref}
                    checked={value}
                    color="primary"
                  />
                )}
              />
            }
            label={t(
              'integrationPolicyPage.editor.titleOnly',
              'Match title only'
            )}
          />
          <FormHelperText>
            {t(
              'integrationPolicyPage.editor.helper.titleOnly',
              "If checked, only the title node will be used to match the show. Useful if all information is contained in the title, e.g. if the title is the file name. Uncheck if the show's information is spread across different nodes."
            )}
          </FormHelperText>
        </FormControl>
      </CollapsableSection>

      {/* Title */}
      <CollapsableSection
        name={t('integrationPolicyPage.editor.titleSection', 'Select Title')}
      >
        <InputFieldArray
          name="policy.title.selector"
          label={t('integrationPolicyPage.editor.titleSelector', 'Title XPath')}
          getErrorMessage={(errors, i) =>
            errors.policy?.title?.selector?.[i]?.message
          }
          renderPrefix={renderXPathValidation('policy.title.selector')}
          onOpenSelector={handleOpenSelector('policy.title.selector')}
        />
        <InputFieldArray
          name="policy.title.regex"
          label={t('integrationPolicyPage.editor.titleRegex', 'Title Regex')}
          getErrorMessage={(errors, i) =>
            errors.policy?.title?.regex?.[i]?.message
          }
          renderPrefix={renderRegexValidation(
            'policy.title.regex',
            'policy.title.selector',
            true
          )}
        />
      </CollapsableSection>

      {/*Season Number*/}
      <CollapsableSection
        name={t('integrationPolicyPage.editor.season', 'Select Season')}
      >
        <InputFieldArray
          name="policy.season.selector"
          label={t(
            'integrationPolicyPage.editor.seasonSelector',
            'Season XPath'
          )}
          getErrorMessage={(errors, i) =>
            errors.policy?.season?.selector?.[i]?.message
          }
          renderPrefix={renderXPathValidation('policy.season.selector')}
          onOpenSelector={handleOpenSelector('policy.season.selector')}
        />
        <InputFieldArray
          name="policy.season.regex"
          label={t('integrationPolicyPage.editor.seasonRegex', 'Season Regex')}
          getErrorMessage={(errors, i) =>
            errors.policy?.season?.regex?.[i]?.message
          }
          renderPrefix={renderRegexValidation(
            'policy.season.regex',
            'policy.season.selector'
          )}
        />
      </CollapsableSection>
      {/*Episode Number*/}
      <CollapsableSection
        name={t('integrationPolicyPage.editor.episode', 'Select Episode')}
      >
        <InputFieldArray
          name="policy.episode.selector"
          label={t(
            'integrationPolicyPage.editor.episodeSelector',
            'Episode XPath'
          )}
          getErrorMessage={(errors, i) =>
            errors.policy?.episode?.selector?.[i]?.message
          }
          renderPrefix={renderXPathValidation('policy.episode.selector')}
          onOpenSelector={handleOpenSelector('policy.episode.selector')}
        />
        <InputFieldArray
          name="policy.episode.regex"
          label={t(
            'integrationPolicyPage.editor.episodeRegex',
            'Episode Regex'
          )}
          getErrorMessage={(errors, i) =>
            errors.policy?.episode?.regex?.[i]?.message
          }
          renderPrefix={renderRegexValidation(
            'policy.episode.regex',
            'policy.episode.selector'
          )}
        />
      </CollapsableSection>
      {/*Episode Title*/}
      <CollapsableSection
        name={t(
          'integrationPolicyPage.editor.episodeTitle',
          'Select Episode Title'
        )}
      >
        <InputFieldArray
          name="policy.episodeTitle.selector"
          label={t(
            'integrationPolicyPage.editor.episodeTitleSelector',
            'Episode Title XPath'
          )}
          getErrorMessage={(errors, i) =>
            errors.policy?.episodeTitle?.selector?.[i]?.message
          }
          renderPrefix={renderXPathValidation('policy.episodeTitle.selector')}
          onOpenSelector={handleOpenSelector('policy.episodeTitle.selector')}
        />
        <InputFieldArray
          name="policy.episodeTitle.regex"
          label={t(
            'integrationPolicyPage.editor.episodeTitleRegex',
            'Episode Title Regex'
          )}
          getErrorMessage={(errors, i) =>
            errors.policy?.episodeTitle?.regex?.[i]?.message
          }
          renderPrefix={renderRegexValidation(
            'policy.episodeTitle.regex',
            'policy.episodeTitle.selector'
          )}
        />
      </CollapsableSection>
    </>
  )
}
