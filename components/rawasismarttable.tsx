"use client";
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-hot-toast';
import { useLanguage } from '@/lib/LanguageContext';

const COLUMN_TRANSLATIONS: Record<string, string> = {
    "كود": "Code",
    "كود الشريك": "Partner Code",
    "اسم الشريك": "Partner Name",
    "اسم العميل": "Client Name",
    "الاسم": "Name",
    "اسم الصنف": "Item Name",
    "الصنف": "Item",
    "النوع": "Type",
    "النوع / الفئة": "Type / Category",
    "رقم الهاتف": "Phone",
    "الهاتف": "Phone",
    "الرقم الضريبي": "VAT Number",
    "العنوان": "Address",
    "الرصيد": "Balance",
    "الرصيد الحالي": "Current Balance",
    "الرصيد النهائي": "Final Balance",
    "الحالة": "Status",
    "الإجراءات": "Actions",
    "إجراءات": "Actions",
    "التاريخ": "Date",
    "تاريخ الفاتورة": "Invoice Date",
    "تاريخ السند": "Voucher Date",
    "رقم الفاتورة": "Invoice #",
    "رقم السند": "Voucher #",
    "المبلغ": "Amount",
    "المبلغ الإجمالي": "Total Amount",
    "الإجمالي": "Total",
    "المجموع": "Total",
    "الضريبة": "VAT",
    "الصافي": "Net Amount",
    "المدفوع": "Paid",
    "المتبقي": "Remaining",
    "طريقة الدفع": "Payment Method",
    "البيان": "Description",
    "الوصف": "Description",
    "ملاحظات": "Notes",
    "المستودع": "Warehouse",
    "الكمية": "Quantity",
    "الوحدة": "Unit",
    "سعر التكلفة": "Cost Price",
    "سعر البيع": "Sale Price",
    "السعر": "Price",
    "الباركود": "Barcode",
    "المندوب": "Delegate",
    "العميل": "Client",
    "المورد": "Supplier",
    "المنفذ": "Outlet",
    "الكاشير": "Cashier",
    "الوردية": "Shift",
    "الفرع": "Branch",
    "المستخدم": "User",
    "أنشئ بواسطة": "Created By",
    "وقت الإنشاء": "Created At"
};

const THEME = {
    coffeeDark: '#2C1A12', goldAccent: '#C29B62', sandLight: '#FDFBF7', sandDark: '#E6D5C3', success: '#4E734F', danger: '#be123c', border: 'rgba(194, 155, 98, 0.2)'
};

// 🟢 التعديل الأهم: تغيير النوع ليقبل React.ReactNode (مثل الـ Checkbox) بالإضافة للنصوص
interface Column {
    header?: React.ReactNode | string; 
    label?: React.ReactNode | string;
    key?: string;
    accessor?: string;
    type?: string;
    width?: string | number;
    minWidth?: string | number;
    render?: (row: any) => React.ReactNode;
    // 🚀 الإضافة الجديدة: دالة مخصصة لاستخراج البيانات النظيفة للإكسيل
    exportValue?: (row: any) => string | number; 
    // 🚀 الإضافة الجديدة: التحكم بإخفاء أعمدة معينة من الإكسيل
    excludeFromExport?: boolean;
}

interface RawasiSmartTableProps {
    title?: string;
    data: any[];
    columns: Column[];
    fileName?: string;
    selectable?: boolean;
    selectedIds?: any[];
    onSelectionChange?: (ids: any[]) => void;
    onRowClick?: (row: any) => void;
    emptyMessage?: string;
    
    // 🚀 خصائص الـ Pagination المدمجة
    enablePagination?: boolean;
    currentPage?: number;
    totalItems?: number;
    rowsPerPage?: number;
    onPageChange?: (page: number) => void;
    onRowsChange?: (rows: number) => void;
    
