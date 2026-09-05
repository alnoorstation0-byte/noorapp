# Terminology Search Results


### audit\page.tsx
- Line 203: `{/* 👤 عرض العميل / المقاول / المستفيد */}`

### cashflows\page.tsx
- Line 273: `'المشروع المربوط': row.project?.Property || '---',`
- Line 487: `{groupBy === 'partner' ? '👤 اسم الشريك (مقاول / مورد / عميل)' : '📅 التاريخ الزمني'}`
- Line 529: `<th style={{ width: '20%', textAlign: 'right' }}>🏢 المشروع / التوجيه</th>`

### expenses\ExpenseFormModal.tsx
- Line 242: `<h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: THEME.brand.coffee, marginBottom: '10px' }}>🛒 إضافة بنود المصروف</h3>`
- Line 308: `<div style={{ fontSize: '11px', color: '#475569', fontWeight: 800 }}>إجمالي الأعمال</div>`

### expenses\ExpensePrintModal.tsx
- Line 234: `{/* 3️⃣ جدول البنود (🚀 يدعم الآن الأصناف المتعددة!) */}`

### expenses\expenses_logic.ts
- Line 52: `// 👇 الحقول الجديدة الخاصة بالربط مع أوامر التشغيل والمقاولين`
- Line 97: `contractors: partnersData.filter(p => p.partner_type === 'مقاول'),`
- Line 323: `description: paymentData.payment_notes || `سداد مصروف لـ ${realExpense.description || 'أعمال مقاولات'}`,`

### expenses\page.tsx
- Line 480: `<MasterPage icon="💸" title="سجل المصروفات الموحد" subtitle="إدارة التكاليف والمشتريات وتوزيع بنود العمل">`

### financialplan\financial_plan_logic.ts
- Line 5: `// البنود الافتراضية لو الشهر ملوش خطة محفوظة`
- Line 7: `{ category: 'إيرادات', item_name: 'مبيعات المشاريع' },`
- Line 41: `// لو مفيش داتا للشهر ده، هنفرش البنود الافتراضية`
- Line 65: `// إضافة بند جديد يدوياً`
- Line 72: `item_name: 'بند جديد...',`
- Line 80: `// حذف بند`
- Line 110: `item_name: r.item_name || 'بند غير مسمى',`

### financialplan\page.tsx
- Line 49: `aoa.push(['م', 'التصنيف', 'اسم البند', 'المستهدف (المخطط)', 'المنفذ (الفعلي)', 'الانحراف المالي']);`
- Line 53: `aoa.push([idx + 1, r.category, r.item_name || 'بند غير مسمى', Number(r.planned_amount) || 0, Number(r.actual_amount) || 0, 0]);`
- Line 66: `aoa.push(['م', 'التصنيف', 'اسم البند', 'المقدر (المخطط)', 'المنصرف (الفعلي)', 'الانحراف المالي']);`
- Line 70: `aoa.push([idx + 1, r.category, r.item_name || 'بند غير مسمى', Number(r.planned_amount) || 0, Number(r.actual_amount) || 0, 0]);`
- Line 188: `// 👷 8. صفوف البنود العادية (معادلات الانحراف الحية والـ Zebra Striping)`
- Line 193: `if (C === 2) cellStyle.alignment.horizontal = "right"; // محاذاة اسم البند لليمين لأنه عربي`
- Line 253: `+ إضافة بند`
- Line 260: `<th style={{ padding: '12px 15px', borderBottom: `1px solid ${THEME.border}` }}>اسم البند</th>`
- Line 358: `<LoadingScreen message="جاري تحميل بنود الخطة من النظام..." fullScreen={false} />`
- Line 421: `<th style={{ width: '45%' }}>اسم البند التفصيلي</th>`
- Line 459: `<th style={{ width: '45%' }}>اسم البند التفصيلي</th>`

