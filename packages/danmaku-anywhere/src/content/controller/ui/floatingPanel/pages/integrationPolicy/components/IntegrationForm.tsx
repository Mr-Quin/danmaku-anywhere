import {
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  FormHelperText,
  TextField,
} from '@mui/material'
import type { UseControllerProps } from 'react-hook-form'
import { useWatch, Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import type { IntegrationInput } from '@/common/options/integrationPolicyStore/schema'
import {
  getElementByXpath,
  getFirstElement,
  tryCatchSync,
} from '@/common/utils/utils'
import {
  parseMediaFromTitle,
  parseMediaString,
  parseMultipleRegex,
} from '@/content/controller/danmaku/integration/observers/parse'
import { CollapsableSection } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/CollapsableSection'
import { InputFieldArray } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/InputFieldArray'
import { ValidationIcon } from '@/content/controller/ui/floatingPanel/pages/integrationPolicy/components/ValidationIcon'

interface IntegrationFormProps {
  onOpenSelector: (
    name: UseControllerProps<IntegrationInput>['name'],
    index: number
  ) => void
}

export const IntegrationForm = ({ onOpenSelector }: IntegrationFormProps) => {
  const { t } = useTranslation()

  const {
    control,
    register,
    getValues,
    formState: { errors },
  } = useFormContext<IntegrationInput>()

  const titleOnly = useWatch({ name: 'policy.titleOnly', control })

  const handleOpenSelector = (
    name: UseControllerProps<IntegrationInput>['name']
  ) => {
    return (index: number) => onOpenSelector(name, index)
  }

  const renderXPathValidation = (
    name: UseControllerProps<IntegrationInput>['name']
  ) => {
    const values = getValues(name) as string[]

    // eslint-disable-next-line react/display-name
    return (index: number) => {
      const xPath = values[index]
      const element = getElementByXpath(xPath)

      return (
        <ValidationIcon
          state={xPath ? (element ? 'success' : 'error') : 'disabled'}
          tooltip={element?.textContent ?? ''}
        />
      )
    }
  }

  const renderRegexValidation = (
    name: UseControllerProps<IntegrationInput>['name'],
    selectorName: UseControllerProps<IntegrationInput>['name'],
    isTitle = false
  ) => {
    const selectors = getValues(selectorName) as string[]
    const values = getValues(name) as string[]

    // eslint-disable-next-line react/display-name
    return (index: number) => {
      const regex = values[index]
      const element = getFirstElement(selectors)

      const processRegex = () => {
        if (!element?.textContent)
          return {
            success: false,
            tooltip: 'No element found',
          }

        if (isTitle && titleOnly) {
          const [tooltip, err] = tryCatchSync(() => {
            const { title, episodeTitle, episode, season } =
              parseMediaFromTitle(element.textContent!, [regex])

            return `Title: ${title}, Episode: ${episode}, Season: ${season}, Episode Title: ${episodeTitle}`
          })

          return {
            success: !err,
            tooltip: err ? err.message : tooltip,
          }
        } else {
          const [tooltip, err] = tryCatchSync(() =>
            parseMultipleRegex(parseMediaString, element.textContent!, [regex])
          )

          return {
            success: !err,
            tooltip: err ? err.message : tooltip,
          }
        }
      }

      const { success, tooltip } = processRegex()

      return (
        <ValidationIcon
          state={regex ? (success ? 'success' : 'error') : 'disabled'}
          tooltip={tooltip ?? 'hmm'}
        />
      )
    }
  }

  return (
    <>
      <TextField
        label={t('integrationPolicyPage.editor.name')}
        variant="standard"
        fullWidth
        required
        {...register('name', { required: true })}
        error={!!errors.name}
        helperText={errors.name?.message}
        margin="none"
      />
      <FormControl>
        <FormControlLabel
          control={
            <Controller
              name="policy.titleOnly"
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
          label={t('integrationPolicyPage.editor.titleOnly')}
        />
        <FormHelperText>
          {t('integrationPolicyPage.editor.helper.titleOnly')}
        </FormHelperText>
      </FormControl>
      {/* Title */}
      <CollapsableSection
        name={t('integrationPolicyPage.editor.titleSection')}
        initialOpen={true}
      >
        <InputFieldArray
          name="policy.title.selector"
          label={t('integrationPolicyPage.editor.titleSelector')}
          getInitialValue={(values) => values.policy.title.selector}
          getErrorMessage={(errors, i) =>
            errors.policy?.title?.selector?.[i]?.message
          }
          renderPrefix={renderXPathValidation('policy.title.selector')}
          onOpenSelector={handleOpenSelector('policy.title.selector')}
        />
        <InputFieldArray
          name="policy.title.regex"
          label={t('integrationPolicyPage.editor.titleRegex')}
          getInitialValue={(values) => values.policy.title.regex}
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

      <Collapse in={!titleOnly} unmountOnExit>
        {/*Season Number*/}
        <CollapsableSection name={t('integrationPolicyPage.editor.season')}>
          <InputFieldArray
            name="policy.season.selector"
            label={t('integrationPolicyPage.editor.seasonSelector')}
            getInitialValue={(values) => values.policy.season.selector}
            getErrorMessage={(errors, i) =>
              errors.policy?.season?.selector?.[i]?.message
            }
            renderPrefix={renderXPathValidation('policy.season.selector')}
            onOpenSelector={handleOpenSelector('policy.season.selector')}
          />
          <InputFieldArray
            name="policy.season.regex"
            label={t('integrationPolicyPage.editor.seasonRegex')}
            getInitialValue={(values) => values.policy.season.regex}
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
        <CollapsableSection name={t('integrationPolicyPage.editor.episode')}>
          <InputFieldArray
            name="policy.episode.selector"
            label={t('integrationPolicyPage.editor.episodeSelector')}
            getInitialValue={(values) => values.policy.episode.selector}
            getErrorMessage={(errors, i) =>
              errors.policy?.episode?.selector?.[i]?.message
            }
            renderPrefix={renderXPathValidation('policy.episode.selector')}
            onOpenSelector={handleOpenSelector('policy.episode.selector')}
          />
          <InputFieldArray
            name="policy.episode.regex"
            label={t('integrationPolicyPage.editor.episodeRegex')}
            getInitialValue={(values) => values.policy.episode.regex}
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
          name={t('integrationPolicyPage.editor.episodeTitle')}
        >
          <InputFieldArray
            name="policy.episodeTitle.selector"
            label={t('integrationPolicyPage.editor.episodeTitleSelector')}
            getInitialValue={(values) => values.policy.episodeTitle.selector}
            getErrorMessage={(errors, i) =>
              errors.policy?.episodeTitle?.selector?.[i]?.message
            }
            renderPrefix={renderXPathValidation('policy.episodeTitle.selector')}
            onOpenSelector={handleOpenSelector('policy.episodeTitle.selector')}
          />
          <InputFieldArray
            name="policy.episodeTitle.regex"
            label={t('integrationPolicyPage.editor.episodeTitleRegex')}
            getInitialValue={(values) => values.policy.episodeTitle.regex}
            getErrorMessage={(errors, i) =>
              errors.policy?.episodeTitle?.regex?.[i]?.message
            }
            renderPrefix={renderRegexValidation(
              'policy.episodeTitle.regex',
              'policy.episodeTitle.selector'
            )}
          />
        </CollapsableSection>
      </Collapse>
    </>
  )
}
