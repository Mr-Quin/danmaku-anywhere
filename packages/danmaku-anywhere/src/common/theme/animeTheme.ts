import type { ThemeOptions } from '@mui/material/styles'

// Sakura pink / midnight blue anime-inspired palette
const palette = {
  // Primary: vibrant sakura pink — the color of danmaku flying across the screen
  sakura: {
    main: '#e91e8c',
    light: '#ff5cbf',
    dark: '#b0005c',
    contrastText: '#fff',
  },
  // Secondary: electric cyan — screen glow, subtitle tint
  cyan: {
    main: '#00e5ff',
    light: '#6effff',
    dark: '#00b2cc',
    contrastText: '#000',
  },
  // Dark backgrounds: deep midnight with a blue-violet tint
  dark: {
    paper: '#1a1a2e',
    default: '#0f0f1a',
    surface: '#16162a',
  },
  // Light backgrounds: warm off-white with a faint lavender cast
  light: {
    paper: '#faf5ff',
    default: '#f0ebf5',
    surface: '#ede5f5',
  },
}

const sharedOverrides: ThemeOptions['components'] = {
  MuiAppBar: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        borderRadius: 8,
        fontWeight: 600,
      },
    },
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        minWidth: 80,
      },
    },
  },
  MuiFab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
  MuiLinearProgress: {
    styleOverrides: {
      root: {
        borderRadius: 2,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
      },
    },
  },
}

export const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: palette.sakura,
    secondary: palette.cyan,
    background: {
      default: palette.dark.default,
      paper: palette.dark.paper,
    },
    error: {
      main: '#ff6b6b',
    },
    warning: {
      main: '#ffa726',
    },
    success: {
      main: '#66bb6a',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"Inter", "Noto Sans SC", "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
    },
  },
  components: {
    ...sharedOverrides,
    MuiAppBar: {
      ...sharedOverrides.MuiAppBar,
      styleOverrides: {
        ...sharedOverrides.MuiAppBar?.styleOverrides,
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.dark.surface,
          borderBottom: '1px solid rgba(233, 30, 140, 0.15)',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: palette.sakura.light,
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: palette.sakura.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: palette.sakura.main,
          width: 3,
          borderRadius: 2,
        },
      },
    },
  },
}

export const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#c2185b',
      light: '#e91e8c',
      dark: '#880e4f',
      contrastText: '#fff',
    },
    secondary: {
      main: '#00838f',
      light: '#00acc1',
      dark: '#005662',
      contrastText: '#fff',
    },
    background: {
      default: palette.light.default,
      paper: palette.light.paper,
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    success: {
      main: '#2e7d32',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily:
      '"Inter", "Noto Sans SC", "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
    },
  },
  components: {
    ...sharedOverrides,
    MuiAppBar: {
      ...sharedOverrides.MuiAppBar,
      styleOverrides: {
        ...sharedOverrides.MuiAppBar?.styleOverrides,
        root: {
          backgroundImage: 'none',
          backgroundColor: palette.light.surface,
          borderBottom: '1px solid rgba(194, 24, 91, 0.12)',
          color: '#1a1a2e',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#c2185b',
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#c2185b',
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#c2185b',
          width: 3,
          borderRadius: 2,
        },
      },
    },
  },
}
