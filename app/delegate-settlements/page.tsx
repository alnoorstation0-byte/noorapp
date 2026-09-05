"use client";
import React from 'react';
import { THEME } from '@/lib/theme';
import { formatCurrency, formatDate } from '@/lib/helpers';
import { useDelegateSettlementsLogic } from './delegate_settlements_logic';

export default function DelegateSettlementsPage() {
    const {
        filteredSettlements,
        globalSearch,
        setGlobalSearch,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        totals,
        isLoading,
        exportToExcel
    } = useDelegateSettlementsLogic();

    return (
        <div style={{ padding: '30px', minHeight: '100vh', direction: 'rtl' }}>
            {/* Header */}
            <div className="aqua-glass-panel" style={{ 
                background: 'rgba(255, 255, 255, 0.4)', 
                backdropFilter: 'blur(30px)', 
                borderRadius: '40px', 
                padding: '35px', 
                marginBottom: '35px', 
                border: '1px solid rgba(255, 255, 255, 0.6)', 
                boxShadow: '-10px -10px 30px rgba(255,255,255,0.8), 10px 10px 30px rgba(28, 115, 171, 0.15), inset 0 2px 2px rgba(255,255,255,1)' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                    <div>
                        <h1 style={{ color: '#122946', margin: '0 0 10px 0', fontSize: '32px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ textShadow: '0 4px 10px rgba(28, 115, 171, 0.2)' }}>تسوية عهد المناديب</span>
                            <span style={{ fontSize: '28px', filter: 'drop-shadow(0 4px 8px rgba(28, 115, 171, 0.3))' }}>💧</span>
                        </h1>
                        <p style={{ color: '#1C73AB', margin: 0, fontSize: '15px', fontWeight: 700, letterSpacing: '0.5px' }}>
                            المطابقة اليومية للمبيعات والنقدية المسلمة لكل مندوب / رحلة، لمعرفة العهد المتبقية في ذمتهم.
                        </p>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <button onClick={exportToExcel} disabled={filteredSettlements.length === 0} style={{ 
                            background: filteredSettlements.length === 0 ? 'rgba(28, 115, 171, 0.1)' : '#1C73AB', 
                            color: filteredSettlements.length === 0 ? '#122946' : '#FFFFFF', 
                            border: '1px solid',
                            borderColor: filteredSettlements.length === 0 ? 'rgba(28, 115, 171, 0.1)' : 'rgba(255, 255, 255, 0.3)',
                            padding: '14px 30px', 
                            borderRadius: '50px', 
                            fontWeight: 900, 
                            cursor: filteredSettlements.length === 0 ? 'not-allowed' : 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px', 
                            boxShadow: filteredSettlements.length === 0 ? 'none' : '-5px -5px 15px rgba(255,255,255,0.8), 5px 5px 20px rgba(28, 115, 171, 0.3), inset 0 2px 2px rgba(255,255,255,0.4)', 
                            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' 
                        }} className="aqua-button">
                            <span>تصدير Excel</span>
                            <span style={{ fontSize: '18px', filter: 'brightness(10)' }}>📑</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '20px', marginTop: '35px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 250px', position: 'relative' }}>
                        <div style={{ color: '#1C73AB', fontSize: '13px', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>بحث باسم المندوب أو الرحلة</span>
                            <span>🔍</span>
                        </div>
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.6)', 
                            borderRadius: '50px', 
                            padding: '4px 10px',
                            border: '1px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: 'inset 4px 4px 10px rgba(28, 115, 171, 0.1), inset -4px -4px 10px rgba(255,255,255,1)'
                        }} className="aqua-input-wrapper">
                            <input 
                                type="text" 
                                placeholder="ابحث..." 
                                value={globalSearch}
                                onChange={(e) => setGlobalSearch(e.target.value)}
                                style={{ width: '100%', padding: '12px 15px', borderRadius: '50px', background: 'transparent', border: 'none', color: '#122946', outline: 'none', fontSize: '15px', fontWeight: 700 }}
                            />
                        </div>
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                        <div style={{ color: '#1C73AB', fontSize: '13px', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>من تاريخ</span>
                            <span>📅</span>
                        </div>
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.6)', 
                            borderRadius: '50px', 
                            padding: '4px 10px',
                            border: '1px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: 'inset 4px 4px 10px rgba(28, 115, 171, 0.1), inset -4px -4px 10px rgba(255,255,255,1)'
                        }} className="aqua-input-wrapper">
                            <input 
                                type="date" 
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                style={{ width: '100%', padding: '12px 15px', borderRadius: '50px', background: 'transparent', border: 'none', color: '#122946', outline: 'none', fontSize: '15px', fontWeight: 700 }}
                                className="date-input-aqua-light"
                            />
                        </div>
                    </div>
                    <div style={{ flex: '1 1 180px' }}>
                        <div style={{ color: '#1C73AB', fontSize: '13px', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>إلى تاريخ</span>
                            <span>📅</span>
                        </div>
                        <div style={{ 
                            background: 'rgba(255, 255, 255, 0.6)', 
                            borderRadius: '50px', 
                            padding: '4px 10px',
                            border: '1px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: 'inset 4px 4px 10px rgba(28, 115, 171, 0.1), inset -4px -4px 10px rgba(255,255,255,1)'
                        }} className="aqua-input-wrapper">
                            <input 
                                type="date" 
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                style={{ width: '100%', padding: '12px 15px', borderRadius: '50px', background: 'transparent', border: 'none', color: '#122946', outline: 'none', fontSize: '15px', fontWeight: 700 }}
                                className="date-input-aqua-light"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div style={{ padding: '50px', textAlign: 'center', color: 'white', fontWeight: 900, fontSize: '20px' }}>جاري مطابقة العهد...</div>
            ) : (
                <>
                    {/* Global KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', marginBottom: '40px' }}>
                        <div className="aqua-float-card" style={{ 
                            background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(30px)', 
                            border: '1px solid rgba(255, 255, 255, 0.7)', padding: '30px', borderRadius: '35px', 
                            textAlign: 'center', boxShadow: '-10px -10px 30px rgba(255,255,255,0.8), 10px 10px 30px rgba(28, 115, 171, 0.15), inset 0 2px 2px rgba(255,255,255,1)',
                            position: 'relative', overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#1C73AB' }}></div>
                            <div style={{ color: '#122946', fontSize: '16px', fontWeight: 900, marginBottom: '15px', letterSpacing: '0.5px' }}>إجمالي المبيعات 📦</div>
                            <div style={{ color: '#1C73AB', fontSize: '42px', fontWeight: 900, textShadow: '0 4px 15px rgba(28, 115, 171, 0.3)' }}>{formatCurrency(totals.totalSales)}</div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.6)', borderRadius: '25px', boxShadow: 'inset 2px 2px 10px rgba(28,115,171,0.1), inset -2px -2px 10px rgba(255,255,255,1)' }}>
                                <span style={{ color: '#122946', fontSize: '13px', fontWeight: 800 }}>كاش: <span style={{ color: '#F2C94C', marginLeft: '4px', textShadow: '0 2px 4px rgba(242,201,76,0.3)' }}>{formatCurrency(totals.cashSales)}</span></span>
                                <span style={{ width: '1px', background: 'rgba(28,115,171,0.2)' }}></span>
                                <span style={{ color: '#122946', fontSize: '13px', fontWeight: 800 }}>آجل: <span style={{ color: '#1C73AB', marginLeft: '4px' }}>{formatCurrency(totals.creditSales)}</span></span>
                            </div>
                        </div>
                        <div className="aqua-float-card" style={{ 
                            background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(30px)', 
                            border: '1px solid rgba(255, 255, 255, 0.7)', padding: '30px', borderRadius: '35px', 
                            textAlign: 'center', boxShadow: '-10px -10px 30px rgba(255,255,255,0.8), 10px 10px 30px rgba(28, 115, 171, 0.15), inset 0 2px 2px rgba(255,255,255,1)',
                            position: 'relative', overflow: 'hidden', animationDelay: '0.2s'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#2ECC71' }}></div>
                            <div style={{ color: '#122946', fontSize: '16px', fontWeight: 900, marginBottom: '15px', letterSpacing: '0.5px' }}>النقدية المستلمة (السدادات) 💵</div>
                            <div style={{ color: '#2ECC71', fontSize: '42px', fontWeight: 900, textShadow: '0 4px 15px rgba(46, 204, 113, 0.3)' }}>{formatCurrency(totals.totalCash)}</div>
                        </div>
                        <div className="aqua-float-card" style={{ 
                            background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(30px)', 
                            border: '1px solid rgba(255, 255, 255, 0.7)', padding: '30px', borderRadius: '35px', 
                            textAlign: 'center', boxShadow: '-10px -10px 30px rgba(255,255,255,0.8), 10px 10px 30px rgba(28, 115, 171, 0.15), inset 0 2px 2px rgba(255,255,255,1)',
                            position: 'relative', overflow: 'hidden', animationDelay: '0.4s'
                        }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '6px', background: '#F2C94C' }}></div>
                            <div style={{ color: '#122946', fontSize: '16px', fontWeight: 900, marginBottom: '15px', letterSpacing: '0.5px' }}>العهد المتبقية للشركة ⚠️</div>
                            <div style={{ color: '#F2C94C', fontSize: '42px', fontWeight: 900, textShadow: '0 4px 15px rgba(242, 201, 76, 0.4)' }}>{formatCurrency(totals.totalDifference)}</div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div style={{ 
                        background: 'rgba(255, 255, 255, 0.4)', 
                        backdropFilter: 'blur(30px)', 
                        borderRadius: '35px', 
                        border: '1px solid rgba(255, 255, 255, 0.6)', 
                        boxShadow: '-10px -10px 30px rgba(255,255,255,0.8), 10px 10px 30px rgba(28, 115, 171, 0.15)',
                        overflow: 'hidden' 
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', color: '#122946' }}>
                                <thead style={{ background: 'rgba(28, 115, 171, 0.05)', borderBottom: '1px solid rgba(28, 115, 171, 0.1)' }}>
                                    <tr>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#1C73AB', fontWeight: 900 }}>رقم الرحلة 🚚</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#1C73AB', fontWeight: 900 }}>تاريخ الرحلة 📅</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#1C73AB', fontWeight: 900 }}>اسم المندوب 👤</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#122946', fontWeight: 900 }}>إجمالي المبيعات 📦</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#122946', fontWeight: 900 }}>الآجل ⏳</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#F2C94C', fontWeight: 900 }}>المطالبة النقدية 💰</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#2ECC71', fontWeight: 900 }}>النقدية المُسلمة 💵</th>
                                        <th style={{ padding: '20px', fontSize: '14px', color: '#122946', fontWeight: 900 }}>الفرق (عهدة متبقية) ⚠️</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSettlements.length > 0 ? filteredSettlements.map((item, idx) => {
                                        const isSettled = item.difference <= 0;
                                        return (
                                            <tr key={item.id || idx} style={{ 
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.4)', 
                                                background: isSettled ? 'rgba(46, 204, 113, 0.05)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.2)' : 'transparent'), 
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(28, 115, 171, 0.08)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = isSettled ? 'rgba(46, 204, 113, 0.05)' : (idx % 2 === 0 ? 'rgba(255,255,255,0.2)' : 'transparent')}
                                            >
                                                <td style={{ padding: '20px', fontWeight: 800, color: '#1C73AB' }}>
                                                    <div style={{ background: 'rgba(255,255,255,0.6)', padding: '6px 12px', borderRadius: '8px', display: 'inline-block', boxShadow: 'inset 1px 1px 3px rgba(255,255,255,1)' }}>{item.operationNumber}</div>
                                                </td>
                                                <td style={{ padding: '20px', fontWeight: 800 }}>{formatDate(item.date)}</td>
                                                <td style={{ padding: '20px', fontWeight: 900 }}>{item.delegateName}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, color: '#1C73AB', fontSize: '16px' }}>{formatCurrency(item.totalSales)}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, fontSize: '16px' }}>{formatCurrency(item.creditSales)}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, color: '#F2C94C', fontSize: '16px', textShadow: '0 1px 2px rgba(242,201,76,0.3)' }}>{formatCurrency(item.cashSales)}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, color: '#2ECC71', fontSize: '16px' }}>{formatCurrency(item.totalCash)}</td>
                                                <td style={{ padding: '20px', fontWeight: 900, color: isSettled ? '#2ECC71' : '#F2C94C', fontSize: '18px' }}>
                                                    {formatCurrency(item.difference)}
                                                    {isSettled && <span style={{ marginLeft: '10px', fontSize: '14px', background: 'rgba(46, 204, 113, 0.2)', padding: '4px 8px', borderRadius: '20px', color: '#122946' }}>✅ مسددة</span>}
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr>
                                            <td colSpan={8} style={{ padding: '80px 20px', textAlign: 'center', color: '#1C73AB', fontWeight: 900, fontSize: '18px' }}>
                                                <div style={{ fontSize: '48px', marginBottom: '15px', opacity: 0.8, filter: 'drop-shadow(0 4px 10px rgba(28, 115, 171, 0.2))' }}>💧</div>
                                                لا توجد رحلات مطابقة للبحث
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
