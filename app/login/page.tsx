"use client";
import React from 'react';
import { useLoginLogic } from './login_logic'; // 👈 استدعاء العقل المدبر

import { Suspense } from 'react';

// 🎨 تطبيق ألوان هوية "مياه غيام" الأكوا
const THEME = {
  navyDark: '#122946',
  aquaDeep: '#1C355E',
  aquaAccent: '#2891C8',
  cyanLight: '#7FD4E3',
  glassWhite: '#F5F9FC',
  white: '#ffffff',
  slate: '#475569'
};

function LoginPageContent() {
  const {
    isSignUp, toggleSignUp,
    fullName, setFullName,
    email, setEmail,
    password, setPassword,
    isLoading,
    handleAutoFill,
    handleSubmit
  } = useLoginLogic();

  return (
    <div className="login-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes onAutoFillStart { from {} to {} }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          /* 🌊 خلفية احترافية مائية مدمجة مع الصورة */
          background-image: linear-gradient(135deg, rgba(18, 41, 70, 0.95), rgba(40, 145, 200, 0.85)), url('/ghayam_logo.png');
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
        }

        .glass-card {
          width: 100%;
          max-width: 480px;
          /* 🪟 زجاج مائي راقي */
          background: rgba(255, 255, 255, 0.1); 
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(127, 212, 227, 0.3); /* حواف سماوية */
          border-radius: 28px;
          padding: 50px 40px;
          box-shadow: 0 25px 50px -12px rgba(18, 41, 70, 0.7), 0 0 40px rgba(40, 145, 200, 0.15); 
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          margin: 20px;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .logo-container {
          text-align: right;
          margin-bottom: 25px;
        }

        .logo-container img {
          height: 110px;
          filter: drop-shadow(0px 10px 15px rgba(18, 41, 70,0.6));
          transition: transform 0.3s ease;
        }
        
        .logo-container img:hover { transform: scale(1.05); }

        .cinematic-title {
          color: ${THEME.white};
          font-weight: 900;
          font-size: 32px;
          text-align: center;
          margin-bottom: 8px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }

        .cinematic-subtitle {
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 40px;
        }

        .input-group {
          position: relative;
          margin-bottom: 25px;
        }

        .cinematic-input {
          width: 100%;
          padding: 18px 20px;
          background: rgba(255, 255, 255, 0.1) !important;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 14px;
          color: ${THEME.white} !important;
          font-size: 16px;
          font-weight: 700;
          outline: none;
          transition: all 0.3s ease;
          text-align: right;
        }

        .cinematic-input:focus { 
            border-color: ${THEME.cyanLight}; 
            background: rgba(255, 255, 255, 0.15) !important; 
            box-shadow: 0 0 20px rgba(127, 212, 227, 0.3);
        }

        .cinematic-input:-webkit-autofill {
          animation-name: onAutoFillStart;
          -webkit-text-fill-color: #ffffff !important;
          -webkit-box-shadow: 0 0 0px 1000px rgba(18, 41, 70, 0.9) inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .floating-label {
          position: absolute;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.7);
          font-size: 16px;
          font-weight: 700;
          pointer-events: none;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }

        .cinematic-input:focus ~ .floating-label, 
        .cinematic-input:not(:placeholder-shown) ~ .floating-label,
        .cinematic-input:-webkit-autofill ~ .floating-label,
        .forced-float {
          top: -12px !important;
          right: 15px !important;
          font-size: 13px !important;
          color: ${THEME.navyDark} !important;
          background: ${THEME.cyanLight} !important;
          padding: 2px 10px !important;
          border-radius: 6px !important;
          transform: translateY(0) !important;
          opacity: 1 !important;
          font-weight: 900 !important;
          box-shadow: 0 4px 10px rgba(127, 212, 227, 0.3);
        }

        .submit-btn {
          width: 100%;
          padding: 18px;
          margin-top: 10px;
          background: linear-gradient(135deg, ${THEME.aquaAccent}, ${THEME.cyanLight});
          color: ${THEME.navyDark};
          border: none;
          border-radius: 14px;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 10px 20px rgba(40, 145, 200, 0.3);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px rgba(40, 145, 200, 0.4);
          background: linear-gradient(135deg, ${THEME.cyanLight}, ${THEME.aquaAccent});
        }
        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .toggle-btn {
          width: 100%;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          margin-top: 20px;
          cursor: pointer;
          transition: 0.3s;
        }
        .toggle-btn span { color: ${THEME.cyanLight}; text-decoration: underline; }
        .toggle-btn:hover { color: ${THEME.white}; }
        
        /* 📱 دعم الموبايل في صفحة الدخول (تجاوب احترافي) */
        @media (max-width: 480px) {
            .login-wrapper { align-items: flex-start; padding-top: 20px; }
            .glass-card { padding: 40px 20px; border-radius: 24px; margin: 15px; width: calc(100% - 30px); }
            .cinematic-title { font-size: 26px; }
            .cinematic-subtitle { font-size: 14px; margin-bottom: 30px; }
            .logo-container { margin-bottom: 20px; }
            .logo-container img { height: 95px; }
            .cinematic-input { padding: 15px 18px; font-size: 15px; }
            .submit-btn { padding: 15px; font-size: 16px; margin-top: 5px; }
        }
      `}</style>

      <div className="glass-card">
        <div className="logo-container">
          <img src="/ghayam_logo.png" alt="شعار شركة مياه غيام" />
        </div>
        
        <h1 className="cinematic-title">مياه غيام</h1>
        <p className="cinematic-subtitle">{isSignUp ? 'إنشاء حساب جديد' : 'النظام المالي المتكامل'}</p>

        <form onSubmit={handleSubmit}>
          
          {isSignUp && (
            <div className="input-group" style={{ animation: 'fadeInUp 0.4s forwards' }}>
              <input 
                type="text" 
                className="cinematic-input" 
                placeholder=" " 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required={isSignUp} 
              />
              <label className={`floating-label ${fullName ? 'forced-float' : ''}`}>👤 الاسم الكامل</label>
            </div>
          )}

          <div className="input-group">
            <input 
              type="email" 
              className="cinematic-input" 
              placeholder=" " 
              value={email}
              onAnimationStart={handleAutoFill}
              onChange={(e) => setEmail(e.target.value)}
              required 
              autoComplete="email"
            />
            <label className={`floating-label ${email ? 'forced-float' : ''}`}>✉️ البريد الإلكتروني</label>
          </div>

          <div className="input-group">
            <input 
              type="password" 
              className="cinematic-input" 
              placeholder=" " 
              value={password}
              onAnimationStart={handleAutoFill}
              onChange={(e) => setPassword(e.target.value)}
              required 
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
            <label className={`floating-label ${password ? 'forced-float' : ''}`}>🔒 كلمة المرور</label>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '⏳ جاري المعالجة...' : (isSignUp ? 'إنشاء الحساب 🚀' : 'دخول للنظام 🚀')}
          </button>
        </form>

        <button type="button" className="toggle-btn" onClick={toggleSignUp}>
          {isSignUp ? (
            <>لديك حساب بالفعل؟ <span>سجل دخولك من هنا</span></>
          ) : (
            <>مستخدم جديد للمنصة؟ <span>إنشاء حساب جديد</span></>
          )}
        </button>

        <div style={{ textAlign: 'center', marginTop: '25px' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} <br/> إدارة تقنية المعلومات - مياه غيام
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: THEME.navyDark, color: 'white'}}>جاري التحميل...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