### import\page.tsx
- Line 31: `'البند': 'اسم البند',`
- Line 38: `'المقاول': 'المركز الرئيسي',`
- Line 47: `'المقاول / المورد': 'اسم المقاول',`
- Line 116: `showToast("جاري مطابقة الأسماء والبنود مع قاعدة البيانات...", "info");`
- Line 139: `...rawLabor.map((r:any) => safeTrim(r['البند']))`
- Line 140: `])).filter(i => i && i !== 'اسم البند');`
- Line 226: `} else errs.push('الفيلا غير مسجلة بالمشاريع');`
- Line 229: `const origItem = row['البند'];`
- Line 231: `if (type === 'labor' && pId && itemName && itemName !== 'اسم البند') {`
- Line 236: `row['البند'] = item.work_item;`
- Line 237: `fixes.push({ col: 'البند', msg: 'تعديل مسافة زائدة' });`
- Line 239: `} else errs.push('البند غير مربوط بموازنة هذه الفيلا');`
- Line 248: `expenses: rawExpenses.filter((r:any) => r['المقاول / المورد'] !== 'اسم المقاول').map((r: any) => validateRow(r, 'expenses')),`
- Line 272: `project_id: r._mapped.project_id, site_ref: r['الفيلا'], work_item: r['البند'], work_item_id: r._mapped.boq_id,`
- Line 274: `daily_wage: parseFloat(r['اليومية']) || 0, attendance_value: parseFloat(r['الحضور']) || 1, sub_contractor: r['المقاول'], notes: r['ملاحظات'],`
- Line 280: `project_id: r._mapped.project_id, site_ref: r['الفيلا'], sub_contractor: r['المقاول / المورد'],`
- Line 342: `{row._errors?.length > 0 && (k === 'اسم العامل' || k === 'الفيلا' || k === 'البند' || k === 'اسم المستفيد') && (`
- Line 419: `يوجد أخطاء في بعض السطور مضللة باللون الأحمر. يرجى التأكد من مطابقة الأسماء والفلل والبنود مع المسجل في النظام.`

### invoices\InvoiceFormModal.tsx
- Line 19: `// 🚀 1. سحب البيانات بشكل ذكي ومؤكد (العقارات، العميل، والبنود)`
- Line 36: `// ب. سحب العقارات المرتبطة بالفاتورة`
- Line 51: `// 💎 د. (التعديل الأهم): سحب البنود التفصيلية في حالة التعديل عشان الجدول ميكونش فاضي`
- Line 69: `// 💡 بيجمع السعر المكتوب حالياً + البنود المضافة في الجدول`

### invoices\InvoicePrintModal.tsx
- Line 76: `// 🚀 سحب المشاريع بذكاء استراتيجي (دعم المصفوفات، النصوص، والبيانات الجاهزة)`
- Line 100: `console.error("خطأ في قراءة مصفوفة المشاريع:", error);`
- Line 228: `// 🚀 استنتاج إجمالي الأعمال لحظياً لضمان عدم ظهوره بـ 0 أثناء الرندر`
- Line 530: `<span style={{ width: '26%', textAlign: 'right', fontWeight: 900, color: '#64748b', fontSize: '11px', whiteSpace: 'nowrap' }}>المشروع</span>`
- Line 538: `{/* 3️⃣ جدول البنود التفصيلية */}`
- Line 610: `<span style={{ fontFamily: "'Arial', sans-serif" }}>إجمالي الأعمال / Subtotal:</span>`
- Line 629: `<span style={{ fontFamily: "'Arial', sans-serif" }}>ضمان أعمال / Guarantee ({record.guarantee_percent}%):</span>`
- Line 640: `{/* 5️⃣ بند الإقرار القانوني - مدمج */}`

### invoices\invoices_logic.ts
- Line 226: `partner_acc_name: inv.debit_acc?.name || 'العملاء (أصحاب المشاريع)',`

### invoices\page.tsx
- Line 120: `label: 'العميل / المشروع',`

### journal\journal_logic.ts
- Line 11: `* 🟢 فلترة شاملة حسب الفترة والحساب والشريك والمشروع ونوع القيد`

