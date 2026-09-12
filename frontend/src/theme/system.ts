import { createSystem, defaultConfig, defineConfig, defineRecipe } from '@chakra-ui/react';

/**
 * Design tokens straight from the DIV charte (see README "Charte
 * graphique"). Kept as flat, literal tokens rather than Chakra's semantic
 * colorPalette system: the brief gives exact hex values and a single
 * light-only theme, so there is no light/dark or brand-swap axis to buy
 * abstraction for.
 */
const buttonRecipe = defineRecipe({
  base: {
    fontWeight: '600',
    borderRadius: 'full',
    fontFamily: 'body',
    transitionProperty: 'background-color, color, box-shadow',
    transitionDuration: '0.15s',
    cursor: 'pointer',
    _disabled: { opacity: 0.5, cursor: 'not-allowed' },
  },
  variants: {
    variant: {
      // The signature interaction of the site: fully inverted on hover.
      solid: {
        bg: 'primary',
        color: 'white',
        _hover: {
          bg: 'accentBg',
          color: 'primary',
          boxShadow: 'inset 0 0 0 1px var(--chakra-colors-primary)',
        },
      },
      outline: {
        bg: 'transparent',
        color: 'text',
        boxShadow: 'inset 0 0 0 1px var(--chakra-colors-border)',
        _hover: { boxShadow: 'inset 0 0 0 1px var(--chakra-colors-primary)', color: 'primary' },
      },
      ghost: {
        bg: 'transparent',
        color: 'gray.solid',
        _hover: { bg: 'accentBg', color: 'primary' },
      },
    },
    size: {
      md: { px: '24px', py: '14px', fontSize: 'sm' },
      sm: { px: '16px', py: '10px', fontSize: 'xs' },
    },
  },
  defaultVariants: { variant: 'solid', size: 'md' },
});

const customConfig = defineConfig({
  globalCss: {
    'html, body': {
      bg: 'white',
      color: 'text',
      fontFamily: 'body',
      colorScheme: 'light',
      // Inter's own stylistic sets: cv11 gives the single-storey `a`-free
      // disambiguated `l`/`1`/`I`, ss01 the alternate digits. They matter
      // here because the interface is full of PINs, counts and tokens
      // where a `1` must never read as an `l`.
      fontFeatureSettings: "'cv11', 'ss01'",
      fontOpticalSizing: 'auto',
      textRendering: 'optimizeLegibility',
      lineHeight: '1.55',
    },
    // Titles: 600 per the charte, with the tracking tightened as size
    // grows - Inter is drawn for text, and large text set at default
    // tracking reads loose.
    'h1, h2, h3': { letterSpacing: '-0.015em' },
    // Anything the user has to read digit by digit gets fixed-width
    // figures so columns and progress values do not jitter.
    'code, kbd, samp, pre': { fontVariantNumeric: 'tabular-nums' },
    '*::selection': { bg: 'accentSoft' },
  },
  theme: {
    /**
     * Overlay motion, defined once for the whole app. Same easing as the
     * charte's scroll reveal - cubic-bezier(0.22, 1, 0.36, 1) - but
     * shorter: a dialog answers a click, it is not ambient motion.
     * `prefers-reduced-motion` is honoured globally in index.html.
     */
    keyframes: {
      'portail-overlay-in': {
        from: { opacity: 0 },
        to: { opacity: 1 },
      },
      'portail-dialog-in': {
        from: { opacity: 0, transform: 'translateY(16px) scale(0.98)' },
        to: { opacity: 1, transform: 'translateY(0) scale(1)' },
      },
      'portail-confirm-pop': {
        '0%': { opacity: 0, transform: 'scale(0.8)' },
        '60%': { opacity: 1, transform: 'scale(1.04)' },
        '100%': { opacity: 1, transform: 'scale(1)' },
      },
    },
    tokens: {
      colors: {
        primary: { value: '#5100FF' },
        secondary: { value: '#916ED8' },
        text: { value: '#000000' },
        gray: {
          solid: { value: '#585858' },
          light: { value: '#CECECE' },
        },
        border: { value: '#E9E9E9' },
        accentBg: { value: '#F7F6FF' },
        accentSoft: { value: '#DBCDFF' },
        success: { value: '#12AC64' },
        successBg: { value: '#D9FFED' },
        danger: { value: '#FF4C4C' },
        dangerBg: { value: '#FFD0D0' },
        warning: { value: '#DA9705' },
        warningBg: { value: '#FFEDCA' },
        info: { value: '#52A0EE' },
        infoBg: { value: '#DBEDFF' },
      },
      fonts: {
        heading: { value: `'Inter', system-ui, sans-serif` },
        body: { value: `'Inter', system-ui, sans-serif` },
      },
      radii: {
        sm: { value: '4px' },
        md: { value: '8px' },
        lg: { value: '12px' },
        full: { value: '999px' },
      },
    },
    recipes: {
      button: buttonRecipe,
    },
  },
});

export const system = createSystem(defaultConfig, customConfig);
