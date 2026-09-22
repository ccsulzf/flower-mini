import uni from '@uni-helper/eslint-config'

export default uni({
  unocss: true,
  ignores: [
    '**/static/**',
    '**/uniCloud-alipay/**',
    '**/uni_modules/**',
  ],
  rules: {
    'no-console': 'off', // 👈 允许使用 console.log
  },
})
