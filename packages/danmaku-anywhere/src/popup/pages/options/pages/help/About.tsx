import {
  Article,
  BugReport,
  ContentCopy,
  ExpandMore,
  Feedback,
  GitHub,
  InfoOutlined,
  Launch,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardActionArea,
  Chip,
  Container,
  IconButton,
  Stack,
  SvgIcon,
  styled,
  Tooltip,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QQIcon } from '@/common/components/icons/QQIcon'
import { SuspenseImage } from '@/common/components/image/SuspenseImage'
import { images } from '@/common/components/image/usePreloadImages'
import { useToast } from '@/common/components/Toast/toastStore'
import { i18n } from '@/common/localization/i18n'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

interface ResourceLinkContext {
  id: string
  version: string
}

const resources = [
  {
    icon: () => <Article color="primary" />,
    title: () => i18n.t('aboutPage.docs', 'Documentation'),
    description: () =>
      i18n.t('aboutPage.docsDescription', 'Learn how to use all features'),
    link: (ctx: ResourceLinkContext) =>
      docsLink(`getting-started?id=${ctx.id}&version=${ctx.version}`),
  },
  {
    icon: () => <GitHub />,
    title: () => i18n.t('aboutPage.githubRepository', 'GitHub Repository'),
    description: () =>
      i18n.t(
        'aboutPage.githubRepositoryDescription',
        'Source code and contributions'
      ),
    link: (ctx: ResourceLinkContext) =>
      'https://github.com/Mr-Quin/danmaku-anywhere',
  },
  {
    icon: () => <BugReport color="error" />,
    title: () => i18n.t('aboutPage.reportBug', 'Report a Bug'),
    description: () =>
      i18n.t(
        'aboutPage.reportIssueDescription',
        'Use this if you cannot use GitHub Issues'
      ),
    link: (ctx: ResourceLinkContext) =>
      `https://forms.clickup.com/90131020449/f/2ky3men1-933/ULQ3OZ8QYRXIJ5HACI?ID=${ctx.id}&Version=${ctx.version}`,
  },
  {
    icon: () => <Feedback />,
    title: () => i18n.t('aboutPage.feedback', 'Feedback'),
    description: () =>
      i18n.t(
        'aboutPage.feedbackDescription',
        'Provide feedback and suggestions'
      ),
    link: (ctx: ResourceLinkContext) =>
      `https://forms.clickup.com/90131020449/f/2ky3men1-973/SA0BEERBNFY3NR31P8?ID=${ctx.id}&Version=${ctx.version}`,
  },
  {
    icon: () => (
      <SvgIcon>
        <QQIcon />
      </SvgIcon>
    ),
    title: () => i18n.t('aboutPage.privacyPolicy', 'QQ Group'),
    description: () => '531237584',
  },
]

const BorderTypography = styled(Typography)(({ theme }) => ({
  fontFamily: 'monospace',
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1),
  border: `1px solid ${theme.palette.divider}`,
  flexGrow: 1,
}))

export const About = () => {
  const { t } = useTranslation()

  const { data } = useExtensionOptions()

  const { toast } = useToast()

  const [expanded, setExpanded] = useState(true)

  const version = chrome.runtime.getManifest().version

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success(i18n.t('common.copiedToClipboard', 'Copied to clipboard'))
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.help')} />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Header */}
        <Stack alignItems="center" spacing={2} mb={4}>
          <SuspenseImage
            src={images.Logo}
            alt="Danmaku Anywhere"
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
            }}
          />
          <Typography variant="h4" component="h1" fontWeight="bold">
            {i18n.t('common.danmakuAnywhere', 'Danmaku Anywhere')}
          </Typography>
          <Chip
            label={`v${version}`}
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'medium' }}
          />
        </Stack>

        {/* Resources */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {i18n.t('aboutPage.resources', 'Resources')}
        </Typography>
        <Stack spacing={1} mb={4}>
          {resources.map((resource, index) => {
            const hasLink = resource.link !== undefined
            const cardInner = (
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    display: 'flex',
                  }}
                >
                  {resource.icon()}
                </Box>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {resource.title()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {resource.description()}
                  </Typography>
                </Box>
                {hasLink && <Launch color="action" fontSize="small" />}
              </Stack>
            )
            return (
              <Card key={index} variant="outlined">
                {hasLink ? (
                  <CardActionArea
                    component="a"
                    href={resource.link({ id: data.id || '', version })}
                    target="_blank"
                    sx={{ px: 2, py: 1 }}
                  >
                    {cardInner}
                  </CardActionArea>
                ) : (
                  <Box sx={{ px: 2, py: 1 }}>{cardInner}</Box>
                )}
              </Card>
            )
          })}
        </Stack>

        {/* Credits */}
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          {i18n.t('aboutPage.credits', 'Credits & Attribution')}
        </Typography>
        <Card variant="outlined" sx={{ mb: 4, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <SuspenseImage
              src={images.I404}
              sx={{ width: 60, height: 60, borderRadius: 1 }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {i18n.t('aboutPage.imageIllustrator', 'Graphic Illustrator')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <Box
                  component="a"
                  href="https://space.bilibili.com/220694183"
                  rel="noreferrer"
                  target="_blank"
                  sx={{
                    color: 'primary.main',
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  猫与白月 <Launch fontSize="inherit" />
                </Box>
              </Typography>
            </Box>
          </Stack>
        </Card>

        {/* Technical Info */}
        <Accordion
          expanded={expanded}
          onChange={() => setExpanded(!expanded)}
          variant="outlined"
          sx={{
            '&:before': { display: 'none' },
            boxShadow: 'none',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Stack direction="row" spacing={1} alignItems="center">
              <InfoOutlined color="action" />
              <Typography variant="subtitle1">
                {i18n.t('aboutPage.technicalInfo', 'Technical Information')}
              </Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('aboutPage.clientId', 'Client ID')}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <BorderTypography variant="body2" color="text.primary">
                    {data.id || 'Loading...'}
                  </BorderTypography>
                  <Tooltip title="Copy ID">
                    <IconButton
                      onClick={() => data.id && handleCopy(data.id)}
                      disabled={!data.id}
                      size="small"
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {t(
                    'aboutPage.clientIdDescription',
                    'Unique identifier for this installation. Include this when reporting issues.'
                  )}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('aboutPage.version', 'Version')}
                </Typography>
                <BorderTypography variant="body2" color="text.primary">
                  {version}
                </BorderTypography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Footer */}
        <Box mt={4} mb={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Copyright © 2023-2025 Mr-Quin. Licensed under AGPL-3.0.
          </Typography>
        </Box>
      </Container>
    </OptionsPageLayout>
  )
}
