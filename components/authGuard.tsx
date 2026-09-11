"use client";
import { useEffect, useState, createContext, useContext, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import LoadingScreen from '@/components/LoadingScreen';
import { supabase } from "@/lib/supabase";

const AuthContext = createContext<{
  user: any;
  profile: any;
  loading: boolean;
  can: (module: string, action: string) => boolean;
} | null>(null);

const ROUTE_MODULE_MAP: Record<string, string> = {
  '/Dashboard': 'dashboard',
  '/GlobalSummary': 'global_summary',
  '/kpis': 'global_summary',
  
  '/pos': 'pos',
  '/pos/invoices': 'pos_invoices',
  '/pos/dashboard': 'pos_dashboard',
  
  '/fleet': 'fleet',
  '/fleet_operations': 'fleet_operations',
  '/invoices': 'invoices',
  
  '/inventory': 'inventory',
  '/item-card': 'inventory',
  '/dead-stock': 'inventory',
  '/reorder-alerts': 'inventory',
  '/inventory-valuation': 'inventory',
  
  '/purchase_orders': 'purchase_orders',
  '/inventory/warehouses': 'warehouses',
  '/inventory/transactions': 'inventory_transactions',
  
  '/ReceiptVouchers': 'receipts',
  '/PaymentVouchers': 'payments',
  '/expenses': 'expenses',
  '/journal': 'journal',
  '/ManualJournals': 'manual_journals',
  '/accounts': 'accounts',
  '/ledger': 'ledger',
  '/trialbalance': 'trialbalance',
  
  '/financial-center': 'financial_center',
  '/financialplan': 'financial_center',
  '/financial-statements': 'financial_statements',
  '/cashflows': 'cashflows',
  
  '/partners': 'partners',
  '/PartnerBalances': 'partner_balances',
  '/delegate-debts': 'delegate_debts',
  '/delegate-settlements': 'delegate_settlements',
  '/statement': 'statement',
  
  '/reports': 'reports',
  '/sales-analysis': 'reports',
  '/trip-profitability': 'reports',
  '/ar-aging': 'reports',
  '/vehicle-expenses': 'reports',
  '/vat-return': 'reports',
  '/profit-dashboard': 'reports',
  
  '/import': 'import',
  '/audit': 'audit',
  '/payroll': 'payroll',
  '/settings': 'settings',
  '/team': 'team',
  '/messages': 'messages',
};

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      if (!user) setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (pathname !== "/login" && pathname !== "/signup") router.replace("/login");
        setLoading(false);
        return;
      }

      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData?.is_active === false) {
        await supabase.auth.signOut();
        alert("⛔ تم إيقاف حسابك من قبل الإدارة. يرجى مراجعة مدير النظام.");
        router.replace("/login");
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        router.replace("/login");
      } else if (session && !user) {
        setUser(session.user);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [pathname, router]); 

  const can = (moduleName: string, action: string) => {
    if (!profile) return false;
    if (profile.role === 'admin' || profile.is_admin) return true; 
    
    const perms = profile.permissions || {};
    // Check for array format (old) or object format (new)
    if (Array.isArray(perms[moduleName])) {
      return perms[moduleName].includes(action);
    } else if (perms[moduleName] && typeof perms[moduleName] === 'object') {
      return !!perms[moduleName][action];
    }
    return false;
  };

  const isAuthorized = useMemo(() => {
    if (loading || !user || !profile) return true; // Don't block while loading
    if (pathname === '/' || pathname === '/login' || pathname === '/signup' || pathname.startsWith('/api')) return true;
    
    // 🛡️ السماح دائماً للملف الشخصي والتنبيهات
    if (pathname === '/profile' || pathname === '/notifications') return true;

    // Check for exact match first
    let requiredModule = ROUTE_MODULE_MAP[pathname];
    
    // If no exact match, check for matching prefixes for sub-routes
    if (!requiredModule) {
      const matchingPrefix = Object.keys(ROUTE_MODULE_MAP)
        .sort((a, b) => b.length - a.length)
        .find(prefix => pathname.startsWith(prefix + '/'));
      
      if (matchingPrefix) {
        requiredModule = ROUTE_MODULE_MAP[matchingPrefix];
      }
    }

    if (!requiredModule) return true; // If route not mapped, let it pass (safe fallback)

    return can(requiredModule, 'view');
  }, [pathname, profile, loading, user]);

  if (loading && !user) {
    if (pathname === '/login' || pathname === '/signup') return <>{children}</>;
    return <LoadingScreen message="جاري الدخول..." subMessage="لحظات وستكون جاهزاً" fullScreen={true} />;
  }

  if (!isAuthorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', background: 'rgba(255, 255, 255, 0.6)', padding: '20px', textAlign: 'center' }}>
        <div style={{ marginBottom: '15px', fontSize: '60px' }}>
          🛑
        </div>
        <h1 style={{ color: '#dc2626', fontWeight: 900, fontSize: '32px', margin: '0' }}>عفواً، ليس لديك صلاحية للوصول إلى هذه الصفحة!</h1>
        <button 
          onClick={() => router.push('/')}
          style={{ marginTop: '25px', padding: '14px 30px', background: '#dc2626', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 900, fontSize: '16px', boxShadow: '0 4px 15px rgba(220,38,38,0.4)', transition: '0.3s' }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          🏠 العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthGuard");
  return context;
};
