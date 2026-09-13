"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useArAgingLogic } from './ar_aging_logic';
import MasterPage from '@/components/MasterPage';

export default function ArAgingPage() {
    const {
        filteredClients,
        globalSearch,
        setGlobalSearch,
        totals,
        isLoading,
        exportToExcel
    } = useArAgingLogic();

    const headerContent = (
        <button onClick={exportToExcel} disabled={filteredClients.length === 0} className={`btn-main-glass ${filteredClients.length === 0 ? 'disabled' : 'green'}`} style={{ width: 'auto', padding: '10px 20px' }}>
            <span>تصدير Excel 📑</span>
        </button>
    );

    return (
        <MasterPage icon="⏳" title="أعمار الديون (AR Aging)" subtitle="تتبع الديون المتأخرة والذمم المدينة للعملاء مقسمة حسب فترات التأخير." headerContent={headerContent}>
            
            <style>{`
                .btn-main-glass { padding: 14px; border-radius: 16px; border: 1px solid rgba(194, 155, 98, 0.3); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 10px rgba(44, 26, 18, 0.05); }
                .btn-main-glass.green { background: #4E734F; color: white; border-color: #4E734F; }
                .btn-main-glass.disabled { background: rgba(255,255,255,0.5); color: #94a3b8; cursor: not-allowed; border-color: white; box-shadow: none; }
                .btn-main-glass:not(.disabled):hover { transform: translateY(-3px); filter: brightness(1.1); box-shadow: 0 8px 15px rgba(78, 115, 79, 0.2); }

                .search-box { width: 100%; padding: 14px 20px; border-radius: 14px; background: white; border: 1.5px solid rgba(194, 155, 98, 0.25); color: #2C1A12; outline: none; transition: all 0.3s; font-weight: 800; font-family: inherit; }
                .search-box:focus { border-color: #C29B62; box-shadow: 0 0 0 3px rgba(194, 155, 98, 0.15); }

                .stat-card { flex: 1; min-width: 150px; background: linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%); border: 1px solid rgba(194, 155, 98, 0.3); padding: 20px; border-radius: 20px; text-align: center; box-shadow: 0 4px 15px rgba(44, 26, 18, 0.05); }
                .stat-card.danger { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); }
                
                .stat-title { font-size: 13px; font-weight: 900; margin-bottom: 8px; }
                .stat-value { font-size: 20px; font-weight: 900; color: #2C1A12; }
                .stat-value.danger { color: #ef4444; }

                .data-table-container { background: linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%); backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(194, 155, 98, 0.3); overflow: hidden; box-shadow: 0 4px 15px rgba(44, 26, 18, 0.05); }
                .data-table { width: 100%; border-collapse: collapse; text-align: right; color: #2C1A12; }
                .data-table th { padding: 20px; font-size: 14px; font-weight: 900; color: #2C1A12; border-bottom: 2px solid rgba(194, 155, 98, 0.25); background: rgba(255, 253, 250, 0.9); }
                .data-table td { padding: 20px; font-weight: 800; border-bottom: 1px solid rgba(194, 155, 98, 0.1); }
                .data-table tr:hover { background: rgba(194, 155, 98, 0.05); }
                .data-table tr:nth-child(even) { background: rgba(255, 253, 250, 0.4); }

                @media (max-width: 768px) {
                    .data-table-container { border-radius: 16px !important; }
                    .data-table { min-width: 650px !important; }
                    .data-table th, .data-table td { padding: 8px 10px !important; font-size: 11px !important; }
                    .stat-card { padding: 12px 10px !important; min-width: 140px !important; }
                    .stat-value { font-size: 16px !important; }
                }
            `}</style>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: 'linear-gradient(135deg, rgba(255, 253, 250, 0.85) 0%, rgba(255, 253, 250, 0.5) 100%)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(194, 155, 98, 0.3)', boxShadow: '0 4px 15px rgba(44, 26, 18, 0.05)' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <div style={{ color: '#2C1A12', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>بحث باسم العميل 🔍</div>
                    <input 
                        type="text" 
                        placeholder="ابحث عن عميل..." 
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                        className="search-box"
                    />
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: '#122946', fontWeight: 900, fontSize: '20px' }}>جاري الحساب...</div>
            ) : (
                <>
                    {/* Global Totals Row */}
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', overflowX: 'auto', paddingBottom: '10px' }}>
                        <div className="stat-card danger" style={{ minWidth: '200px' }}>
                            <div className="stat-title" style={{ color: '#ef4444' }}>إجمالي الديون في السوق</div>
                            <div className="stat-value danger" style={{ fontSize: '24px' }}>{formatCurrency(totals.totalDue)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title" style={{ color: '#64748b' }}>حالي (لم يحن الاستحقاق)</div>
                            <div className="stat-value">{formatCurrency(totals.current)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title" style={{ color: '#d97706' }}>تأخير 1 - 30 يوم</div>
                            <div className="stat-value">{formatCurrency(totals.days1_30)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title" style={{ color: '#ea580c' }}>تأخير 31 - 60 يوم</div>
                            <div className="stat-value">{formatCurrency(totals.days31_60)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-title" style={{ color: '#dc2626' }}>تأخير 61 - 90 يوم</div>
                            <div className="stat-value">{formatCurrency(totals.days61_90)}</div>
                        </div>
                        <div className="stat-card danger">
                            <div className="stat-title" style={{ color: '#991b1b' }}>تأخير أكثر من 90 يوم 🚨</div>
                            <div className="stat-value danger">{formatCurrency(totals.over90)}</div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="data-table-container">
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>العميل 👤</th>
                                        <th style={{ color: '#ef4444' }}>إجمالي المديونية 💵</th>
                                        <th style={{ color: '#64748b' }}>حالي (غير متأخر) 🟢</th>
                                        <th style={{ color: '#d97706' }}>1 - 30 يوم 🟡</th>
                                        <th style={{ color: '#ea580c' }}>31 - 60 يوم 🟠</th>
                                        <th style={{ color: '#dc2626' }}>61 - 90 يوم 🔴</th>
                                        <th style={{ color: '#991b1b' }}>أكثر من 90 يوم 🚨</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.length > 0 ? filteredClients.map((client, idx) => (
                                        <tr key={client.id || idx}>
                                            <td style={{ fontWeight: 900 }}>{client.name}</td>
                                            <td style={{ fontWeight: 900, color: '#ef4444', fontSize: '16px' }}>{formatCurrency(client.totalDue)}</td>
                                            <td style={{ color: '#64748b' }}>{client.current > 0 ? formatCurrency(client.current) : '-'}</td>
                                            <td style={{ color: '#d97706' }}>{client.days1_30 > 0 ? formatCurrency(client.days1_30) : '-'}</td>
                                            <td style={{ color: '#ea580c' }}>{client.days31_60 > 0 ? formatCurrency(client.days31_60) : '-'}</td>
                                            <td style={{ color: '#dc2626' }}>{client.days61_90 > 0 ? formatCurrency(client.days61_90) : '-'}</td>
                                            <td style={{ fontWeight: 900, color: '#991b1b' }}>{client.over90 > 0 ? formatCurrency(client.over90) : '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 900 }}>لا توجد بيانات مطابقة للبحث</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </MasterPage>
    );
}