### journal\page.tsx
- Line 375: `label="البحث باسم المشروع / الفيلا"`

### layout.tsx
- Line 45: `description: "نظام إدارة العمالة والمشاريع والمصروفات",`

### ledger\page.tsx
- Line 21: `header: 'البيان / المشروع',`

### ManualJournals\page.tsx
- Line 255: `<label>الموقع / المشروع (اختياري) 📍</label>`
- Line 261: `placeholder="بدون مشروع"`
- Line 274: `displayFormat={(item: any) => `${item.order_number} - ${item.boq_budget?.work_item || 'بدون بند'}`}`

### PartnerBalances\page.tsx
- Line 86: `// 🚀 المحرك اللحظي لجلب الأرصدة الشاملة للمشروع وإعادة التجميع بدقة متناهية`
- Line 212: `const isWorker = ['عامل', 'صنايعي', 'عامل يومية', 'مقاول باطن', 'مقاول'].includes(item.partner_type);`
- Line 441: `<span style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>عمال ومقاولين بحركات نشطة 👷‍♂️</span>`

### PartnerBalances\printstatement.tsx
- Line 119: `<p>نظام إدارة العقود والمقاولات الذكي</p>`

### partners\partners_logic.ts
- Line 184: `contractors: partners.filter(p => p.type === 'مقاول').length`
- Line 211: `case 'مقاول': return { bg: '#FEF3C7', color: '#B45309', icon: '🏗️' };`

### profile\page.tsx
- Line 179: `line_details: `موقع: ${log.site_ref || log.Site || '---'} | بند: ${log.work_item || log.Item || '---'} | إنتاجية: ${log.daily_production || log.Prod || 0}`,`
- Line 356: `{ header: 'الموقع والبند', accessor: 'site_ref', render: (row: any) => <div style={{ fontWeight: 900, color: THEME.primary }}>{row.site_ref || row.Site} <span style={{fontSize:'12px', color:THEME.accent, display:'block'}}>{row.work_item || row.Item}</span></div> },`
- Line 547: `<p style={{ margin: '15px 0 0 0', fontSize: '14px', color: '#64748b', fontWeight: 700, lineHeight: 1.6 }}>إجمالي الوحدات التي تم إنجازها مقابل التريحة المستهدفة للعمل الفني عبر كافة البنود.</p>`
- Line 560: `{/* تفصيل الإنتاجية لكل بند */}`
- Line 563: `<h4 style={{ color: THEME.accent, margin: '0 0 20px 0', fontSize: '18px', fontWeight: 900 }}>📋 تفصيل التقييم حسب البند</h4>`
- Line 623: `<li>يُثبت الحضور حصراً عبر النظام الرقمي في الموقع الجغرافي للمشروع.</li>`
- Line 634: `"استخدامك لهذا النظام يُعد إقراراً بالموافقة على بنود اللائحة، وتعتبر توقيعاً ملزماً."`

### profile\profile_logic.ts
- Line 245: `// 2. حساب الإنتاجية مفصلة حسب البند (مع مراعاة التريحة)`

### ReceiptVouchers\ReceiptVoucherModal.tsx
- Line 138: `// 1. ترجمة مصفوفة العقارات (project_ids) لأسماء`
- Line 176: `let pAccName = 'العملاء (أصحاب المشاريع)';`
- Line 205: `// 🧠 2. دالة اختيار العقارات`

### settings\backup_logic.ts
- Line 63: `// تجميع القيم اللي جوه الاوبجيكت (مثلاً: البند: كذا - الكمية: كذا)`
- Line 167: `'اسم العقار / المشروع': 'فيلا 15 (سيقوم النظام بتحويله لـ ID تلقائياً)', // 🚀 العمود الجديد`
- Line 176: `{ wch: 30 }, // اسم العقار`
- Line 189: `'site_ref': 'اسم العقار أو المشروع الحالي',`
- Line 190: `'work_item': 'بند الأعمال (مثل: لياسة / حدادة)',`
- Line 198: `'sub_contractor': 'اكتب اسم المقاول أو "المركز الرئيسي"',`
- Line 212: `'المقاول / المورد': 'اكتب اسم المقاول هنا',`
- Line 222: `'الموقع / المشروع': 'اسم العقار أو المشروع',`
- Line 231: `{ wch: 25 }, // المقاول / المورد`
- Line 241: `{ wch: 25 }, // الموقع / المشروع`

