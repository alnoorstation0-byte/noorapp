"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MasterPage from '@/components/MasterPage';
import UserMenu from '@/components/UserMenu';
import RawasiSidebarManager from '@/components/RawasiSidebarManager';
import { THEME } from '@/lib/theme';
import { formatCurrency } from '@/lib/helpers';
import PrintHeader from '@/components/PrintHeader';

export default function FinancialCenter() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  const refreshCore = useCallback(async () => {
    try {
      const [expRes, journalRes] = await Promise.all([
        supabase.from('expenses').select('total_price, created_at, description'),
        supabase.from('journal_lines').select('debit, credit, created_at')
      ]);

      const totalOut = expRes.data?.reduce((sum, i) => sum + (Number(i.total_price) || 0), 0) || 0;
      const totalIn = journalRes.data?.reduce((sum, i) => sum + (Number(i.credit) || 0), 0) || 0;
      const liquidityIndex = totalIn > 0 ? ((totalIn - totalOut) / totalIn * 100).toFixed(1) : 0;

      setData({
        totalIn,
        totalOut,
        netCash: totalIn - totalOut,
        liquidityIndex,
        syncTime: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        blockId: Math.random().toString(36).substring(7).toUpperCase()
      });

      const allEvents = [
        ...(expRes.data || []).map(e => ({ ...e, type: 'DEBIT_OP' })),
        ...(journalRes.data || []).map(j => ({ ...j, type: 'CREDIT_OP' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
      
      setLogs(allEvents);
    } catch (err) {
      console.error("Link Failure:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: any;
    const boot = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      await refreshCore();
      channel = supabase.channel('sovereign_air_radar')
        .on('postgres_changes', { event: '*', schema: 'public' }, () => refreshCore())
        .subscribe();
    };
    boot();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [refreshCore, router]); 

  const sidebarContent = useMemo(() => ({
    summary: (
      <div className="air-status-card">
          <div className="status-ping"><div className="ping-ring"></div><div className="ping-core"></div></div>
          <h3 className="status-label">AIR_NODE_LIVE</h3>
          <p className="status-sub">اتصال كريستالي مشفر</p>
      </div>
    ),
    actions: (
      <div className="sidebar-action-stack">
          <button className="btn-air-primary" onClick={refreshCore}>RE-SYNC ASSETS 🔄</button>
          <button className="btn-air-outline" onClick={() => window.print()}>EXPORT_LEDGER 📑</button>
      </div>
    )
  }), [refreshCore]);

  if (loading) return (
    <div className="air-loader-gate">
        <div className="loader-core"></div>
        <p style={{ color: '#94A3B8', marginTop: 15, fontFamily: 'monospace', letterSpacing: 2 }}>INITIALIZING TELEMETRY RADAR...</p>
    </div>
  );

  return (
    <MasterPage title="المركز المالي" subtitle="غرفة التحكم في السيولة والملاءة المالية">
      
      <div className="air-glass-wrapper">
        {/* 🪐 Mesh Aura Background */}
        <div className="mesh-gradient-aura"></div>
        
        <div style={{ padding: '0 40px', position: 'relative', zIndex: 10 }}>
          <UserMenu />
        </div>

        <div className="theatre-layout">
           <RawasiSidebarManager summary={sidebarContent.summary} actions={sidebarContent.actions} watchDeps={[data]} />

           <div className="main-stage">
              <PrintHeader title="المركز المالي" subtitle="ملخص السيولة والتدفقات" />
              
              {/* 💎 THE HERO VAULT */}
              <div className="hero-vault-air">
                  <div className="glare-effect"></div>
                  <div className="card-top-info">
                      <span className="serial-id">REF: {data?.blockId}</span>
                      <div className="security-tag">PURE_ENCRYPTION</div>
                  </div>
                  <label className="hero-label">TOTAL NET SOVEREIGN EQUITY</label>
                  <h1 className="hero-value">{formatCurrency(data?.netCash)}</h1>
                  <div className="hero-footer-stats" style={{ display: 'flex', gap: 15, marginTop: 20 }}>
                      <div className="pill-air">
                          <span className="dot-active green"></span>
                          Liquidity: {data?.liquidityIndex}%
                      </div>
                      <div className="pill-air">
                          <span className="dot-active cyan"></span>
                          Engine: Quantum
                      </div>
                  </div>
              </div>

              <div className="matrix-layout-grid">
                  
                  {/* 🖥️ COMMAND TERMINAL */}
                  <div className="glass-terminal">
                      <div className="terminal-header">
                          <div className="nav-dots"><span></span><span></span><span></span></div>
                          <span className="nav-title">SOVEREIGN_LOG_STREAM</span>
                          <span className="nav-sync">Live: {data?.syncTime}</span>
                      </div>
                      <div className="terminal-body cinematic-scroll">
                          {logs.map((log, i) => (
                            <div key={i} className="stream-line">
                                <span className="line-ts">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                                <span className={`line-type ${log.type}`}> {log.type} </span>
                                <span className="line-msg">{log.description || 'Auto-Sync Node'}</span>
                                <span className="line-val">{formatCurrency(log.total_price || log.credit || log.debit)}</span>
                            </div>
                          ))}
                          <div className="terminal-cursor">_</div>
                      </div>
                  </div>

                  {/* Matrix Side Tiles */}
                  <div className="matrix-side-column">
                      <div className="matrix-tile">
                          <label>INFLOW_CORE</label>
                          <div className="num success">{formatCurrency(data?.totalIn)}</div>
                          <div className="progress-mini" style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}><div className="fill success" style={{width: '85%', height: '100%', background: '#10B981'}}></div></div>
                      </div>
                      <div className="matrix-tile">
                          <label>OUTFLOW_CORE</label>
                          <div className="num danger">{formatCurrency(data?.totalOut)}</div>
                          <div className="progress-mini" style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}><div className="fill danger" style={{width: '40%', height: '100%', background: '#EF4444'}}></div></div>
                      </div>
                  </div>

              </div>

           </div>
        </div>

        <style>{`
          .air-glass-wrapper { padding: 0 40px 40px; direction: rtl; font-family: -apple-system, BlinkMacSystemFont, 'Cairo', sans-serif; background: transparent; min-height: 100vh; position: relative; overflow: hidden; color: #F8FAFC; }
          
          .mesh-gradient-aura {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: 
              radial-gradient(at 0% 0%, rgba(0, 229, 255, 0.08) 0, transparent 50%),
              radial-gradient(at 100% 0%, rgba(16, 185, 129, 0.08) 0, transparent 60%),
              radial-gradient(at 50% 100%, rgba(11, 14, 20, 0.95) 0, transparent 70%);
            z-index: -1; pointer-events: none;
          }

          .theatre-layout { display: flex; gap: 40px; position: relative; z-index: 5; margin-top: 25px; }
          .main-stage { flex: 1; animation: airEnter 1s cubic-bezier(0.16, 1, 0.3, 1); }

          /* 💎 Hero Vault (Titanium Command Center) */
          .hero-vault-air {
            background: linear-gradient(135deg, rgba(20, 24, 34, 0.95) 0%, rgba(11, 14, 20, 0.98) 100%);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border-radius: 28px; padding: 50px 40px;
            border: 1px solid rgba(0, 229, 255, 0.25);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05);
            position: relative; overflow: hidden; margin-bottom: 30px;
          }
          .glare-effect { position: absolute; top: -100%; left: -100%; width: 300%; height: 300%; background: linear-gradient(45deg, transparent 45%, rgba(0, 229, 255, 0.1) 50%, transparent 55%); animation: glareMove 15s infinite linear; pointer-events: none; }
          .card-top-info { display: flex; justify-content: space-between; margin-bottom: 25px; }
          .serial-id { font-family: monospace; font-size: 11px; color: #64748B; letter-spacing: 2px; }
          .security-tag { font-size: 10px; font-weight: 900; color: #00E5FF; border: 1px solid rgba(0, 229, 255, 0.3); padding: 4px 12px; border-radius: 8px; background: rgba(0, 229, 255, 0.08); backdrop-filter: blur(20px); letter-spacing: 1px; }
          .hero-label { font-size: 12px; font-weight: 900; color: #94A3B8; letter-spacing: 4px; display: block; }
          .hero-value { font-size: 72px; font-weight: 900; color: #F8FAFC; margin: 10px 0; letter-spacing: -2px; }
          
          .pill-air { background: rgba(30, 41, 59, 0.6); padding: 10px 20px; border-radius: 100px; font-size: 13px; font-weight: 800; color: #F8FAFC; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(0, 229, 255, 0.2); backdrop-filter: blur(20px); }
          .dot-active { width: 8px; height: 8px; border-radius: 50%; }
          .dot-active.green { background: #10B981; box-shadow: 0 0 10px #10B981; }
          .dot-active.cyan { background: #00E5FF; box-shadow: 0 0 10px #00E5FF; }

          .matrix-layout-grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 30px; }

          /* 🖥️ Command Terminal */
          .glass-terminal {
            background: rgba(20, 24, 34, 0.95);
            backdrop-filter: blur(24px);
            border-radius: 24px; padding: 30px; border: 1px solid rgba(0, 229, 255, 0.2);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
          }
          .terminal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 1px solid rgba(255, 255, 255, 0.07); padding-bottom: 15px; }
          .nav-dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: inline-block; margin-right: 5px; }
          .nav-title { font-size: 11px; font-family: monospace; color: #94A3B8; font-weight: 700; letter-spacing: 1px; }
          .nav-sync { font-size: 11px; font-family: monospace; color: #10B981; font-weight: 700; }
          .terminal-body { font-family: 'Courier New', monospace; max-height: 380px; overflow-y: auto; }
          .stream-line { font-size: 12px; margin-bottom: 12px; display: flex; gap: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.04); padding-bottom: 10px; color: #F8FAFC; }
          .line-ts { color: #64748B; font-family: monospace; }
          .line-type.DEBIT_OP { color: #EF4444; font-weight: 900; }
          .line-type.CREDIT_OP { color: #10B981; font-weight: 900; }
          .line-val { margin-right: auto; font-weight: 800; color: #00E5FF; }
          .terminal-cursor { color: #00E5FF; animation: appleBlink 1s infinite; font-weight: bold; }

          /* 📊 Matrix Side Tiles */
          .matrix-tile { 
            background: rgba(20, 24, 34, 0.95); 
            backdrop-filter: blur(24px);
            border-radius: 24px; padding: 25px; 
            border: 1px solid rgba(0, 229, 255, 0.15);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transition: 0.3s ease; margin-bottom: 20px;
          }
          .matrix-tile:hover { background: rgba(26, 32, 46, 0.95); transform: translateY(-4px); border-color: rgba(0, 229, 255, 0.4); box-shadow: 0 15px 35px rgba(0, 229, 255, 0.1); }
          .matrix-tile label { font-size: 11px; font-weight: 900; color: #94A3B8; letter-spacing: 2px; display: block; margin-bottom: 8px; }
          .matrix-tile .num { font-size: 36px; font-weight: 900; color: #F8FAFC; letter-spacing: -1px; }
          .num.success { color: #10B981; }
          .num.danger { color: #EF4444; }

          /* 🔘 Buttons */
          .sidebar-action-stack { display: flex; flex-direction: column; gap: 12px; }
          .btn-air-primary { 
            background: linear-gradient(135deg, #00E5FF 0%, #00B4D8 100%); 
            color: #0B0E14; border: none; padding: 18px; border-radius: 16px; font-weight: 900; font-size: 13px; letter-spacing: 1px; cursor: pointer; transition: 0.3s; 
          }
          .btn-air-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0, 229, 255, 0.3); }
          .btn-air-outline { background: rgba(30, 41, 59, 0.6); color: #F8FAFC; border: 1px solid rgba(0, 229, 255, 0.3); padding: 18px; border-radius: 16px; font-weight: 800; cursor: pointer; transition: 0.3s; }
          .btn-air-outline:hover { background: rgba(0, 229, 255, 0.1); border-color: #00E5FF; }

          .air-status-card { background: rgba(20, 24, 34, 0.95); backdrop-filter: blur(20px); padding: 25px; border-radius: 20px; text-align: center; border: 1px solid rgba(16, 185, 129, 0.3); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); }
          .status-label { color: #10B981; font-weight: 900; font-size: 14px; margin-bottom: 5px; }
          .status-sub { color: #94A3B8; font-size: 12px; margin: 0; }
          .status-ping { width: 36px; height: 36px; position: relative; margin: 0 auto 12px; }
          .ping-ring { position: absolute; width: 100%; height: 100%; border: 2px solid #10B981; border-radius: 50%; animation: sovereignPing 2s infinite; }
          .ping-core { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 10px; height: 10px; background: #10B981; border-radius: 50%; box-shadow: 0 0 12px #10B981; }

          @keyframes glareMove { 0% { transform: translate(-100%, -100%); } 100% { transform: translate(100%, 100%); } }
          @keyframes airEnter { from { opacity: 0; transform: translateY(30px); filter: blur(20px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
          @keyframes appleBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
          @keyframes sovereignPing { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }

          .air-loader-gate { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0B0E14; }
          .loader-core { width: 44px; height: 44px; border: 3px solid rgba(255, 255, 255, 0.1); border-top: 3px solid #00E5FF; border-radius: 50%; animation: appleSpin 0.8s linear infinite; }
          @keyframes appleSpin { to { transform: rotate(360deg); } }

          .cinematic-scroll::-webkit-scrollbar { width: 4px; }
          .cinematic-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
          .cinematic-scroll::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.2); border-radius: 10px; }

          @media (max-width: 1200px) { .matrix-layout-grid { grid-template-columns: 1fr; } }
        `}</style>
      </div>
    </MasterPage>
  );
}
