import type { Preview } from '@storybook/react-vite'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    },

    viewport: {
      viewports: {
        // Mobile devices
        mobile1: {
          name: 'Small Mobile',
          styles: {
            width: '320px',
            height: '568px',
          },
          type: 'mobile',
        },
        mobile2: {
          name: 'Large Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
          type: 'mobile',
        },
        mobile3: {
          name: 'iPhone 12/13',
          styles: {
            width: '390px',
            height: '844px',
          },
          type: 'mobile',
        },
        mobile4: {
          name: 'iPhone 14 Pro Max',
          styles: {
            width: '430px',
            height: '932px',
          },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
          type: 'tablet',
        },
        tabletLandscape: {
          name: 'Tablet Landscape',
          styles: {
            width: '1024px',
            height: '768px',
          },
          type: 'tablet',
        },
        // Desktop (keeping defaults)
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '720px',
          },
          type: 'desktop',
        },
        desktopLarge: {
          name: 'Large Desktop',
          styles: {
            width: '1920px',
            height: '1080px',
          },
          type: 'desktop',
        },
      },
      defaultViewport: 'mobile2', // Default to mobile view
    },
  },
};

export default preview;