import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'map-vendor': ['leaflet', 'react-leaflet'],
              'pdf-core-vendor': ['jspdf', 'jspdf-autotable'],
              'pdf-render-vendor': ['html2canvas', 'canvg'],
              'charts-vendor': ['recharts'],
              'supabase-vendor': ['@supabase/supabase-js']
            }
          }
        }
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
