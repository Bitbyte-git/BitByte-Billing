export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#111436',
        ink: '#1B1A47',
        panel: '#1F2047',
        purple: '#7444DC',
        violet: '#422698',
        lavender: '#8D6BE2',
        surface: '#FBFBFD',
        line: '#DCDCE4'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        premium: '0 18px 45px rgba(17,20,54,0.12)',
        glow: '0 14px 34px rgba(116,68,220,0.28)'
      }
    }
  },
  plugins: []
};
