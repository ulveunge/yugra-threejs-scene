import plugin from 'tailwindcss/plugin';
import { colors, screens, indents, typography, grid, setInterpolateValue, setInterpolateVariable } from './config/tw';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ejs,js,ts}', './*.{html,ejs,js,ts}'],
  darkMode: 'selector',
  theme: {
    fontFamily: {
      ubuntu: ['Ubuntu', 'sans-serif'],
    },
    screens,
    extend: {
      colors,
      transitionProperty: {
        spacing: 'margin, padding',
      },
      spacing: {
        ...Object.keys(indents).reduce((current, key) => ({ ...current, [key]: `var(--${key})` }), {}),
        i168: 'calc(theme(spacing.i120) + theme(spacing.i48))',
        i200: 'calc(theme(spacing.i120) + theme(spacing.i80))',
        grid: 'var(--grid-spacing-size)',
      },
      opacity: {
        64: '0.64',
        16: '0.16',
      },
    },
  },
  plugins: [
    plugin(({ addUtilities, theme, addBase }) => {
      addBase({
        ':root': setInterpolateVariable(theme('screens'), indents),
      });
      addUtilities({
        ...Object.keys(typography).reduce(
          (current, key) => ({
            ...current,
            [`.typo-${key}`]: setInterpolateValue(theme('screens'), typography[key], 'font-size'),
          }),
          {},
        ),
        '.page-container': {
          [`@apply px-[${grid.padding.sm}px] md:px-[${grid.padding.md}px] lg:px-[${grid.padding.lg}px]`]: {},
        },
        '.grid-subcontainer': {
          [`@apply grid gap-x-gap grid-cols-${grid.cols.sm} md:grid-cols-${grid.cols.md} lg:grid-cols-${grid.cols.lg}`]:
            {},
        },
        '.grid-container': {
          [`@apply grid-subcontainer page-container`]: {},
        },
      });
    }),
  ],
};
