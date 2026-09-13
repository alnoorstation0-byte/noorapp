"use client";
import React from 'react';
import { ServiceOperation } from './service_operations_logic';
import { formatCurrency, formatDate } from '@/lib/helpers';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    operation: ServiceOperation | null;
}

export default function ServiceOperationPrintModal({
    isOpen,
    onClose,
    operation
}: PrintModalProps) {
    if (!isOpen || !operation) return null;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(18, 41, 70, 0.75)',
                backdropFilter: 'blur(16px)',
                zIndex: 999999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px',
                overflowY: 'auto'
            }}
            onClick={onClose}
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: '#ffffff',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '800px',
                    direction: 'rtl',
                    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.35)',
                    padding: '36px',
                    position: 'relative',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    color: '#1e293b'
                }}
                className="printable-service-voucher"
            >
                <style>{`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .printable-service-voucher, .printable-service-voucher * {
                            visibility: visible;
                        }
                        .printable-service-voucher {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100% !important;
                            max-width: 100% !important;
                            box-shadow: none !important;
                            padding: 20px !important;
                            border: none !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}</style>

                {/* Top Action Bar (hidden on print) */}
                <div className="no-print" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            type="button"
                            onClick={handlePrint}
                            style={{
                                background: 'linear-gradient(135deg, #1C73AB 0%, #2891C8 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '10px 22px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 12px rgba(28, 115, 171, 0.25)'
                            }}
                        >
                            <span>🖨️</span>
                            <span>طباعة إشعار العملية</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: '#64748b'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Header for print / voucher */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '2px solid #1C73AB',
                    paddingBottom: '20px',
                    marginBottom: '24px'
                }}>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#1C73AB' }}>
                            صيدلية تاج المودة البيطرية
                        </h1>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 700 }}>
                            إدارة العمليات التشغيلية والإيرادات الخدمية
                        </p>
                    </div>

                    <div style={{ textAlign: 'left' }}>
                        <div style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: '12px',
                            padding: '8px 16px',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '11px', color: '#64748b', display: 'block', fontWeight: 700 }}>رقم العملية</span>
                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#1C73AB', fontFamily: 'monospace' }}>
                                #{operation.id.slice(0, 8).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Document Title Banner */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(28, 115, 171, 0.08) 0%, rgba(40, 145, 200, 0.12) 100%)',
                    border: '1px solid rgba(28, 115, 171, 0.2)',
                    borderRadius: '14px',
                    padding: '12px 20px',
                    textAlign: 'center',
                    marginBottom: '24px'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#122946' }}>
                        سند إثبات إيراد خدمة وتشغيل
                    </h2>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                        بتاريخ: {formatDate(operation.operation_date)}
                    </span>
                </div>

                {/* Info Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'block' }}>نوع العملية:</span>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#1C73AB' }}>{operation.operation_type}</span>
                    </div>

                    <div style={{
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'block' }}>العميل / المستفيد:</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                            {operation.client ? operation.client.name : 'عميل نقدي عام'}
                        </span>
                    </div>

                    <div style={{
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'block' }}>الموظف / المندوب المنفذ:</span>
                        <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                            {operation.employee ? operation.employee.name : 'تنفيذ عام للشركة'}
                        </span>
                    </div>

                    <div style={{
                        background: '#f8fafc',
                        padding: '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'block' }}>حالة القيد المحاسبي:</span>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>
                            مرحل آلياً إلى دفتر اليومية العامة ✅
                        </span>
                    </div>
                </div>

                {/* Description Box */}
                <div style={{
                    background: '#f1f5f9',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    marginBottom: '24px',
                    borderRight: '4px solid #1C73AB'
                }}>
                    <span style={{ fontSize: '11px', color: '#475569', fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                        البيان وتفاصيل الخدمة:
                    </span>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#0f172a', lineHeight: 1.6 }}>
                        {operation.description}
                    </p>
                </div>

                {/* Financial Summary Table */}
                <div style={{ marginBottom: '30px' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'right',
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}>
                        <thead>
                            <tr style={{ background: '#1C73AB', color: '#ffffff' }}>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 800 }}>البند المالي</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 800 }}>النسبة</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 800, textAlign: 'left' }}>المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 800, color: '#1e293b' }}>
                                    إجمالي قيمة الخدمة المحصلة / المستحقة
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 700 }}>100%</td>
                                <td style={{ padding: '12px 16px', fontWeight: 900, color: '#1C73AB', textAlign: 'left', fontSize: '15px' }}>
                                    {formatCurrency(operation.total_amount)}
                                </td>
                            </tr>

                            {operation.commission_amount > 0 && (
                                <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
                                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#b45309' }}>
                                        عمولة الموظف المنفذ ({operation.employee?.name || 'الموظف'})
                                    </td>
                                    <td style={{ padding: '12px 16px', color: '#b45309', fontWeight: 700 }}>
                                        {operation.commission_percentage}%
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 900, color: '#b45309', textAlign: 'left', fontSize: '15px' }}>
                                        {formatCurrency(operation.commission_amount)}
                                    </td>
                                </tr>
                            )}

                            <tr style={{ background: '#f0fdf4' }}>
                                <td style={{ padding: '14px 16px', fontWeight: 900, color: '#166534', fontSize: '15px' }}>
                                    صافي أرباح المؤسسة
                                </td>
                                <td style={{ padding: '14px 16px', color: '#166534', fontWeight: 800 }}>
                                    {operation.total_amount > 0 ? `${((operation.net_profit / operation.total_amount) * 100).toFixed(0)}%` : '-'}
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: 900, color: '#15803d', textAlign: 'left', fontSize: '17px' }}>
                                    {formatCurrency(operation.net_profit)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Signatures Footer */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '20px',
                    textAlign: 'center',
                    marginTop: '40px',
                    paddingTop: '20px',
                    borderTop: '1px dashed #cbd5e1'
                }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>المنفذ / الموظف</span>
                        <div style={{ marginTop: '40px', borderTop: '1px solid #94a3b8', width: '80%', margin: '40px auto 0' }}></div>
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>المحاسب المسؤول</span>
                        <div style={{ marginTop: '40px', borderTop: '1px solid #94a3b8', width: '80%', margin: '40px auto 0' }}></div>
                    </div>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>اعتماد الإدارة</span>
                        <div style={{ marginTop: '40px', borderTop: '1px solid #94a3b8', width: '80%', margin: '40px auto 0' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
