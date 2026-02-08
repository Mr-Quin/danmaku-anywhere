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
import { useToast } from '@/common/components/Toast/toastStore'
import { EXTENSION_VERSION } from '@/common/constants'
import { i18n } from '@/common/localization/i18n'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { docsLink } from '@/common/utils/utils'
import { IMAGE_ASSETS } from '@/images/ImageAssets'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

interface ResourceLinkContext {
  id: string
  version: string
}

const resources = [
  {
    id: 'docs',
    icon: () => <Article color="primary" />,
    title: () => i18n.t('aboutPage.docs', 'Documentation'),
    description: () =>
      i18n.t('aboutPage.docsDescription', 'Learn how to use all features'),
    link: (ctx: ResourceLinkContext) =>
      docsLink(`getting-started?id=${ctx.id}&version=${ctx.version}`),
  },
  {
    id: 'githubRepository',
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
    id: 'reportBug',
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
    id: 'feedback',
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
    id: 'privacyPolicy',
    icon: () => (
      <SvgIcon>
        <QQIcon />
      </SvgIcon>
    ),
    title: () => i18n.t('aboutPage.qqGroup', 'QQ Group'),
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

  const version = EXTENSION_VERSION

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    toast.success(t('common.copiedToClipboard', 'Copied to clipboard'))
  }

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.help')} />
      <Container maxWidth="md" sx={{ mt: 4 }}>
        {/* Header */}
        <Stack alignItems="center" spacing={2} mb={4}>
          <SuspenseImage
            src={IMAGE_ASSETS.Logo}
            alt={t('common.danmakuAnywhere', 'Danmaku Anywhere')}
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
              <Card key={resource.id} variant="outlined">
                {hasLink ? (
                  <CardActionArea
                    component="a"
                    href={resource.link({
                      id: data.id || '',
                      version: version || '',
                    })}
                    target="_blank"
                    rel="noreferrer noopener"
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
          {i18n.t('aboutPage.imageIllustrator', 'Graphic Illustrator')}
        </Typography>
        <Stack spacing={1} mb={4}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <SuspenseImage
                src={IMAGE_ASSETS.CarryBook}
                sx={{ width: 60, height: 60, borderRadius: 1 }}
              />
              <Typography variant="subtitle1">吳都行</Typography>
            </Stack>
          </Card>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <SuspenseImage
                src={IMAGE_ASSETS.I404}
                sx={{ width: 60, height: 60, borderRadius: 1 }}
              />
              <Typography
                variant="subtitle1"
                component="a"
                href="https://space.bilibili.com/220694183"
                target="_blank"
                rel="noreferrer noopener"
                sx={{
                  color: 'text.primary',
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                猫与白月 <Launch fontSize="inherit" />
              </Typography>
            </Stack>
          </Card>
        </Stack>

        {/* Technical Info */}
        <Accordion
          expanded={expanded}
          onChange={(_, expanded) => setExpanded(expanded)}
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
              {data.id && (
                <div>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    {t('aboutPage.clientId', 'Client ID')}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <BorderTypography variant="body2" color="text.primary">
                      {data.id}
                    </BorderTypography>
                    <Tooltip title={t('common.copy', 'Copy')}>
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
                </div>
              )}

              <div>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {t('aboutPage.version', 'Version')}
                </Typography>
                <BorderTypography variant="body2" color="text.primary">
                  {version}
                </BorderTypography>
              </div>
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
