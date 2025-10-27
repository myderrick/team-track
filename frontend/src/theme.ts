import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light', // value is irrelevant since colors come from CSS vars
    text: {
      primary: 'var(--fg)',
      secondary: 'var(--fg-muted)',
      disabled: 'color-mix(in oklab, var(--fg) 35%, transparent)',
    },
    divider: 'var(--border)',
    primary: {
      main: 'var(--accent)',
      contrastText: 'var(--card)',
    },
    background: {
      default: 'var(--bg)',
      paper: 'var(--card)',
    },
  },
  typography: {
    fontFamily: `'Inter', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`,
    // Default Typography color
    allVariants: { color: 'var(--fg)' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
        },
      },
    },

    // Surfaces
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          // keep elevation shadows if you use them
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: 'var(--border)' } },
    },

    // Typography
    MuiTypography: {
      styleOverrides: {
        root: {
          color: 'var(--fg)',
        },
      },
    },

    // Buttons
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 24,
          fontWeight: 600,
        },
        contained: {
          backgroundColor: 'var(--accent)',
          color: 'var(--card)',
          '&:hover': {
            filter: 'brightness(0.96)',
          },
        },
        outlined: {
          borderColor: 'var(--border)',
          color: 'var(--fg)',
          '&:hover': {
            backgroundColor: 'color-mix(in oklab, currentColor 10%, transparent)',
          },
        },
        text: {
          color: 'var(--fg)',
          '&:hover': {
            backgroundColor: 'color-mix(in oklab, currentColor 10%, transparent)',
          },
        },
      },
    },

    // Chips
    MuiChip: {
      styleOverrides: {
        root: {
          color: 'var(--fg)',
          borderColor: 'var(--border)',
          backgroundColor: 'color-mix(in oklab, var(--fg) 6%, transparent)',
        },
        outlined: {
          backgroundColor: 'transparent',
          borderColor: 'var(--border)',
          color: 'var(--fg)',
        },
      },
    },

    // Tabs (selected/unselected)
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: 'var(--accent)',
          height: 3,
          borderRadius: 3,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          color: 'var(--fg-muted)',
          textTransform: 'none',
          fontWeight: 600,
          minHeight: 40,
          paddingInline: 16,
          '&:hover': {
            backgroundColor:
              'color-mix(in oklab, currentColor 10%, transparent)',
          },
          '&.Mui-selected': {
            color: 'var(--fg)',
          },
        },
      },
    },

    // Inputs / Selects / Labels
    MuiInputLabel: {
      styleOverrides: {
        root: { color: 'var(--fg-muted)' },
        shrink: { color: 'var(--fg-muted)' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          color: 'var(--fg)',
          backgroundColor: 'var(--card)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--border)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--fg-muted)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--accent)',
          },
        },
        input: {
          color: 'var(--fg)',
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: { color: 'var(--fg-muted)' },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--card)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
        },
      },
    },

    // Lists / Drawer
    MuiListItemText: {
      styleOverrides: {
        primary: { color: 'var(--fg)' },
        secondary: { color: 'var(--fg-muted)' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: 'var(--surface)',
          color: 'var(--fg)',
          borderLeft: '1px solid var(--border)',
        },
      },
    },

    // Tooltip
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'var(--fg)',
          color: 'var(--card)',
          border: '1px solid var(--border)',
        },
        arrow: { color: 'var(--fg)' },
      },
    },

    // Feedback
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: 'var(--border)' },
        bar: { backgroundColor: 'var(--accent)' },
      },
    },
    MuiRating: {
      styleOverrides: {
        iconFilled: { color: 'var(--accent)' },
        iconHover: { color: 'var(--accent)' },
        iconEmpty: { color: 'var(--border)' },
      },
    },

    // Alerts
    MuiAlert: {
      styleOverrides: {
        root: { color: 'var(--fg)' },
        standardInfo: {
          backgroundColor: 'color-mix(in oklab, var(--accent) 14%, transparent)',
          color: 'var(--fg)',
          border: '1px solid var(--border)',
        },
      },
    },
  },
});
