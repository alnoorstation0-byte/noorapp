// lib/theme.ts - Noor Gas Station Command Center Theme

export const THEME = {
  // 🚀 [مركز القيادة والتحكم - Command Center Dark Palette]
  primary: '#00E5FF',       // أزرق نيون (Electric Cyan) - الطاقة، الإيجابية، المؤشرات الحيوية
  accent: '#00E5FF',        // أزرق نيون رئيسي (Electric Cyan)
  terracotta: '#E06D44',    // برتقالي تيراكوتا (Terracotta Orange) - التنبيهات والتبويب النشط
  background: '#0B0E14',    // تيتانيوم داكن فائق العمق (Titanium Space Grey)
  surface: '#141822',       // أسطح النوافذ والبطاقات (Deep Titanium Surface)
  cardBg: 'rgba(20, 24, 34, 0.85)', // زجاج تيتانيوم داكن
  success: '#10B981',       // أخضر نيون / واحة (Neon Emerald)
  
  // ألوان داعمة
  info: '#00E5FF',          // نيون سيان للمعلومات
  danger: '#EF4444',        // أحمر نيون للتحذيرات الحرجة
  ruby: '#EF4444',          // أحمر ياقوتي نيون للتنبيهات والخصومات
  warning: '#E06D44',       // تيراكوتا برتقالي للإنذارات وتوشك على النفاذ
  text: '#F8FAFC',          // نصوص ساطعة عالية التباين (Slate 50)
  textMuted: '#94A3B8',     // نصوص ثانوية ووصفية (Slate 400)
  logo: '/logo.png',        // لوجو محطات النور للوقود الرسمي
  logoDark: '/logo_dark.png',

  // أسماء مخصصة للتوافق البرمجي السريع
  navyDark: '#0B0E14',     
  aquaAccent: '#00E5FF',   
  cyanLight: '#67E8F9',    
  accentLight: '#A5F3FC',  

  coffeeMain: '#00E5FF',   
  coffeeDark: '#0B0E14',   
  goldAccent: '#00E5FF',   
  white: '#F8FAFC',        
  border: 'rgba(0, 229, 255, 0.2)', 
  sandLight: '#141822',    
  sandDark: 'rgba(0, 0, 0, 0.5)',     

  // 🔮 تأثيرات زجاج مركز القيادة (Command Center Glass Effects)
  cinematicGlass: {
    background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.85) 0%, rgba(13, 16, 24, 0.7) 100%)',
    border: '1px solid rgba(0, 229, 255, 0.2)',
    backdropFilter: 'blur(24px) saturate(160%)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5), inset 0 0 12px rgba(0, 229, 255, 0.05)',
  },

  brand: {
    cyan: '#00E5FF',
    orange: '#E06D44',
    titanium: '#0B0E14',
    surface: '#141822',
    white: '#F8FAFC',
    slate: '#94A3B8',
    appleGray: '#1A1E29',
  },

  status: {
    success: '#10B981',
    danger: '#EF4444',
    warning: '#E06D44',
    info: '#00E5FF',
  },

  glass: {
    bgOpacity: 0.85,          
    blur: '24px',            
    borderOpacity: 0.2,      
    saturate: '160%',        
    borderWidth: '1px',
  },

  table: {
    headerBg: 'rgba(0, 229, 255, 0.08)',
    headerText: '#00E5FF',
    rowBg: 'rgba(20, 24, 34, 0.75)',
    rowHover: 'rgba(0, 229, 255, 0.1)',
    borderColor: 'rgba(0, 229, 255, 0.15)',
  },

  sidebar: {
    widthOpen: '300px',
    widthClosed: '70px',
    gradientStart: '#0B0E14',
    gradientEnd: '#07090D',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #00E5FF 0%, #0077B6 100%)',
    orange: 'linear-gradient(135deg, #E06D44 0%, #B23B15 100%)',
    glass: 'linear-gradient(135deg, rgba(20, 24, 34, 0.85) 0%, rgba(13, 16, 24, 0.7) 100%)',
    deepTitanium: '#0B0E14',
    commandCard: 'linear-gradient(180deg, rgba(22, 27, 38, 0.9) 0%, rgba(15, 18, 25, 0.85) 100%)',
  },

  shadows: {
    soft: '0 4px 12px rgba(0, 0, 0, 0.35)', 
    medium: '0 8px 24px rgba(0, 0, 0, 0.45)',
    deep: '0 16px 36px rgba(0, 0, 0, 0.6)',
    hover: '0 12px 28px rgba(0, 229, 255, 0.25)',
    neonCyan: '0 0 20px rgba(0, 229, 255, 0.45)',
    neonOrange: '0 0 20px rgba(224, 109, 68, 0.45)',
    neumorphic: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
};