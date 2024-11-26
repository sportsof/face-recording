import { defineConfig } from '@umijs/max';

export default defineConfig({
  hash: true,
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  proxy: {
    '/api/': {
       target: 'http://127.0.0.1:10088',
      changeOrigin: true,
      pathRewrite: { '^': '' },
    }
  },
  routes: [
    {
      path: '/',
      component: './',
    },
  ],
  npmClient: 'yarn',
});

