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
    },
    '*::selection': { bg: 'accentSoft' },
  },
  theme: {
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
