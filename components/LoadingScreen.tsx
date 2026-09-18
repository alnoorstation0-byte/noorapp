"use client";
import React from 'react';
import { useThemeMode } from '@/lib/ThemeContext';

interface LoadingScreenProps {
    message?: string;
    subMessage?: string;
    fullScreen?: boolean;
}

export default function LoadingScreen({ 
    message = 'جاري تحضير ومعالجة البيانات...', 
    subMessage = 'يرجى الانتظار لحين اكتمال التحميل',
    fullScreen = true 
}: LoadingScreenProps) {
    const { isDaylight } = useThemeMode();

    return (
        <div 
            className={`loading-screen-container fade-in ${fullScreen ? 'loading-fullscreen' : 'loading-inline'} ${isDaylight ? 'daylight-active' : ''}`}
        >
            {/* الدائرة المتحركة الاحترافية */}
            <div className="loading-spinner-wrapper">
                <div className="loading-spinner-ring" />
                <div className="loading-spinner-pulse" />
            </div>

            {/* النصوص الجمالية */}
            <h2 className="loading-title">
                {message}
            </h2>
            <p className="loading-submessage">
                {subMessage}
            </p>

            <style jsx>{`
                .loading-screen-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    direction: rtl;
                    box-sizing: border-box;
                    transition: all 0.3s ease;
                }

                .loading-fullscreen {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(11, 14, 20, 0.88);
                    backdrop-filter: blur(24px) saturate(160%);
                    -webkit-backdrop-filter: blur(24px) saturate(160%);
                    z-index: 99999;
                }

                .loading-inline {
                    min-height: 300px;
                    width: 100%;
                    padding: 50px;
                    border-radius: 24px;
                    background: linear-gradient(135deg, rgba(20, 24, 34, 0.9) 0%, rgba(13, 16, 24, 0.8) 100%);
                    border: 1px solid rgba(0, 229, 255, 0.2);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 15px rgba(0, 229, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }

                .loading-spinner-wrapper {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    margin-bottom: 30px;
                }

                .loading-spinner-ring {
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    border: 4px solid rgba(0, 229, 255, 0.15);
                    border-top-color: #00E5FF;
                    animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                    box-shadow: 0 0 15px rgba(0, 229, 255, 0.2);
                }

                .loading-spinner-pulse {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 30px;
                    height: 30px;
                    background-color: #00E5FF;
                    border-radius: 50%;
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                    box-shadow: 0 0 20px rgba(0, 229, 255, 0.6);
                }

                .loading-title {
                    color: #F8FAFC;
                    font-weight: 900;
                    font-size: 1.5rem;
                    margin: 0;
                    margin-bottom: 8px;
                    text-shadow: 0 0 15px rgba(0, 229, 255, 0.25);
                    letter-spacing: -0.5px;
                    text-align: center;
                }

                .loading-submessage {
                    color: #94A3B8;
                    font-weight: 600;
                    font-size: 1rem;
                    margin: 0;
                    opacity: 0.9;
                    text-align: center;
                }

                /* ☀️ أنماط الوضع النهاري الصحراوي (Desert Glassmorphism) */
                :global(.daylight-theme) .loading-fullscreen,
                .loading-fullscreen.daylight-active {
                    background-color: rgba(253, 251, 247, 0.88) !important;
                    backdrop-filter: blur(24px) saturate(160%) !important;
                    -webkit-backdrop-filter: blur(24px) saturate(160%) !important;
                }

                :global(.daylight-theme) .loading-inline,
                .loading-inline.daylight-active {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border: 1px solid rgba(194, 155, 98, 0.35) !important;
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08), inset 0 0 15px rgba(194, 155, 98, 0.05) !important;
                }

                :global(.daylight-theme) .loading-spinner-ring,
                .daylight-active .loading-spinner-ring {
                    border-color: rgba(194, 155, 98, 0.2) !important;
                    border-top-color: #C29B62 !important;
                    box-shadow: 0 0 15px rgba(194, 155, 98, 0.25) !important;
                }

                :global(.daylight-theme) .loading-spinner-pulse,
                .daylight-active .loading-spinner-pulse {
                    background-color: #A8573C !important;
                    box-shadow: 0 0 20px rgba(168, 87, 60, 0.4) !important;
                }

                :global(.daylight-theme) .loading-title,
                .daylight-active .loading-title {
                    color: #2C1A12 !important;
                    text-shadow: none !important;
                }

                :global(.daylight-theme) .loading-submessage,
                .daylight-active .loading-submessage {
                    color: rgba(44, 26, 18, 0.65) !important;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    50% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.8); }
                }
                .fade-in {
                    animation: fadeIn 0.4s ease-out forwards;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
