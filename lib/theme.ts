// lib/theme.ts

export const THEME = {
  // 🌊 [متغيرات هوية المياه والنقاء - Ghayam Aqua Branding]
  primary: '#122946',      // أزرق كحلي داكن (Deep Ocean)
  accent: '#1C73AB',       // أزرق مائي (Aqua Blue)
  background: '#D4F0F7',   // خلفية جليدية (Ice Blue)
  logo: '/ghayam_logo.png',// لوجو النظام
  success: '#2ECC71',      // الأخضر المرجاني (Coral Green)
  danger: '#be123c',       // الأحمر للأخطاء
  warning: '#F2C94C',      // أصفر شمسي (Sunlight)
  ruby: '#e11d48',         // الأحمر الوردي للتنبيهات العاجلة

  // 🌊 أسماء مختصرة لسهولة الاستخدام في الصفحات
  navyDark: '#122946',     // Deep Ocean
  aquaAccent: '#1C73AB',   // Aqua Blue
  cyanLight: '#A1D6E2',    // Pure Cyan

  coffeeMain: '#1C73AB',   // معاد توجيهه لـ Aqua Blue
  coffeeDark: '#122946',   // معاد توجيهه لـ Deep Ocean
  goldAccent: '#F2C94C',   // معاد توجيهه لـ Sunlight Yellow
  white: '#FFFFFF',        
  border: 'rgba(255, 255, 255, 0.6)', 
  sandLight: '#D4F0F7',    // Ice Blue
  sandDark: '#A1D6E2',     // Pure Cyan
  cinematicGlass: {
    background: 'rgba(255, 255, 255, 0.4)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
  },

  // 1️⃣ الألوان الأساسية (Brand Palette)
  brand: {
    coffee: '#122946',     // Deep Ocean
    gold: '#1C73AB',       // Aqua Blue
    goldLight: '#A1D6E2',  // Pure Cyan
    white: '#FFFFFF',
    slate: '#122946',      // Slate text to Deep Ocean
    appleGray: '#f8fafc',
  },

  // 2️⃣ حالات النظام (Status Colors)
  status: {
    success: '#2ECC71',    // Coral Green
    danger: '#be123c',
    warning: '#F2C94C',    // Sunlight Yellow
    info: '#1C73AB',       // Aqua Blue
  },

  // 3️⃣ المحرك الزجاجي (Glassmorphism Engine)
  glass: {
    bgOpacity: 0.4,          
    blur: '30px',            
    borderOpacity: 0.6,      
    saturate: '160%',        
    borderWidth: '1px',
  },

  // 4️⃣ الجداول الذكية (Smart Tables)
  table: {
    headerBg: 'rgba(28, 115, 171, 0.05)',
    headerText: '#1C73AB',
    rowBg: 'rgba(255, 255, 255, 0.4)',
    rowHover: 'rgba(28, 115, 171, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },

  // 5️⃣ السايد بار (Sidebar & Navigation)
  sidebar: {
    widthOpen: '320px',
    widthClosed: '65px',
    gradientStart: '#122946', // Deep Ocean
    gradientEnd: '#0d1c30',   // Deep Ocean Darker
  },

  // 6️⃣ التدرجات الجاهزة (Gradients)
  gradients: {
    primary: 'linear-gradient(135deg, #122946 0%, #0d1c30 100%)', // Deep Ocean Gradient
    gold: 'linear-gradient(135deg, #A1D6E2 0%, #D4F0F7 100%)',    // Aqua/Cyan Gradient
    glass: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)',
    deepOcean: 'linear-gradient(135deg, #A1D6E2 0%, #D4F0F7 100%)', 
    premiumSatin: 'linear-gradient(135deg, #A1D6E2 0%, #D4F0F7 100%)', 
  },

  // 🚀 7️⃣ الظلال الاحترافية (Floating Water Shadows)
  shadows: {
    soft: '0 8px 32px rgba(28, 115, 171, 0.1)', 
    medium: '0 16px 48px rgba(28, 115, 171, 0.15)',
    deep: '0 24px 64px rgba(28, 115, 171, 0.2)',
    goldGlow: '0 8px 24px rgba(28, 115, 171, 0.25)', // Aqua glow
    neumorphic: '-10px -10px 30px rgba(255,255,255,0.8), 10px 10px 30px rgba(28, 115, 171, 0.15), inset 0 2px 2px rgba(255,255,255,1)'
  },

  // 🚀 8️⃣ الانحناءات القياسية (Border Radius)
  radius: {
    small: '16px',
    medium: '24px',
    large: '40px',
    full: '100px', // Pill shaped for Aqua theme
  },

  // 🚀 9️⃣ نسخة التصميم الداكن (Dark Mode Specs - Not primarily used in Aqua Light)
  dark: {
    card: 'rgba(255, 255, 255, 0.4)', 
    border: 'rgba(255, 255, 255, 0.6)',
    textMain: '#122946',
    textMuted: '#1C73AB',
  },

  // 🚀 10️⃣ الخطوط والأوزان (Typography)
  typography: {
    family: "'Cairo', sans-serif",
    weights: {
      regular: 400,
      semiBold: 600,
      bold: 700,
      black: 900,
    }
  }
};

// 🚀 دالة مساعدة لتوليد ستايل الزجاج المائي (Aqua Glass)
export const getGlassStyle = (opacity = THEME.glass.bgOpacity) => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: `blur(${THEME.glass.blur}) saturate(${THEME.glass.saturate})`,
  WebkitBackdropFilter: `blur(${THEME.glass.blur}) saturate(${THEME.glass.saturate})`,
  border: `${THEME.glass.borderWidth} solid rgba(255, 255, 255, ${THEME.glass.borderOpacity})`,
  borderRadius: THEME.radius.large,
  boxShadow: THEME.shadows.neumorphic,
});

// 🚀 دالة توليد الزجاج الداكن الكحلي (Navy Glass - Sidebar)
export const getDarkGlassStyle = (opacity = 0.95) => ({
    background: `rgba(18, 41, 70, ${opacity})`,
    backdropFilter: `blur(24px) saturate(160%)`,
    WebkitBackdropFilter: `blur(24px) saturate(160%)`,
    border: `1px solid rgba(255, 255, 255, 0.1)`,
    borderRadius: THEME.radius.large,
    boxShadow: THEME.shadows.deep,
});