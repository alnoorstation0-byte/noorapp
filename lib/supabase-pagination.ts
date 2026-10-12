/**
 * دالة مساعدة لجلب البيانات من Supabase على مراحل (Pagination)
 * لتجاوز حد الـ 1000 صف ولحماية البيانات من التكرار في حالة تزامن الإضافات.
 * 
 * @param buildQuery دالة تقوم بإرجاع كائن الاستعلام الخاص بـ Supabase (بدون استدعاء .range أو .limit)
 * @param primaryKey الحقل الأساسي المستخدم لمنع التكرار (الافتراضي 'id')
 * @param maxRows الحد الأقصى المتوقع للبيانات كحماية إضافية للذاكرة (الافتراضي 50000)
 * @param step حجم الدفعة في كل طلب (الافتراضي 1000)
 * @returns مصفوفة تحتوي على جميع البيانات المدمجة والخالية من التكرار
 */
export async function fetchPaginatedData(
    buildQuery: () => any, 
    primaryKey: string | ((row: any, index: number) => string) = 'id',
    maxRows: number = 50000,
    step: number = 1000
) {
    const allData: any[] = [];
    const seenIds = new Set<string>();

    const appendRows = (rows: any[], offset: number) => {
        let idx = offset;
        for (const row of rows) {
            const id = typeof primaryKey === 'function' ? primaryKey(row, idx) : String(row[primaryKey]);
            if (!seenIds.has(id)) {
                seenIds.add(id);
                allData.push(row);
            }
            idx++;
        }
    };

    // 🚀 جلب الدفعة الأولى ومعرفة العدد الإجمالي إذا كان count مطلوباً
    const firstQuery = buildQuery().range(0, step - 1);
    const { data: firstData, count, error: firstErr } = await firstQuery;
    if (firstErr) throw new Error(firstErr.message);

    if (firstData && firstData.length > 0) {
        appendRows(firstData, 0);
    }

    // ⚡ إذا كان العدد الإجمالي count متوفراً وأكبر من الدفعة الأولى، نجلبه بالتوازي لتسريع الأداء
    if (typeof count === 'number' && count > step) {
        const targetTotal = Math.min(count, maxRows);
        const ranges: { from: number; to: number }[] = [];
        for (let from = step; from < targetTotal; from += step) {
            ranges.push({ from, to: Math.min(from + step - 1, targetTotal - 1) });
        }

        const concurrency = 6;
        for (let i = 0; i < ranges.length; i += concurrency) {
            const batch = ranges.slice(i, i + concurrency);
            const promises = batch.map(r => buildQuery().range(r.from, r.to));
            const results = await Promise.all(promises);
            for (let j = 0; j < results.length; j++) {
                const res = results[j];
                if (res.error) throw new Error(res.error.message);
                if (res.data) {
                    appendRows(res.data, batch[j].from);
                }
            }
        }
        return allData;
    }

    // 🔄 المسار التتابعي الاحتياطي إذا لم يكن count متاحاً
    let from = step;
    let hasMore = firstData && firstData.length === step;
    let loopGuard = 1;
    const maxLoops = Math.ceil(maxRows / step);

    while (hasMore && loopGuard < maxLoops) {
        loopGuard++;
        const query = buildQuery().range(from, from + step - 1);
        const { data, error } = await query;
        if (error) throw new Error(error.message);

        if (data && data.length > 0) {
            appendRows(data, from);
            from += step;
            if (data.length < step) hasMore = false;
        } else {
            hasMore = false;
        }
    }

    return allData;
}
