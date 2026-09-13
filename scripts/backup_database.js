const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ لم يتم العثور على مفاتيح Supabase في ملف .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// قائمة كافة جداول قاعدة البيانات
const TABLES = [
  'accounts',
  'partners',
  'warehouses',
  'inventory_items',
  'warehouse_inventory',
  'vehicle_inventory',
  'inventory_transactions',
  'invoices',
  'pos_shifts',
  'expenses',
  'receipt_vouchers',
  'payment_vouchers',
  'journal_headers',
  'journal_lines',
  'manual_journals',
  'service_operations',
  'fleet_vehicles',
  'fleet_operations',
  'cash_flows',
  'payroll_slips',
  'labor_daily_logs',
  'job_orders',
  'notifications',
  'messages',
  'user_tasks',
  'user_requests',
  'violations',
  'audit_logs',
  'financial_plans',
  'sys_financial_reports',
  'system_settings',
  'profiles'
];

async function runBackup() {
  console.log("🚀 جاري بدء أخذ نسخة احتياطية كاملة من قاعدة بيانات Supabase...");
  console.log(`🌐 الرابط: ${supabaseUrl}`);

  const backupData = {
    metadata: {
      timestamp: new Date().toISOString(),
      source: supabaseUrl,
      app: 'Elghayam Water ERP',
      total_tables: TABLES.length
    },
    tables: {}
  };

  let totalRowsCount = 0;

  for (const table of TABLES) {
    try {
      let allRows = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
          console.warn(`⚠️ تعذر جلب بيانات الجدول [${table}]: ${error.message}`);
          hasMore = false;
          break;
        }

        if (data && data.length > 0) {
          allRows = allRows.concat(data);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      backupData.tables[table] = allRows;
      totalRowsCount += allRows.length;
      console.log(`  ✅ جدول [${table.padEnd(24, ' ')}]: ${String(allRows.length).padStart(5, ' ')} سجل`);
    } catch (err) {
      console.error(`  ❌ خطأ في نسخ جدول [${table}]:`, err.message);
      backupData.tables[table] = [];
    }
  }

  // إنشاء اسم الملف مع التاريخ والوقت
  const now = new Date();
  const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
  const outputDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `supabase_backup_${dateStr}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(backupData, null, 2), 'utf-8');

  console.log("\n=======================================================");
  console.log(`🎉 تم إنشاء النسخة الاحتياطية بنجاح!`);
  console.log(`📊 إجمالي السجلات المنسوخة: ${totalRowsCount} سجل`);
  console.log(`📁 مسار الملف المحفوظ:`);
  console.log(`   ${outputFile}`);
  console.log("=======================================================\n");
}

runBackup();
