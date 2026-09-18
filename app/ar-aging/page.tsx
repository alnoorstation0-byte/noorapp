"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import { useArAgingLogic } from './ar_aging_logic';
import MasterPage from '@/components/MasterPage';
import LoadingScreen from '@/components/LoadingScreen';

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
                .btn-main-glass { padding: 12px 18px; border-radius: 14px; border: 1px solid rgba(0, 229, 255, 0.25); backdrop-filter: blur(15px); font-weight: 900; cursor: pointer; transition: 0.2s; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3); }
                .btn-main-glass.green { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: #0B0E14; border-color: rgba(16, 185, 129, 0.5); }
                .btn-main-glass.disabled { background: rgba(255,255,255,0.05); color: #64748B; cursor: not-allowed; border-color: rgba(255,255,255,0.1); box-shadow: none; }
                .btn-main-glass:not(.disabled):hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); }

                .search-box { width: 100%; padding: 14px 20px; border-radius: 14px; background: rgba(11, 14, 20, 0.8); border: 1.5px solid rgba(0, 229, 255, 0.25); color: #F8FAFC; outline: none; transition: all 0.3s; font-weight: 800; font-family: inherit; }
                .search-box:focus { border-color: #00E5FF; box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.2); }
                .search-box::placeholder { color: #64748B; }

                .stat-card { flex: 1; min-width: 150px; background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%); border: 1px solid rgba(0, 229, 255, 0.2); padding: 20px; border-radius: 20px; text-align: center; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); }
                .stat-card.danger { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); }
                
                .stat-title { font-size: 13px; font-weight: 900; margin-bottom: 8px; }
                .stat-value { font-size: 20px; font-weight: 900; color: #F8FAFC; }
                .stat-value.danger { color: #EF4444; }

                .data-table-container { background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%); backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(0, 229, 255, 0.2); overflow: hidden; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); }
                .data-table { width: 100%; border-collapse: collapse; text-align: right; color: #F8FAFC; }
                .data-table th { padding: 18px 20px; font-size: 13px; font-weight: 900; color: #94A3B8; border-bottom: 2px solid rgba(0, 229, 255, 0.2); background: rgba(11, 14, 20, 0.85); }
                .data-table td { padding: 18px 20px; font-weight: 800; border-bottom: 1px solid rgba(255, 255, 255, 0.06); color: #F8FAFC; }
                .data-table tr:hover { background: rgba(0, 229, 255, 0.04); }
                .data-table tr:nth-child(even) { background: rgba(255, 255, 255, 0.02); }

                @media (max-width: 768px) {
                    .data-table-container { border-radius: 16px !important; }
                    .data-table { min-width: 650px !important; }
                    .data-table th, .data-table td { padding: 10px 12px !important; font-size: 12px !important; }
                    .stat-card { padding: 12px 10px !important; min-width: 140px !important; }
                    .stat-value { font-size: 16px !important; }
                }

                .daylight-theme .ar-aging-filters {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .ar-filter-label {
                    color: #2C1A12 !important;
                }
                .daylight-theme .search-box {
                    background: #FFFFFF !important;
                    border-color: rgba(194, 155, 98, 0.35) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .stat-card {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 4px 20px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .stat-title {
                    color: rgba(44, 26, 18, 0.7) !important;
                }
                .daylight-theme .stat-value {
                    color: #2C1A12 !important;
                }
                .daylight-theme .data-table-container {
                    background: linear-gradient(135deg, rgba(255, 253, 250, 0.95) 0%, rgba(250, 246, 240, 0.90) 100%) !important;
                    border-color: rgba(194, 155, 98, 0.3) !important;
                    box-shadow: 0 8px 30px rgba(44, 26, 18, 0.08) !important;
                }
                .daylight-theme .data-table {
                    color: #2C1A12 !important;
                }
                .daylight-theme .data-table th {
                    background: rgba(194, 155, 98, 0.12) !important;
                    color: #2C1A12 !important;
                    border-bottom: 2px solid rgba(194, 155, 98, 0.25) !important;
                }
                .daylight-theme .data-table td {
                    border-bottom: 1px solid rgba(194, 155, 98, 0.15) !important;
                    color: #2C1A12 !important;
                }
                .daylight-theme .data-table tr:hover {
                    background: rgba(194, 155, 98, 0.06) !important;
                }
                .daylight-theme .data-table tr:nth-child(even) {
                    background: rgba(194, 155, 98, 0.03) !important;
                }
            `}</style>

            {/* Filters */}
            <div className="ar-aging-filters" style={{ display: 'flex', gap: '15px', marginBottom: '25px', background: 'linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(15, 20, 30, 0.85) 100%)', padding: '20px', borderRadius: '24px', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)' }}>
                <div style={{ flex: '1 1 300px' }}>
                    <div className="ar-filter-label" style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 900, marginBottom: '8px' }}>بحث باسم العميل 🔍</div>
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
                <LoadingScreen message="جاري تحضير واحتساب أعمار الديون..." fullScreen={false} />
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
