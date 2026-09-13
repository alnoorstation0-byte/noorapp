// lib/theme.ts

export const THEME = {
  // 🏜️ [لوحة الألوان الصحراوية - Desert Core Palette]
  primary: '#2C1A12',      // بني الخيام الداكن (Deep Tent Brown) - النصوص الأساسية، العناوين، الأشرطة
  accent: '#C29B62',       // رملي ذهبي (Golden Sand) - الأزرار الرئيسية، الأيقونات النشطة، اللوجو
  terracotta: '#A8573C',   // طوبي دافئ (Terracotta Clay) - التنبيهات، وحالات التمرير، وتأثيرات العمق
  background: '#FDFBF7',   // كثبان لؤلؤية (Dune Pearl) - الخلفية العامة للتطبيق
  success: '#4E734F',      // أخضر الواحة (Oasis Green) - حالات النجاح والمخزون
  
  // ألوان داعمة
  info: '#3B82F6',         // أزرق للتنبيهات المعلوماتية
  danger: '#A8573C',       // طوبي دافئ للتحذير والخطأ
  warning: '#C29B62',      // ذهبي رملي للتحذيرات
  text: '#2C1A12',         // نصوص رئيسية
  textMuted: 'rgba(44, 26, 18, 0.6)', // نصوص ثانوية ووصفية
  logo: '/taj_logo.png',   // لوجو صيدلية تاج المودة

  // أسماء مخصصة للمطابقة البرمجية السريعة
  navyDark: '#2C1A12',     
  aquaAccent: '#C29B62',   
  cyanLight: '#D9B780',    
  accentLight: '#F3E5AB',  

  coffeeMain: '#C29B62',   
  coffeeDark: '#2C1A12',   
  goldAccent: '#C29B62',   
  white: '#FFFFFF',        
  border: 'rgba(194, 155, 98, 0.3)', 
  sandLight: '#FDFBF7',    
  sandDark: 'rgba(44, 26, 18, 0.08)',     

  // 🏜️ تأثيرات الزجاج الصحراوي (Desert Glass Effects)
  cinematicGlass: {
    background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.8) 0%, rgba(255, 253, 250, 0.45) 100%)',
    border: '1px solid rgba(194, 155, 98, 0.3)',
    backdropFilter: 'blur(24px) saturate(160%)',
    boxShadow: '0 4px 6px rgba(44, 26, 18, 0.08)',
  },

  brand: {
    coffee: '#2C1A12',
    gold: '#C29B62',
    goldLight: '#E0C596',
    white: '#FFFFFF',
    slate: 'rgba(44, 26, 18, 0.6)',
    appleGray: '#FDFBF7',
  },

  status: {
    success: '#4E734F',
    danger: '#A8573C',
    warning: '#C29B62',
    info: '#3B82F6',
  },

  glass: {
    bgOpacity: 0.8,          
    blur: '24px',            
    borderOpacity: 0.3,      
    saturate: '160%',        
    borderWidth: '1px',
  },

  table: {
    headerBg: 'rgba(194, 155, 98, 0.12)',
    headerText: '#2C1A12',
    rowBg: 'rgba(255, 253, 250, 0.7)',
    rowHover: 'rgba(194, 155, 98, 0.08)',
    borderColor: 'rgba(194, 155, 98, 0.25)',
  },

  sidebar: {
    widthOpen: '320px',
    widthClosed: '65px',
    gradientStart: '#2C1A12',
    gradientEnd: '#1A0F0A',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #2C1A12 0%, #1A0F0A 100%)',
    gold: 'linear-gradient(135deg, #C29B62 0%, #A8573C 100%)',
    glass: 'linear-gradient(135deg, rgba(255, 253, 250, 0.8) 0%, rgba(255, 253, 250, 0.45) 100%)',
    deepOcean: '#2C1A12',
    premiumSatin: '#FDFBF7',
  },

  shadows: {
    soft: '0 4px 6px rgba(44, 26, 18, 0.08)', 
    medium: '0 8px 12px rgba(44, 26, 18, 0.1)',
    deep: '0 16px 24px rgba(44, 26, 18, 0.14)',
    hover: '0 10px 15px rgba(168, 87, 60, 0.15)',
    goldGlow: '0 8px 20px rgba(194, 155, 98, 0.35)',
    neumorphic: '0 4px 6px rgba(44, 26, 18, 0.08)',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
};