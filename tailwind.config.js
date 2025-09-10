/** @type {import('tailwindcss').Config} */
export const content = [
  "./src/**/*.{js,jsx,ts,tsx}",
]
export const theme = {
  extend: {
    // Custom widths für clamp() Werte
    width: {
      'tab-menu': 'clamp(280px, 85vw, 400px)',
      'tab-menu-sm': 'clamp(260px, 90vw, 300px)',
    },

    // Custom border radius
    borderRadius: {
      'pill': '36px',
    },

    // Custom animations
    animation: {
      'slide-up': 'slideUp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
    },

    keyframes: {
      slideUp: {
        from: {
          transform: 'translateY(100px)',
          opacity: '0',
        },
        to: {
          transform: 'translateY(0)',
          opacity: '1',
        },
      },
    },

    // Custom easing
    transitionTimingFunction: {
      'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },

    // Custom backgrounds
    backgroundImage: {
      'gradient-active': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)',
    },

    // Custom spacing für safe area
    spacing: {
      'safe': 'calc(20px + env(safe-area-inset-bottom, 20px))',
      'safe-sm': 'calc(8px + env(safe-area-inset-bottom, 8px))',
    },
  },
}
export const plugins = [
  // Plugin für custom utilities
  function ({ addUtilities, theme }) {
    const newUtilities = {
      // Glasmorphismus Background (simplified - backdrop-blur now available as utility)
      '.glass-bg': {
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      },

      // Liquid Glass Shadow
      '.glass-shadow': {
        'box-shadow': `
            0 8px 32px rgba(0, 0, 0, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
      },

      // Active state shadow mit mehr Glow
      '.glass-shadow-active': {
        'box-shadow': `
            0 8px 32px rgba(0, 0, 0, 0.1),
            0 2px 8px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.2)
          `,
      },

      // Bottom positioning mit safe area (floating version)
      '.bottom-safe-floating': {
        bottom: 'calc(28px + env(safe-area-inset-bottom, 28px))',
        '@media (max-width: 600px)': {
          bottom: 'calc(16px + env(safe-area-inset-bottom, 16px))',
        },
      },
    }

    addUtilities(newUtilities)
  }
]