### settings\page.tsx
- Line 27: `name: "🏗️ المشاريع والعمليات الميدانية",`

### settings\PermissionsMatrix.tsx
- Line 16: `{ key: 'projects', name: 'المشاريع' },`

### settings\restore_action.ts
- Line 32: `if (h.includes('مقاول') || h.includes('مورد')) return 'sub_contractor';`
- Line 45: `if (h.includes('عقار') || h.includes('مشروع') || h.includes('property') || h.includes('project')) return 'project_id';`
- Line 79: `if (h.includes('عقار') || h.includes('مشروع') || h.includes('property') || h.includes('project')) return 'Property';`
- Line 81: `if (h.includes('بند') || h.includes('عمل') || h.includes('item')) return 'work_item';`
- Line 82: `if (h.includes('مقاول') || h.includes('contractor')) return 'sub_contractor';`
- Line 87: `if (h.includes('عقار') || h.includes('مشروع') || h.includes('property')) return 'project_id';`
- Line 111: `if (h.includes('مشروع') || h.includes('موقع')) return 'site_ref';`
- Line 296: `throw new Error(`❌ خطأ في الصف رقم ${excelRowNumber}: العقار "${val}" غير موجود بقاعدة البيانات! يرجى التأكد من الاسم.`);`

### signup\page.tsx
- Line 204: `options={['💼 موظف إداري / مهندس', '👷 مقاول باطن / مورد', '👤 عميل / صاحب مشروع']}`
- Line 207: `const role = val.includes('موظف') ? 'staff' : val.includes('مقاول') ? 'contractor' : 'client';`

### statement\page.tsx
- Line 153: `<label>👤 الشريك (عامل / مقاول / مورد)</label>`

### statement\StatementPrintModal.tsx
- Line 186: `<div className="sig-box"><p>توقيع المقاول / الشريك</p><div className="sig-line"></div></div>`

### statement\statement_logic.ts
- Line 28: `case 'مستخلص': return 'مستخلص أعمال';`
- Line 92: `// 🎯 قاعدة الفصل الصارمة: لو البيان جواه (استقطاع أو غرامة أو جزاء) يروح فوراً للغرامات ويتحظر من بند المسحوبات بالسامري`
- Line 148: `setExportProgress("⏳ جاري سحب بيانات العمالة والمقاولين...");`
- Line 155: `.in('partner_type', ['عامل', 'صنايعي', 'عامل يومية', 'مقاول باطن', 'موظف', 'مقاول']);`
- Line 159: `showToast("لا يوجد عمالة أو مقاولين في النظام", "error");`
- Line 266: `<div style="display: flex; flex-direction: column; gap: 5px;"><strong>الموظف / المقاول:</strong><span style="font-weight: bold; font-size: 16px;">${pName}</span></div>`

### team\page.tsx
- Line 278: `{user.role === 'admin' ? '👑 مدير نظام' : user.role === 'staff' ? '💼 موظف' : user.role === 'contractor' ? '👷 مقاول' : '👤 عميل'}`

### team\profileeditormodal.tsx
- Line 208: `projects: '🏗️ غرفة المشاريع',`
- Line 212: `subclaims: '📑 مستخلصات مقاولي الباطن',`
- Line 213: `subcontractor_costs: '💵 تكاليف مقاولي الباطن',`
- Line 214: `boqcatalog: '📚 الدليل الموحد للبنود (BOQ)',`
- Line 327: `<option value="contractor">👷 مقاول (بوابة المقاولين)</option>`
