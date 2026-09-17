"use client";
import React, { Suspense } from 'react';
import { useLoginLogic } from './login_logic';

// ⚡️ ثيم مركز القيادة لمحطات النور (Noor Command Center Theme)
const NOOR_THEME = {
  bgDark: '#0B0E14',
  surfaceTitanium: '#141822',
  cyanAccent: '#00E5FF',
  emeraldGreen: '#10B981',
  amberAlert: '#F59E0B',
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
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        @keyframes onAutoFillStart { from {} to {} }

        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
          background: radial-gradient(circle at 50% 25%, rgba(0, 229, 255, 0.12) 0%, rgba(11, 14, 20, 0.98) 70%), #0B0E14;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .login-wrapper::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.15) 0%, transparent 70%);
          top: -120px;
          right: -120px;
          border-radius: 50%;
          pointer-events: none;
        }

        .login-wrapper::after {
          content: '';
          position: absolute;
          width: 450px;
          height: 450px;
          background: radial-gradient(circle, rgba(224, 109, 68, 0.15) 0%, transparent 70%);
          bottom: -100px;
          left: -100px;
          border-radius: 50%;
          pointer-events: none;
        }

        .glass-card {
          width: 100%;
          max-width: 460px;
          background: linear-gradient(135deg, rgba(20, 24, 34, 0.94) 0%, rgba(13, 16, 24, 0.90) 100%);
          backdrop-filter: blur(24px) saturate(160%);
          -webkit-backdrop-filter: blur(24px) saturate(160%);
          border: 1px solid rgba(0, 229, 255, 0.25);
          border-radius: 28px;
          padding: 44px 36px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 229, 255, 0.12); 
          animation: fadeInUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          position: relative;
          z-index: 10;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .logo-container {
          text-align: center;
          margin-bottom: 20px;
        }

        .logo-container img {
          height: 100px;
          width: 100px;
          object-fit: contain;
          border-radius: 50%;
          border: 2px solid rgba(0, 229, 255, 0.4);
          padding: 6px;
          background: rgba(11, 14, 20, 0.85);
          box-shadow: 0 0 25px rgba(0, 229, 255, 0.3);
          transition: transform 0.3s ease;
        }
        
        .logo-container img:hover { transform: scale(1.08); }

        .cinematic-title {
          color: #F8FAFC;
          font-weight: 900;
          font-size: 27px;
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: -0.3px;
          text-shadow: 0 0 15px rgba(0, 229, 255, 0.25);
        }

        .cinematic-subtitle {
          color: #94A3B8;
          text-align: center;
          font-size: 14.5px;
          font-weight: 700;
          margin-bottom: 32px;
        }

        .input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .cinematic-input {
          width: 100%;
          padding: 14px 18px;
          border-radius: 14px;
          border: 1px solid rgba(0, 229, 255, 0.25);
          background: rgba(11, 14, 20, 0.7);
          color: #F8FAFC;
          font-size: 15px;
          font-weight: 700;
          outline: none;
          transition: all 0.25s ease;
          font-family: inherit;
        }

        .cinematic-input:focus {
          background: rgba(15, 20, 30, 0.95);
          border-color: #00E5FF;
          box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.25), 0 0 15px rgba(0, 229, 255, 0.2);
        }

        .floating-label {
          position: absolute;
          right: 18px;
          top: 50%;
          transform: translateY(-50%);
          color: #94A3B8;
          font-size: 13.5px;
          font-weight: 700;
          pointer-events: none;
          transition: 0.2s ease all;
        }

        .cinematic-input:focus ~ .floating-label,
        .cinematic-input:not(:placeholder-shown) ~ .floating-label,
        .forced-float {
          top: -10px;
          right: 12px;
          font-size: 11.5px;
          font-weight: 800;
          color: #00E5FF;
          background: #141822;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid rgba(0, 229, 255, 0.3);
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          background: linear-gradient(135deg, #00E5FF 0%, #0088CC 100%);
          color: #0B0E14;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(0, 229, 255, 0.35);
          font-family: inherit;
          margin-top: 6px;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0, 229, 255, 0.5);
          filter: brightness(1.05);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .toggle-btn {
          width: 100%;
          background: none;
          border: none;
          color: #94A3B8;
          font-family: inherit;
          font-size: 13.5px;
          font-weight: 700;
          margin-top: 18px;
          cursor: pointer;
          transition: 0.2s;
        }
        .toggle-btn span { color: #00E5FF; text-decoration: underline; font-weight: 800; }
        .toggle-btn:hover { color: #F8FAFC; }
        
        @media (max-width: 480px) {
          .glass-card { padding: 34px 22px; border-radius: 22px; }
          .cinematic-title { font-size: 23px; }
          .logo-container img { height: 85px; width: 85px; }
        }
      `}</style>

      <div className="glass-card">
        <div className="logo-container">
          <img src="/logo.png" alt="Noor Gas Station" />
        </div>
        
        <h1 className="cinematic-title">محطات النور للوقود</h1>
        <p className="cinematic-subtitle">{isSignUp ? 'إنشاء حساب جديد بالمنظومة' : 'نورك على الطريق'}</p>

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

        <div style={{ textAlign: 'center', marginTop: '22px' }}>
          <p style={{ color: '#64748b', fontSize: '11.5px', fontWeight: 700 }}>
            جميع الحقوق محفوظة © {new Date().getFullYear()} <br/> محطات النور للوقود (إدارة محطات الوقود)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0B0E14', color: '#00E5FF'}}>جاري التحميل...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

