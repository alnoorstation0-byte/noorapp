"use client";
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ExportLoadingModalProps {
    isOpen: boolean;
    progressText: string;
}

export default function ExportLoadingModal({ isOpen, progressText }: ExportLoadingModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // استخراج نسبة التقدم من النص لتحريك الشريط
    let percentage = 100;
    if (progressText) {
        const match = progressText.match(/\((\d+)\s*من\s*(\d+)\)/);
        if (match && Number(match[2]) > 0) {
            percentage = (Number(match[1]) / Number(match[2])) * 100;
        } else if (progressText.includes("سحب")) {
            percentage = 10;
        }
    }

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className="live-preview-overlay">
            
            <div className="live-preview-header">
                <div className="pulse-icon">🖨️</div>
                <h2>نظام محطات النور للوقود</h2>
                <p className="progress-text">{progressText || 'جاري تهيئة محرك الطباعة...'}</p>
                
                <div className="progress-bar-container">
                    <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
                </div>
                <small className="warning">⚠️ يرجى عدم إغلاق النافذة حتى يتم تنزيل جميع الملفات</small>
            </div>

            {/* 🎯 هذه هي الحاوية السحرية: المتصفح مجبر على رسم الـ HTML هنا لتصويره */}
            <div className="live-preview-workspace">
                <div id="pdf-render-mount-point" className="a4-render-area">
                    {/* محرك اللوجيك سيقوم بحقن الـ HTML هنا ورؤيته لايف */}
                </div>
            </div>

            <style>{`
                .live-preview-overlay {
                    position: fixed; inset: 0; background: rgba(11, 14, 20, 0.96); backdrop-filter: blur(16px);
                    z-index: 9999999; display: flex; flex-direction: column; align-items: center; 
                    padding: 30px 20px; overflow-y: auto; direction: rtl; font-family: inherit;
                }
                .live-preview-header {
                    text-align: center; margin-bottom: 30px; width: 100%; max-width: 600px;
                }
                .pulse-icon { font-size: 50px; animation: pulse 1.5s infinite; margin-bottom: 10px; }
                @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.1); } 100% { transform: scale(1); } }
                
                .live-preview-header h2 { color: #00E5FF; margin: 0 0 10px 0; font-size: 24px; font-weight: 900; }
                .progress-text { color: #00E5FF; font-size: 15px; font-weight: 800; background: rgba(0, 229, 255, 0.1); padding: 10px 20px; border-radius: 12px; border: 1px dashed rgba(0, 229, 255, 0.3); display: inline-block; margin: 0; }
                
                .progress-bar-container { width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 15px 0; overflow: hidden; }
                .progress-bar-fill { height: 100%; background: linear-gradient(90deg, #00E5FF, #0077B6); transition: width 0.3s ease; box-shadow: 0 0 12px rgba(0, 229, 255, 0.5); }
                
                .warning { color: #94A3B8; font-size: 13px; font-weight: bold; }

                /* مساحة العمل التي سيرسم فيها الكشف */
                .live-preview-workspace {
                    background: #141822; padding: 20px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.8);
                    width: 840px; max-width: 100%; overflow-x: auto; border: 1px solid rgba(0, 229, 255, 0.25);
                }
                .a4-render-area {
                    width: 800px; min-height: 1123px; background: white; margin: 0 auto; box-shadow: 0 5px 25px rgba(0,0,0,0.4);
                }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
}
