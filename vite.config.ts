/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    
    // Test configuration
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./tests/setup.ts'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          'coverage/',
          '**/*.d.ts',
          'tests/',
          'docs/',
          'scripts/',
          'playwright/',
        ],
      },
    },
    
    // Path resolution
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    
    // Development server configuration
    server: {
      port: 5173,
      strictPort: false,
      host: true, // Needed for Docker
      cors: true,
      headers: {
        // Security headers for development
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
      },
    },
    
    // Preview server configuration
    preview: {
      port: 5174,
      strictPort: false,
      host: true,
      cors: true,
      headers: {
        // Security headers for preview
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN', 
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    },
    
    // Build configuration
    build: {
      // Target modern browsers
      target: 'es2020',
      
      // Output directory
      outDir: 'dist',
      
      // Generate source maps for production debugging
      sourcemap: mode === 'production' ? 'hidden' : true,
      
      // Minification
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        },
      },
      
      // Asset optimization
      assetsInlineLimit: 4096, // 4kb
      
      // Chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['framer-motion', 'lucide-react'],
            'dnd-vendor': ['react-dnd', 'react-dnd-html5-backend', 'react-dnd-touch-backend'],
            'supabase-vendor': ['@supabase/supabase-js'],
            'utils-vendor': ['uuid', 'zustand', 'immer'],
          },
          
          // Consistent file naming
          chunkFileNames: 'js/[name]-[hash].js',
          entryFileNames: 'js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const extType = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
              return `img/[name]-[hash][extname]`;
            }
            if (/woff2?|eot|ttf|otf/i.test(extType)) {
              return `fonts/[name]-[hash][extname]`;
            }
            if (/css/i.test(extType)) {
              return `css/[name]-[hash][extname]`;
            }
            return `assets/[name]-[hash][extname]`;
          },
        },
      },
    },
    
    // Environment variable handling
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __VERSION__: JSON.stringify(process.env.npm_package_version || '0.1.0'),
    },
    
    // CSS configuration
    css: {
      devSourcemap: true,
    },
  };
});