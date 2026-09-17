"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { THEME } from '@/lib/theme';
import { useLanguage } from '@/lib/LanguageContext';

type AuditIssue = {
    id: string;
    titleAr: string;
    titleEn: string;
    descriptionAr: string;
    descriptionEn: string;
    count: number;
    severity: 'high' | 'medium' | 'low';
    data?: any[];
};

export default function SystemHealthRadar() {
    const { language } = useLanguage();
    const isEn = language === 'en';
    const [loading, setLoading] = useState(true);
    const [issues, setIssues] = useState<AuditIssue[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        runAuditScan();
    }, []);

    const runAuditScan = async () => {
        setLoading(true);
        const detectedIssues: AuditIssue[] = [];

        try {
            // 1. Negative Inventory
            const { data: rawNegInv } = await supabase
                .from('warehouse_inventory')
                .select('id, quantity, warehouse_id, item_id')
                .lt('quantity', 0);
            
            let negInv: any[] = [];
            if (rawNegInv && rawNegInv.length > 0) {
                const [whRes, itemsRes] = await Promise.all([
                    supabase.from('warehouses').select('id, name'),
                    supabase.from('inventory_items').select('id, name')
                ]);
                const whMap = new Map((whRes.data || []).map((w: any) => [w.id, w]));
                const itMap = new Map((itemsRes.data || []).map((i: any) => [i.id, i]));
                negInv = rawNegInv.map((n: any) => ({
                    ...n,
                    warehouse: whMap.get(n.warehouse_id) || { name: 'مستودع' },
                    item: itMap.get(n.item_id) || { name: 'صنف' }
                }));
            }
            
            if (negInv && negInv.length > 0) {
                detectedIssues.push({
                    id: 'neg_inv',
                    titleAr: 'أرصدة المخزون بالسالب',
                    titleEn: 'Negative Inventory Balances',
                    descriptionAr: 'صرف أو بيع بضاعة غير متوفرة دفترياً بسبب تأخر إثبات فواتير المشتريات.',
                    descriptionEn: 'Issuing or selling goods not available in books due to delayed purchase invoices.',
                    count: negInv.length,
                    severity: 'high',
                    data: negInv
                });
            }

            // 2. Suspended Transfers
            const { data: suspTransfers } = await supabase
                .from('inventory_transactions')
                .select('id, transaction_number, transaction_date')
                .eq('type', 'transfer_out')
                .eq('status', 'pending');

            if (suspTransfers && suspTransfers.length > 0) {
                detectedIssues.push({
                    id: 'susp_transfers',
                    titleAr: 'التحويلات المخزنية المعلقة',
                    titleEn: 'Suspended Inventory Transfers',
                    descriptionAr: 'بضاعة خرجت من المستودع الرئيسي ولم يتم تأكيد استلامها.',
                    descriptionEn: 'Goods issued from main warehouse but not confirmed received.',
                    count: suspTransfers.length,
                    severity: 'medium',
                    data: suspTransfers
                });
            }

            // 3. Suspended Shifts
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { data: suspShifts } = await supabase
                .from('pos_shifts')
                .select('id, opened_at, expected_cash')
                .eq('status', 'open')
                .lt('opened_at', yesterday);

            if (suspShifts && suspShifts.length > 0) {
                detectedIssues.push({
                    id: 'susp_shifts',
                    titleAr: 'الورديات المعلقة (غير المغلقة)',
                    titleEn: 'Suspended POS Shifts',
                    descriptionAr: 'مبيعات تمت وانتهى يومها ولم يتم إغلاق الوردية أو ترحيل قيودها.',
                    descriptionEn: 'Sales completed but shift not closed after 24 hours.',
                    count: suspShifts.length,
                    severity: 'high',
                    data: suspShifts
                });
            }

            // 4. Cash Shortages
            const { data: shortages } = await supabase
                .from('pos_shifts')
                .select('id, shortage_overage, closed_at')
                .lt('shortage_overage', 0);

            if (shortages && shortages.length > 0) {
                detectedIssues.push({
                    id: 'shortages',
                    titleAr: 'عجز الصناديق',
                    titleEn: 'Cash Register Shortages',
                    descriptionAr: 'فروقات سالبة بين المبيعات المسجلة بالنظام والنقدية الموردة.',
                    descriptionEn: 'Negative differences between system sales and actual cash.',
                    count: shortages.length,
                    severity: 'high',
                    data: shortages
                });
            }

            // 5. Unallocated Payments
            const { data: unallocated } = await supabase
                .from('receipt_vouchers')
                .select('id, receipt_number, amount, date')
                .is('invoice_id', null)
                .in('status', ['معتمد', 'posted', 'approved']);

            if (unallocated && unallocated.length > 0) {
                detectedIssues.push({
                    id: 'unallocated',
                    titleAr: 'الدفعات غير المسواة (Unallocated)',
                    titleEn: 'Unallocated Payments',
                    descriptionAr: 'مبالغ نقدية حصلها المناديب دون ربطها أو إقفالها مع الفواتير المستحقة.',
                    descriptionEn: 'Cash amounts collected without linking to due invoices.',
                    count: unallocated.length,
                    severity: 'medium',
                    data: unallocated
                });
            }

            // 6. Ghost Invoices
            const { data: ghosts } = await supabase
                .from('invoices')
                .select('id, invoice_number, total_amount')
                .eq('total_amount', 0);

            if (ghosts && ghosts.length > 0) {
                detectedIssues.push({
                    id: 'ghost_invoices',
                    titleAr: 'فواتير شبحية (صفرية)',
                    titleEn: 'Ghost Invoices (Zero Amount)',
                    descriptionAr: 'سجلات فواتير فارغة تماماً أو قيمتها صفر ولا يوجد لها تأثير مالي.',
                    descriptionEn: 'Empty invoice records or zero value with no financial impact.',
                    count: ghosts.length,
                    severity: 'low',
                    data: ghosts
                });
            }

            // 7. Zero Journals
            const { data: zeroJournals } = await supabase
                .from('journal_lines')
                .select('id, debit, credit')
                .eq('debit', 0)
                .eq('credit', 0);

            if (zeroJournals && zeroJournals.length > 0) {
                detectedIssues.push({
                    id: 'zero_journals',
                    titleAr: 'قيود صفرية وعمياء',
                    titleEn: 'Zero & Blind Entries',
                    descriptionAr: 'سجلات قيود يومية قيمتها صفر ولا يوجد لها أي تأثير مالي.',
                    descriptionEn: 'Journal entry records with zero value and no financial impact.',
                    count: zeroJournals.length,
                    severity: 'low',
                    data: zeroJournals
                });
            }

            // 8. Orphaned Records
            const { data: orphans } = await supabase
                .from('journal_lines')
                .select('id')
                .is('header_id', null);

            if (orphans && orphans.length > 0) {
                detectedIssues.push({
                    id: 'orphaned_lines',
                    titleAr: 'سجلات يتيمة (Orphaned)',
                    titleEn: 'Orphaned Records',
                    descriptionAr: 'سجلات معطوبة لعدم ارتباطها بمستند أساسي (مثل قيد بدون ترويسة).',
                    descriptionEn: 'Corrupted records missing their parent document.',
                    count: orphans.length,
                    severity: 'high',
                    data: orphans
                });
            }

        } catch (error) {
            console.error("Audit Scan Error:", error);
        }

        setIssues(detectedIssues);
        setLoading(false);
    };

    const deleteZeroJournals = async () => {
        const { error } = await supabase
            .from('journal_lines')
            .delete()
            .eq('debit', 0)
            .eq('credit', 0);
        if (!error) {
            runAuditScan();
        }
    };

    const getSeverityColor = (sev: string) => {
        if (sev === 'high') return '#ef4444';
        if (sev === 'medium') return '#f59e0b';
        return '#00E5FF';
    };

    return (
        <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, color: THEME.primary, fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔍</span>
                        {isEn ? 'System Diagnostic & Audit Radar' : 'رادار التشخيص والتدقيق المالي'}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
                        {isEn ? 'Detects accounting anomalies, inventory mismatches, and ghost records' : 'يكشف الشذوذ المحاسبي، اختلالات المخزون، والسجلات الشبحية'}
                    </p>
                </div>
                <button
                    onClick={runAuditScan}
                    style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.9)',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        color: THEME.primary,
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                    }}
                >
                    {loading ? '⏳...' : '🔄'}
                    {isEn ? (loading ? 'Scanning...' : 'Rescan System') : (loading ? 'جاري الفحص...' : 'إعادة الفحص')}
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: THEME.primary, fontWeight: 'bold' }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px', animation: 'spin 2s linear infinite' }}>?3</div>
                    {isEn ? 'Running Deep Diagnostic Scan...' : 'جاري تشغيل الفحص العميق للنظام...'}
                </div>
            ) : issues.length === 0 ? (
                <div style={{
                    background: 'rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '20px',
                    padding: '60px 20px',
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.8)'
                }}>
                    <div style={{ fontSize: '50px', marginBottom: '16px' }}>🎉</div>
                    <h3 style={{ margin: '0 0 8px', color: '#16a34a' }}>
                        {isEn ? 'System is 100% Healthy!' : 'النظام سليم 100%!'}
                    </h3>
                    <p style={{ margin: 0, color: '#666' }}>
                        {isEn ? 'No anomalies, ghost records, or mismatches detected.' : 'لم يتم اكتشاف أي شذوذ، سجلات شبحية، أو أخطاء مخزنية.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '16px' }}>
                    {issues.map(issue => (
                        <div key={issue.id} style={{
                            background: 'rgba(255, 255, 255, 0.7)',
                            backdropFilter: 'blur(20px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.9)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                            overflow: 'hidden'
                        }}>
                            <div 
                                onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                                style={{
                                    padding: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    borderLeft: `6px solid ${getSeverityColor(issue.severity)}`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: `${getSeverityColor(issue.severity)}20`,
                                        color: getSeverityColor(issue.severity),
                                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                                        fontWeight: 'bold', fontSize: '18px'
                                    }}>
                                        {issue.count}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px', fontSize: '16px', color: '#333' }}>
                                            {isEn ? issue.titleEn : issue.titleAr}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                                            {isEn ? issue.descriptionEn : issue.descriptionAr}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ color: THEME.primary, fontWeight: 'bold' }}>
                                    {expandedId === issue.id ? '➖' : '➕'}
                                </div>
                            </div>

                            {expandedId === issue.id && (
                                <div style={{ padding: '0 20px 20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.5)', padding: '12px', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                        <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap', direction: 'ltr', textAlign: 'left' }}>
                                            {JSON.stringify(issue.data, null, 2)}
                                        </pre>
                                    </div>
                                    
                                    {issue.id === 'zero_journals' && (
                                        <button 
                                            onClick={deleteZeroJournals}
                                            style={{
                                                marginTop: '12px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {isEn ? '🗑️ Clean Zero Entries' : '🗑️ تطهير السجلات الصفرية'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
