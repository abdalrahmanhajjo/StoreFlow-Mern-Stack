// Theme switching. All colors are CSS variables in tokens.css; the
// [data-theme='dark'] block overrides them, so flipping `data-theme` on
// <html> switches the theme. Default is light; the choice persists per browser.
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sf-theme';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  } else {
    delete document.documentElement.dataset.theme;
  }
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // private mode / storage disabled — theme still applies for this session
  }
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
}
