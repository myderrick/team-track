// theme/MuiThemeProvider.jsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useDarkMode } from '@/theme/DarkModeProvider';

export default function MuiThemeProvider({ children }) {
  const { isDark } = useDarkMode();
  const theme = createTheme({
    palette: { mode: isDark ? 'dark' : 'light' },
    typography: { fontFamily: 'Inter, system-ui, sans-serif' },
  });
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
