import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      optimizeDeps: {
        include: ['three', '@react-three/fiber', '@react-three/drei'],
        exclude: [],
        esbuildOptions: {
          target: 'esnext'
        }
      },
      build: {
        target: 'esnext',
        rollupOptions: {
          output: {
            manualChunks: {
              'three-deps': ['three'],
              'react-three': ['@react-three/fiber', '@react-three/drei']
            }
          }
        }
      }
    };
});
