require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: receiptsData, error: receiptsError } = await supabase
        .from('material_receipt_lines')
        .select(`
          id, quantity, unit, total_price, item_name,
          receipt:material_receipts (
            receipt_number, receipt_date, created_at, supplier:partners(name), project:projects(Property)
          )
        `);
  console.log("Receipts Data:", receiptsData?.length, "Error:", receiptsError);

  const { data: issuesData, error: issuesError } = await supabase
        .from('material_issue_lines')
        .select(`
          id, quantity, unit, total_price, item_name,
          issue:material_issues (
            issue_number, issue_date, created_at, subcontractor:partners(name), project:projects(Property)
          )
        `);
  console.log("Issues Data:", issuesData?.length, "Error:", issuesError);
}

run();