    // 🚀 خصائص إضافية مفقودة
    isLoading?: boolean;
    enableExport?: boolean;
    onRefresh?: (options?: any) => Promise<any> | void;
    onSearch?: (term: string) => void;
    searchPlaceholder?: string;

    // 🔄 خصائص التوافق السابقة (Backward Compatibility)
    pageSize?: number;
    pagination?: boolean;
    itemsPerPage?: number;
    keyExtractor?: (row: any) => any;
    rowKey?: string;
    watchDeps?: any[];
}

export default function RawasiSmartTable({ 
    title, data, columns, fileName = 'Rawasi_Report', 
    selectable, selectedIds = [], onSelectionChange, onRowClick, emptyMessage,
    
    enablePagination = true,
    currentPage: externalPage,
    totalItems: externalTotal,
    rowsPerPage: externalRowsPerPage,
    onPageChange,
    onRowsChange,
    pageSize,
    pagination,
    itemsPerPage,
    keyExtractor,
    rowKey
}: RawasiSmartTableProps) {
    const { language, isRtl } = useLanguage();

    const translateHeader = (headerNode: React.ReactNode): React.ReactNode => {
        if (language !== 'en') return headerNode;
        if (typeof headerNode === 'string') {
            const trimmed = headerNode.trim();
            return COLUMN_TRANSLATIONS[trimmed] || trimmed;
        }
        return headerNode;
    };

    const effectivePagination = pagination !== undefined ? pagination : enablePagination;
    const effectiveRowsPerPage = externalRowsPerPage || itemsPerPage || pageSize;
    
    // 🧮 Internal state for pagination if not provided by parent
    const [internalPage, setInternalPage] = useState(1);
    const [internalRowsPerPage, setInternalRowsPerPage] = useState(50);

    const handlePageChange = (p: number) => {
        setInternalPage(p);
        if (onPageChange) onPageChange(p);
    };

    const handleRowsChange = (r: number) => {
        setInternalRowsPerPage(r);
        setInternalPage(1);
        if (onRowsChange) onRowsChange(r);
    };

    // 🚀 محرك الفرز (Sorting Engine)
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (accessorOrKey: string | undefined) => {
        if (!accessorOrKey) return;
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === accessorOrKey && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key: accessorOrKey, direction });
    };

    // 🚀 معالجة البيانات للفرز (يتم على جميع البيانات بالخلفية ليكون سريعاً ولا يعطل المتصفح)
    const sortedData = useMemo(() => {
        if (!data || !Array.isArray(data)) return [];
        let sortableItems = [...data];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (aValue == null) aValue = '';
                if (bValue == null) bValue = '';

                // معالجة الأرقام والنصوص بشكل صحيح
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
                }

                if (aValue.toString().toLowerCase() < bValue.toString().toLowerCase()) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue.toString().toLowerCase() > bValue.toString().toLowerCase()) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [data, sortConfig]);

    // 🧮 حساب عدد الصفحات الديناميكي
    const activePage = externalPage !== undefined ? externalPage : internalPage;
    const activeRows = effectiveRowsPerPage !== undefined ? effectiveRowsPerPage : internalRowsPerPage;
    const activeTotal = externalTotal || sortedData.length;
    const totalPages = Math.ceil(activeTotal / activeRows) || 1;

    // 🚀 محرك القص (Pagination Engine): لضمان عدم تهنيج المتصفح عند إرسال آلاف السجلات
    const paginatedData = useMemo(() => {
        if (!effectivePagination) return sortedData;
        const startIndex = (activePage - 1) * activeRows;
        return sortedData.slice(startIndex, startIndex + activeRows);
    }, [sortedData, effectivePagination, activePage, activeRows]);

    const exportToExcel = () => {
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        const toastId = toast.loading('جاري تحضير ملف Excel... ⏳');
        try {
            // يتم التصدير من `sortedData` لضمان تصدير جميع البيانات (وليس فقط المقطوعة) وبنفس ترتيب الفرز
            const exportData = sortedData.map(row => {
                const newRow: any = {};
                columns.forEach(col => { 
                    // تخطي أعمدة الإجراءات والتحديد من الإكسيل
                    if (col.excludeFromExport || col.accessor === 'actions' || col.key === 'actions') return;

                    // إذا كان الهيدر عبارة عن كود React، لا تقم بتصديره كاسم عمود (استخدم مفتاح بديل)
                    const headerName = typeof col.label === 'string' ? col.label : (typeof col.header === 'string' ? col.header : col.accessor || 'Column');
                    const keyName = col.key || col.accessor || '';
                    
                    // استخدام دالة exportValue إذا وجدت، وإلا استخدام القيمة المباشرة
                    let val = col.exportValue ? col.exportValue(row) : (keyName ? row[keyName] : undefined);
                    
                    newRow[headerName] = val !== undefined && val !== null ? val : '---'; 
                });
                return newRow;
            });
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
            XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString('en-GB')}.xlsx`);
            toast.success('تم تصدير ملف Excel بنجاح ✅', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء التصدير ❌', { id: toastId });
        }
    };

    const exportToPDF = () => {
        if (!data || data.length === 0) return toast.error('عفواً، لا توجد بيانات للتصدير ❌');
        const toastId = toast.loading('جاري تحضير ملف PDF... ⏳');
        try {
            // استخدام نافذة الطباعة كحل أمثل للغة العربية
            window.print();
            toast.success('تم فتح نافذة الطباعة بنجاح ✅', { id: toastId });
        } catch (error) {
            toast.error('حدث خطأ أثناء التصدير ❌', { id: toastId });
        }
    };

    const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
    const itemVariants = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

    return (
        <div className="rawasi-table-wrapper" style={{ 
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(15px)', 
            borderRadius: '20px', 
            padding: '20px', 
            border: `1px solid rgba(255,255,255,0.5)`, 
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)' 
        }}>
            
            {/* 🛠️ شريط أدوات الجدول (أزرار التصدير والعنوان) */}
            <div className="table-toolbar hide-on-print" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, fontSize: '12px', transition: '0.2s', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)' }}>📥 Excel</button>
                    <button onClick={exportToPDF} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#ef4444', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, fontSize: '12px', transition: '0.2s', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' }}>📄 PDF</button>
                </div>
            </div>

            <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: isRtl ? 'right' : 'left' }} className="rawasi-printable-table">
                    <thead style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <tr>
                            {selectable && (
                                <th className="hide-on-print" style={{ padding: '15px', width: '40px', textAlign: isRtl ? 'right' : 'left' }}>
                                    <input 
                                        type="checkbox" 
                                        onChange={(e) => {
                                            // 🚀 تم تغييرها للتعامل مع البيانات المعروضة في الصفحة فقط عند التحديد السريع
                                            if (e.target.checked) onSelectionChange?.(paginatedData.map(i => i.id));
                                            else onSelectionChange?.([]);
                                        }}
                                        checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                                        style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                </th>
                            )}
                            {columns.map((col, idx) => {
                                const sortKey = col.key || col.accessor;
                                const isSorted = sortConfig?.key === sortKey;
                                const isActions = sortKey === 'actions' || col.type === 'actions';
                                
                                return (
                                    <th 
                                        key={idx} 
                                        onClick={() => handleSort(sortKey)}
                                        style={{ 
                                            padding: isActions ? '15px 8px' : '15px', 
                                            textAlign: isRtl ? 'right' : 'left', 
                                            color: THEME.coffeeDark, 
                                            fontWeight: 900, 
                                            fontSize: '13px', 
                                            borderBottom: `2px solid ${THEME.goldAccent}40`,
                                            cursor: sortKey ? 'pointer' : 'default',
                                            userSelect: 'none',
                                            whiteSpace: 'nowrap',
                                            width: col.width || (isActions ? (col.minWidth || '140px') : undefined),
                                            minWidth: col.minWidth || (isActions ? '130px' : undefined)
                                        }}
                                        title={sortKey ? `فرز حسب ${typeof col.label === 'string' ? col.label : (typeof col.header === 'string' ? col.header : '')}` : ''}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            {/* 🟢 الآن يمكن رسم الـ Checkbox هنا بدون أخطاء */}
                                            {translateHeader(col.label || col.header)}
                                            
                                            {/* مؤشر الفرز */}
                                            {sortKey && (
                                                <span style={{ fontSize: '10px', color: isSorted ? THEME.goldAccent : 'transparent' }}>
                                                    {sortConfig?.direction === 'asc' ? '🔼' : '🔽'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="show">
                        {paginatedData.length === 0 ? (
                            <tr><td colSpan={columns.length + (selectable ? 1 : 0)} style={{ padding: '40px', textAlign: 'center', color: '#475569', fontWeight: 900 }}>{emptyMessage || (language === 'en' ? 'No data available' : 'لا توجد بيانات')}</td></tr>
                        ) : (
                            // 🚀 رسم البيانات المقطوعة فقط لمنع تهنيج المتصفح
                            paginatedData.map((row, rowIndex) => (
                                <motion.tr 
                                    key={row._unique_key || row.id || rowIndex} 
                                    variants={itemVariants} 
                                    onClick={() => onRowClick?.(row)} 
                                    style={{ 
                                        borderBottom: '1px solid rgba(0,0,0,0.03)', 
                                        cursor: onRowClick ? 'pointer' : 'default',
                                        background: rowIndex % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.4)',
                                        transition: '0.2s'
                                    }}
                                    className="table-row-hover"
                                >
                                    {selectable && (
                                        <td className="hide-on-print" style={{ padding: '12px 15px' }} onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(row.id)}
                                                onChange={() => {
                                                    const newSelection = selectedIds.includes(row.id) 
                                                        ? selectedIds.filter(id => id !== row.id) 
                                                        : [...selectedIds, row.id];
                                                    onSelectionChange?.(newSelection);
                                                }}
                                                style={{ accentColor: THEME.goldAccent, width: '16px', height: '16px', cursor: 'pointer' }}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, colIndex) => {
                                        const isActions = col.key === 'actions' || col.accessor === 'actions' || col.type === 'actions';
                                        return (
                                            <td 
                                                key={colIndex} 
                                                style={{ 
                                                    padding: isActions ? '10px 8px' : '12px 15px', 
                                                    color: '#334155', 
                                                    fontSize: '13px',
                                                    textAlign: isRtl ? 'right' : 'left',
                                                    whiteSpace: isActions ? 'nowrap' : undefined,
                                                    width: col.width || (isActions ? (col.minWidth || '140px') : undefined),
                                                    minWidth: col.minWidth || (isActions ? '130px' : undefined)
                                                }}
                                            >
                                                {col.render ? col.render(row) : (row[col.key || col.accessor || ''] || '---')}
                                            </td>
                                        );
                                    })}
                                </motion.tr>
                            ))
                        )}
                    </motion.tbody>
                </table>
            </div>

            {enablePagination && activeTotal > 0 && (
                <div className="hide-on-print table-pagination-mobile" style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '15px 20px', marginTop: '15px', borderTop: '1px solid rgba(0,0,0,0.05)',
                    background: 'rgba(255,255,255,0.4)', borderRadius: '12px', flexWrap: 'wrap', gap: '15px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 900, color: '#64748b' }}>{language === 'en' ? 'Show:' : 'عرض:'}</span>
                        <select 
                            value={activeRows} 
                            onChange={(e) => handleRowsChange(Number(e.target.value))}
                            style={{ padding: '8px 15px', borderRadius: '12px', border: '1px solid rgba(40, 145, 200, 0.2)', outline: 'none', fontWeight: 800, cursor: 'pointer', background: 'white', color: '#0f172a' }}
                        >
                            <option value="50">{language === 'en' ? '50 records' : '50 سجل'}</option>
                            <option value="100">{language === 'en' ? '100 records' : '100 سجل'}</option>
                            <option value="500">{language === 'en' ? '500 records' : '500 سجل'}</option>
                        </select>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                            {language === 'en' ? `of ${activeTotal} total` : `من إجمالي ${activeTotal}`}
                        </span>
                    </div>

                    <div className="pagination-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button 
                            disabled={activePage === 1} 
                            onClick={(e) => { e.stopPropagation(); handlePageChange(activePage - 1); }} 
                            style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(40, 145, 200, 0.2)', background: 'white', fontWeight: 900, cursor: activePage === 1 ? 'not-allowed' : 'pointer', opacity: activePage === 1 ? 0.5 : 1, color: '#0f172a', transition: '0.2s' }}
                        >
                            {language === 'en' ? 'Previous' : 'السابق'}
                        </button>
                        <div style={{ background: THEME.goldAccent, color: 'white', padding: '8px 20px', borderRadius: '12px', fontWeight: 900, fontSize: '13px', boxShadow: `0 4px 10px ${THEME.goldAccent}40`, textAlign: 'center' }}>
                            {language === 'en' ? `Page ${activePage} of ${totalPages}` : `صفحة ${activePage} من ${totalPages}`}
                        </div>
                        <button 
                            disabled={activePage >= totalPages} 
                            onClick={(e) => { e.stopPropagation(); handlePageChange(activePage + 1); }} 
                            style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(40, 145, 200, 0.2)', background: 'white', fontWeight: 900, cursor: activePage >= totalPages ? 'not-allowed' : 'pointer', opacity: activePage >= totalPages ? 0.5 : 1, color: '#0f172a', transition: '0.2s' }}
                        >
                            {language === 'en' ? 'Next' : 'التالي'}
                        </button>
                    </div>
                </div>
            )}

            {/* 🎨 CSS للطباعة ولتأثيرات الهوفر والجوال */}
            <style>{`
                .table-row-hover:hover { background: rgba(255, 255, 255, 0.9) !important; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transform: translateY(-1px); }
                
                @media (max-width: 768px) {
                    .rawasi-table-wrapper {
                        padding: 10px 8px !important;
                        border-radius: 14px !important;
                        margin: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .rawasi-printable-table th {
                        padding: 8px 10px !important;
                        font-size: 11px !important;
                        white-space: nowrap !important;
                    }
                    .rawasi-printable-table td {
                        padding: 8px 10px !important;
                        font-size: 11px !important;
                    }
                    .table-toolbar {
                        justify-content: stretch !important;
                        width: 100% !important;
                    }
                    .table-toolbar > div {
                        width: 100% !important;
                        display: flex !important;
                    }
                    .table-toolbar button {
                        flex: 1 !important;
                        justify-content: center !important;
                        min-height: 42px !important;
                    }
                    .table-pagination-mobile {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 10px !important;
                        padding: 10px !important;
                    }
                    .table-pagination-mobile .pagination-controls {
                        width: 100% !important;
                        display: flex !important;
                        justify-content: space-between !important;
                    }
                    .table-pagination-mobile .pagination-controls button {
                        min-height: 42px !important;
                        flex: 1 !important;
                    }
                }

                @media print {
                    body * { visibility: hidden; }
                    .rawasi-printable-table, .rawasi-printable-table * { visibility: visible; }
                    .rawasi-printable-table { position: absolute; left: 0; top: 0; width: 100%; }
                    .hide-on-print { display: none !important; }
                    /* إخفاء عمود التحديد والـ Actions عند الطباعة */
                    .rawasi-printable-table th:first-child, .rawasi-printable-table td:first-child { display: none !important; }
                    .rawasi-printable-table { border: 1px solid #000; }
                    .rawasi-printable-table th, .rawasi-printable-table td { border: 1px solid #000; padding: 8px; }
                }
            `}</style>
        </div>
    );
}
