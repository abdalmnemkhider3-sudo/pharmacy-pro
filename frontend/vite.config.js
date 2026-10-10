
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ⚡ إعداد Vite + Proxy:
// جميع طلبات /api/* و /uploads/* تذهب مباشرة إلى خادم PHP.
// بهذا لا تظهر أي مشاكل CORS ولا يهم إذا تغير منفذ Vite.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // إن كان 5173 مشغولًا (مشروع آخر مثلًا)، يجرّب 5174 وهكذا بدل رفض العمل كليًا
    open: true,        // يفتح المتصفح تلقائيًا عند التشغيل؛ لن يسبب خطأ إن تعذّر ذلك (مثلًا على خادم بلا واجهة رسومية)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // /api/auth/login → /auth/login على الخادم PHP
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
