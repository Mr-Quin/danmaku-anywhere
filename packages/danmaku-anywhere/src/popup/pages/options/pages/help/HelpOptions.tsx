import {
  Article,
  BugReport,
  ContentCopy,
  ExpandMore,
  GitHub,
  InfoOutlined,
  Launch,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  alpha,
  Box,
  Card,
  CardActionArea,
  Chip,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useExtensionOptions } from '@/common/options/extensionOptions/useExtensionOptions'
import { docsLink } from '@/common/utils/utils'
import { OptionsPageToolBar } from '@/popup/component/OptionsPageToolbar'
import { OptionsPageLayout } from '@/popup/layout/OptionsPageLayout'

export const HelpOptions = () => {
  const { t } = useTranslation()
  const { data } = useExtensionOptions()
  const theme = useTheme()
  const [expanded, setExpanded] = useState(true)

  const version = chrome.runtime.getManifest().version
  const environment = import.meta.env.MODE

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const resources = [
    {
      icon: <Article color="primary" />,
      title: 'Documentation',
      description: 'Learn how to use all features',
      link: docsLink('getting-started'),
    },
    {
      icon: <GitHub />,
      title: 'GitHub Repository',
      description: 'Source code and contributions',
      link: 'https://github.com/Mr-Quin/danmaku-anywhere',
    },
    {
      icon: <BugReport color="error" />,
      title: 'Report an Issue',
      description: 'Bug reports and feature requests',
      link: 'https://github.com/Mr-Quin/danmaku-anywhere/issues',
    },
  ]

  return (
    <OptionsPageLayout>
      <OptionsPageToolBar title={t('optionsPage.pages.help')} />
      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Header */}
        <Stack alignItems="center" spacing={2} mb={6}>
          <Box
            component="img"
            src="/normal_192.png"
            alt="Danmaku Anywhere"
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              boxShadow: theme.shadows[3],
            }}
          />
          <Typography variant="h4" component="h1" fontWeight="bold">
            Danmaku Anywhere
          </Typography>
          <Chip
            label={`Version ${version}`}
            color="primary"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 'medium' }}
          />
          <Typography
            variant="body1"
            color="text.secondary"
            align="center"
            sx={{ maxWidth: 500 }}
          >
            Overlay danmaku comments on videos across the web. Browse your
            collection, search providers, and enjoy synchronized commentary on
            your favorite content.
          </Typography>
        </Stack>

        {/* Resources */}
        <Typography variant="overline" color="text.secondary" gutterBottom>
          RESOURCES
        </Typography>
        <Stack spacing={2} mb={6}>
          {resources.map((resource, index) => (
            <Card key={index} variant="outlined">
              <CardActionArea
                component="a"
                href={resource.link}
                target="_blank"
                sx={{ px: 2, py: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      display: 'flex',
                    }}
                  >
                    {resource.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {resource.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resource.description}
                    </Typography>
                  </Box>
                  <Launch color="action" fontSize="small" />
                </Stack>
              </CardActionArea>
            </Card>
          ))}
        </Stack>

        {/* Credits */}
        <Typography variant="overline" color="text.secondary" gutterBottom>
          CREDITS & ATTRIBUTION
        </Typography>
        <Card variant="outlined" sx={{ mb: 6, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              component="img"
              src="/normal_192.png"
              alt="Mascot"
              sx={{ width: 60, height: 60, borderRadius: 1 }}
            />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                Mascot Character Design
              </Typography>
              <Typography variant="body2" color="text.secondary">
                by{' '}
                <Box
                  component="a"
                  href="https://space.bilibili.com/220694183"
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
              <Typography variant="caption" color="text.secondary">
                Licensed under CC BY 4.0
              </Typography>
            </Box>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Special thanks to all contributors and the open-source community.
            This project uses danmaku data from various providers including
            Bilibili, DanDanPlay, and AcFun.
          </Typography>
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
              <Typography variant="subtitle1">Technical Information</Typography>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Application ID
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    fullWidth
                    size="small"
                    value={data.id || 'Loading...'}
                    InputProps={{
                      readOnly: true,
                      sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
                    }}
                  />
                  <Tooltip title="Copy ID">
                    <IconButton
                      onClick={() => data.id && handleCopy(data.id)}
                      disabled={!data.id}
                    >
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Unique identifier for this installation. Include this when
                  reporting issues.
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Version
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={version}
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
                  }}
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Environment
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={environment}
                  InputProps={{
                    readOnly: true,
                    sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
                  }}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                For debugging help, join our{' '}
                <Box
                  component="a"
                  href="https://github.com/Mr-Quin/danmaku-anywhere/discussions"
                  target="_blank"
                  sx={{ color: 'primary.main', textDecoration: 'none' }}
                >
                  GitHub Discussions
                </Box>
                .
              </Typography>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Footer */}
        <Box mt={6} mb={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Copyright © 2023-2025 Mr-Quin. Licensed under AGPL-3.0.
          </Typography>
        </Box>
      </Container>
    </OptionsPageLayout>
  )
}
