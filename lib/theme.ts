// lib/theme.ts - Noor Gas Station Command Center Themes (Dark & Daylight)

export const DARK_THEME = {
  mode: 'dark' as const,
  primary: '#00E5FF',       // أزرق نيون (Electric Cyan)
  accent: '#00E5FF',        // أزرق نيون رئيسي
  terracotta: '#E06D44',    // برتقالي تيراكوتا (Terracotta Orange)
  background: '#0B0E14',    // تيتانيوم داكن فائق العمق (Titanium Space Grey)
  surface: '#141822',       // أسطح النوافذ والبطاقات (Deep Titanium Surface)
  cardBg: 'rgba(20, 24, 34, 0.85)', // زجاج تيتانيوم داكن
  success: '#10B981',       // أخضر نيون / واحة (Neon Emerald)
  
  info: '#00E5FF',          
  danger: '#EF4444',        
  ruby: '#EF4444',          
  warning: '#E06D44',       
  text: '#F8FAFC',          
  textMuted: '#94A3B8',     
  logo: '/logo.png',        
  logoDark: '/logo_dark.png',

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

// ☀️ [وضع الرؤية النهارية - Daylight Command Center Palette]
export const DAYLIGHT_THEME = {
  mode: 'daylight' as const,
  primary: '#0284C7',       // أزرق بترولي ناصع عالي التباين النهاري
  accent: '#0284C7',        // أزرق سماوي مركز
  terracotta: '#EA580C',    // برتقالي دافئ عالي التباين
  background: '#F8FAFC',    // تيتانيوم قطبي نهاري فاتح وناصع
  surface: '#FFFFFF',       // أسطح بيضاء زجاجية
  cardBg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.9) 100%)',
  success: '#059669',       // أخضر زمردي نهاري
  
  info: '#0284C7',          
  danger: '#DC2626',        
  ruby: '#DC2626',          
  warning: '#EA580C',       
  text: '#0F172A',          // رمادي داكن فاحم مقروء في ضوء الشمس (Slate 900)
  textMuted: '#475569',     // نصوص ثانوية واضحة (Slate 600)
  logo: '/logo.png',        
  logoDark: '/logo_dark.png',

  navyDark: '#F8FAFC',     
  aquaAccent: '#0284C7',   
  cyanLight: '#0EA5E9',    
  accentLight: '#38BDF8',  
  coffeeMain: '#0284C7',   
  coffeeDark: '#F8FAFC',   
  goldAccent: '#0284C7',   
  white: '#FFFFFF',        
  border: 'rgba(2, 132, 199, 0.22)', 
  sandLight: '#FFFFFF',    
  sandDark: 'rgba(15, 23, 42, 0.05)',     

  cinematicGlass: {
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(243, 247, 252, 0.85) 100%)',
    border: '1px solid rgba(2, 132, 199, 0.22)',
    backdropFilter: 'blur(24px) saturate(180%)',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
  },

  brand: {
    cyan: '#0284C7',
    orange: '#EA580C',
    titanium: '#F1F5F9',
    surface: '#FFFFFF',
    white: '#FFFFFF',
    slate: '#475569',
    appleGray: '#E2E8F0',
  },

  status: {
    success: '#059669',
    danger: '#DC2626',
    warning: '#EA580C',
    info: '#0284C7',
  },

  glass: {
    bgOpacity: 0.92,          
    blur: '24px',            
    borderOpacity: 0.22,      
    saturate: '180%',        
    borderWidth: '1px',
  },

  table: {
    headerBg: 'rgba(2, 132, 199, 0.08)',
    headerText: '#0369A1',
    rowBg: 'rgba(255, 255, 255, 0.85)',
    rowHover: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(226, 232, 240, 0.9)',
  },

  sidebar: {
    widthOpen: '300px',
    widthClosed: '70px',
    gradientStart: '#FFFFFF',
    gradientEnd: '#F1F5F9',
  },

  gradients: {
    primary: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
    orange: 'linear-gradient(135deg, #EA580C 0%, #C2410C 100%)',
    glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.9) 100%)',
    deepTitanium: '#F8FAFC',
    commandCard: 'linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.92) 100%)',
  },

  shadows: {
    soft: '0 4px 12px rgba(15, 23, 42, 0.05)', 
    medium: '0 8px 24px rgba(15, 23, 42, 0.08)',
    deep: '0 16px 36px rgba(15, 23, 42, 0.12)',
    hover: '0 12px 28px rgba(2, 132, 199, 0.18)',
    neonCyan: '0 0 20px rgba(2, 132, 199, 0.25)',
    neonOrange: '0 0 20px rgba(234, 88, 12, 0.25)',
    neumorphic: '0 8px 24px rgba(15, 23, 42, 0.06)',
  },

  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
};

// التوافق المباشر الافتراضي
export const THEME = DARK_THEME;

export function getThemeByMode(mode: 'dark' | 'daylight') {
  return mode === 'daylight' ? DAYLIGHT_THEME : DARK_THEME;
}