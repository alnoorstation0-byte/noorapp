"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';

export interface LeasePaymentRecord {
  id: string;
  installmentId: string;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'other';
  referenceNumber?: string; // رقم الحوالة أو الشيك
  bankName?: string;
  notes?: string;
  recordedAt?: string;
}

export interface LeaseInstallment {
  id: string;
  title: string; // مثل: "الدفعة الأولى 1/2"
  dueDate: string; // YYYY-MM-DD
  dueAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  daysUntilDue: number;
  payments: LeasePaymentRecord[];
}

export interface StationLease {
  id: string;
  stationId: string;
  stationName: string;
  contractNumber: string; // رقم العقد في منصة إيجار
  lessorName: string; // المالك / المؤجر
  lessorPhone?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  annualRent: number; // القيمة السنوية بالريال
  paymentFrequency: 'yearly' | 'semi_annual' | 'quarterly' | 'monthly';
  notes?: string;
  installments: LeaseInstallment[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CalculatedStationLease extends StationLease {
  totalPaid: number;
  totalRemaining: number;
  paymentProgress: number; // 0 - 100%
  daysUntilContractExpiry: number;
  contractStatus: 'active' | 'expiring_soon' | 'expired';
  overdueInstallmentsCount: number;
  upcomingInstallmentsCount: number;
}

// توليد جدول الأقساط تلقائياً وفقاً لتاريخ البداية والنهاية ودورية السداد
export function generateDefaultInstallments(
  startDateStr: string,
  endDateStr: string,
  annualRent: number,
  frequency: StationLease['paymentFrequency']
): LeaseInstallment[] {
  if (!startDateStr || !annualRent || annualRent <= 0) return [];

  let count = 1;
  let monthsInterval = 12;

  switch (frequency) {
    case 'yearly':
      count = 1;
      monthsInterval = 12;
      break;
    case 'semi_annual':
      count = 2;
      monthsInterval = 6;
      break;
    case 'quarterly':
      count = 4;
      monthsInterval = 3;
      break;
    case 'monthly':
      count = 12;
      monthsInterval = 1;
      break;
  }

  const installmentAmount = Math.round((annualRent / count) * 100) / 100;
  const start = new Date(startDateStr);
  const installments: LeaseInstallment[] = [];

  for (let i = 0; i < count; i++) {
    const due = new Date(start);
    due.setMonth(start.getMonth() + (i * monthsInterval));
    const dueStr = due.toISOString().split('T')[0];

    installments.push({
      id: `inst-${Date.now()}-${i + 1}`,
      title: count === 1 ? 'الدفعة السنوية الكاملة' : `الدفعة (${i + 1} من ${count})`,
      dueDate: dueStr,
      dueAmount: installmentAmount,
      paidAmount: 0,
      remainingAmount: installmentAmount,
      status: 'pending',
      daysUntilDue: 0,
      payments: []
    });
  }

  return installments;
}

// بيانات افتراضية أولية واقعية لمحطات الوقود السعودية
const INITIAL_DEFAULT_LEASES: StationLease[] = [
  {
    id: 'lease-init-1',
    stationId: 'all',
    stationName: 'محطة النور - الفرع الرئيسي (طريق المطار)',
    contractNumber: 'EJR-4491028301',
    lessorName: 'شركة الراجحي للاستثمار العقاري',
    lessorPhone: '0551234567',
    startDate: new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 185 * 86400000).toISOString().split('T')[0],
    annualRent: 240000,
    paymentFrequency: 'semi_annual',
    notes: 'عقد موثق عبر شبكة إيجار التجارية، يشمل أرض المحطة ومبنى التموينات والخدمات السريعة.',
    installments: [
      {
        id: 'inst-1-1',
        title: 'الدفعة الأولى (1 من 2)',
        dueDate: new Date(Date.now() - 170 * 86400000).toISOString().split('T')[0],
        dueAmount: 120000,
        paidAmount: 120000,
        remainingAmount: 0,
        status: 'paid',
        daysUntilDue: -170,
        payments: [
          {
            id: 'pay-1',
            installmentId: 'inst-1-1',
            amount: 120000,
            paymentDate: new Date(Date.now() - 165 * 86400000).toISOString().split('T')[0],
            paymentMethod: 'bank_transfer',
            referenceNumber: 'TRX-99201948',
            bankName: 'مصرف الراجحي',
            notes: 'سداد الدفعة الأولى بموجب إشعار تحويل بنكي للمالك مباشرة'
          }
        ]
      },
      {
        id: 'inst-1-2',
        title: 'الدفعة الثانية (2 من 2)',
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0], // مستحقة بعد 15 يوماً!
        dueAmount: 120000,
        paidAmount: 40000,
        remainingAmount: 80000,
        status: 'partial',
        daysUntilDue: 15,
        payments: [
          {
            id: 'pay-2',
            installmentId: 'inst-1-2',
            amount: 40000,
            paymentDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
            paymentMethod: 'bank_transfer',
            referenceNumber: 'TRX-99481023',
            bankName: 'مصرف الراجحي',
            notes: 'دفعة مقدمة من القسط الثاني'
          }
        ]
      }
    ]
  },
  {
    id: 'lease-init-2',
    stationId: 'all',
    stationName: 'محطة النور - فرع طريق الملك فهد',
    contractNumber: 'EJR-442890192',
    lessorName: 'ورثة الشيخ خالد بن عبدالعزيز',
    lessorPhone: '0509876543',
    startDate: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 275 * 86400000).toISOString().split('T')[0],
    annualRent: 180000,
    paymentFrequency: 'quarterly',
    notes: 'إيجار ربع سنوي كل 3 أشهر بمبلغ 45,000 ريال لكل دفعة.',
    installments: [
      {
        id: 'inst-2-1',
        title: 'الدفعة الأولى (1 من 4)',
        dueDate: new Date(Date.now() - 85 * 86400000).toISOString().split('T')[0],
        dueAmount: 45000,
        paidAmount: 45000,
        remainingAmount: 0,
        status: 'paid',
        daysUntilDue: -85,
        payments: [
          {
            id: 'pay-3',
            installmentId: 'inst-2-1',
            amount: 45000,
            paymentDate: new Date(Date.now() - 80 * 86400000).toISOString().split('T')[0],
            paymentMethod: 'check',
            referenceNumber: 'CHK-001928',
            bankName: 'البنك الأهلي السعودي',
            notes: 'شيك مصدق مسحوب للمستفيد'
          }
        ]
      },
      {
        id: 'inst-2-2',
        title: 'الدفعة الثانية (2 من 4)',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0], // مستحقة بعد 5 أيام!
        dueAmount: 45000,
        paidAmount: 0,
        remainingAmount: 45000,
        status: 'pending',
        daysUntilDue: 5,
        payments: []
      },
      {
        id: 'inst-2-3',
        title: 'الدفعة الثالثة (3 من 4)',
        dueDate: new Date(Date.now() + 95 * 86400000).toISOString().split('T')[0],
        dueAmount: 45000,
        paidAmount: 0,
        remainingAmount: 45000,
        status: 'pending',
        daysUntilDue: 95,
        payments: []
      },
      {
        id: 'inst-2-4',
        title: 'الدفعة الرابعة (4 من 4)',
        dueDate: new Date(Date.now() + 185 * 86400000).toISOString().split('T')[0],
        dueAmount: 45000,
        paidAmount: 0,
        remainingAmount: 45000,
        status: 'pending',
        daysUntilDue: 185,
        payments: []
      }
    ]
  }
];

export function useStationLeasesLogic() {
  const { showToast } = useToast();
  const [leases, setLeases] = useState<StationLease[]>([]);
  const [stations, setStations] = useState<{ id: string; name: string; location?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStationFilter, setSelectedStationFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // all | has_due | completed

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<StationLease | null>(null);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentTargetLease, setPaymentTargetLease] = useState<StationLease | null>(null);
  const [paymentTargetInstallment, setPaymentTargetInstallment] = useState<LeaseInstallment | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentDateInput, setPaymentDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethodInput, setPaymentMethodInput] = useState<LeasePaymentRecord['paymentMethod']>('bank_transfer');
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentBankInput, setPaymentBankInput] = useState('');
  const [paymentNotesInput, setPaymentNotesInput] = useState('');

  // Payment Statement / History Modal
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [statementTargetLease, setStatementTargetLease] = useState<StationLease | null>(null);

  // Load Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Warehouses / Stations
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, name, location')
        .order('name');
      if (whData && whData.length > 0) {
        setStations(whData);
      }

      // 2. Leases from system_settings or localStorage
      let loaded: StationLease[] = [];
      const { data: settingsData, error: settingsErr } = await supabase
        .from('system_settings')
        .select('notifications')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (!settingsErr && settingsData?.notifications?.station_leases && Array.isArray(settingsData.notifications.station_leases)) {
        loaded = settingsData.notifications.station_leases;
      } else {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('alnoor_station_leases_data');
          if (cached) {
            try {
              loaded = JSON.parse(cached);
            } catch (e) {
              console.error('Failed to parse cached station leases', e);
            }
          }
        }
      }

      if (loaded.length === 0) {
        loaded = INITIAL_DEFAULT_LEASES;
        await persistLeases(INITIAL_DEFAULT_LEASES, false);
      }

      setLeases(loaded);
    } catch (err: any) {
      console.error('Error fetching station leases:', err);
      showToast('⚠️ تعذر تحميل العقود من الخادم، جاري استخدام النسخة المحلية', 'warning');
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('alnoor_station_leases_data');
        if (cached) {
          try {
            setLeases(JSON.parse(cached));
          } catch {
            setLeases(INITIAL_DEFAULT_LEASES);
          }
        } else {
          setLeases(INITIAL_DEFAULT_LEASES);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist to Supabase and LocalStorage
  const persistLeases = async (updatedList: StationLease[], showFeedback = true) => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('alnoor_station_leases_data', JSON.stringify(updatedList));
      }

      const { data: currentSettings } = await supabase
        .from('system_settings')
        .select('notifications')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      const updatedNotifications = {
        ...(currentSettings?.notifications || {}),
        station_leases: updatedList,
        lastLeasesUpdated: new Date().toISOString()
      };

      const { error: upsertErr } = await supabase
        .from('system_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          notifications: updatedNotifications,
          updated_at: new Date().toISOString()
        });

      if (upsertErr) {
        console.warn('Could not save station_leases in Supabase, stored locally:', upsertErr);
      }

      setLeases(updatedList);
      if (showFeedback) {
        showToast('✅ تم حفظ بيانات عقد الإيجار بنجاح', 'success');
      }
      return true;
    } catch (e: any) {
      console.error('Failed to save leases:', e);
      if (showFeedback) {
        showToast('❌ حدث خطأ أثناء الحفظ: ' + (e.message || ''), 'error');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Recalculate installments and totals
  const calculatedLeases: CalculatedStationLease[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return leases.map((lease) => {
      let leaseTotalPaid = 0;
      let overdueCount = 0;
      let upcomingCount = 0;

      // Recalculate each installment
      const updatedInstallments = (lease.installments || []).map((inst) => {
        const totalPaidForInst = (inst.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
        const rem = Math.max(0, Number(inst.dueAmount || 0) - totalPaidForInst);
        leaseTotalPaid += totalPaidForInst;

        let daysUntil = 0;
        if (inst.dueDate) {
          const due = new Date(inst.dueDate);
          due.setHours(0, 0, 0, 0);
          daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }

        let st: LeaseInstallment['status'] = 'pending';
        if (rem <= 0.01) {
          st = 'paid';
        } else if (totalPaidForInst > 0) {
          st = daysUntil < 0 ? 'overdue' : 'partial';
        } else if (daysUntil < 0) {
          st = 'overdue';
        } else {
          st = 'pending';
        }

        if (st === 'overdue') overdueCount++;
        if ((st === 'pending' || st === 'partial') && daysUntil >= 0 && daysUntil <= 30) {
          upcomingCount++;
        }

        return {
          ...inst,
          paidAmount: totalPaidForInst,
          remainingAmount: rem,
          status: st,
          daysUntilDue: daysUntil
        };
      });

      const totalAnnual = Number(lease.annualRent || 0);
      const totalRem = Math.max(0, totalAnnual - leaseTotalPaid);
      const progress = totalAnnual > 0 ? Math.min(100, Math.round((leaseTotalPaid / totalAnnual) * 100)) : 100;

      // Contract Expiry
      let daysUntilExpiry = 0;
      let contractStatus: CalculatedStationLease['contractStatus'] = 'active';
      if (lease.endDate) {
        const end = new Date(lease.endDate);
        end.setHours(0, 0, 0, 0);
        daysUntilExpiry = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 0) {
          contractStatus = 'expired';
        } else if (daysUntilExpiry <= 60) {
          contractStatus = 'expiring_soon';
        } else {
          contractStatus = 'active';
        }
      }

      return {
        ...lease,
        installments: updatedInstallments,
        totalPaid: leaseTotalPaid,
        totalRemaining: totalRem,
        paymentProgress: progress,
        daysUntilContractExpiry: daysUntilExpiry,
        contractStatus,
        overdueInstallmentsCount: overdueCount,
        upcomingInstallmentsCount: upcomingCount
      };
    });
  }, [leases]);

  // Filtered Leases
  const filteredLeases = useMemo(() => {
    return calculatedLeases.filter((l) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchStation = l.stationName?.toLowerCase().includes(q);
        const matchLessor = l.lessorName?.toLowerCase().includes(q);
        const matchNum = l.contractNumber?.toLowerCase().includes(q);
        if (!matchStation && !matchLessor && !matchNum) return false;
      }

      // Station filter
      if (selectedStationFilter !== 'all') {
        if (l.stationId !== selectedStationFilter && l.stationId !== 'all') {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter === 'has_due') {
        if (l.totalRemaining <= 0) return false;
      } else if (selectedStatusFilter === 'completed') {
        if (l.totalRemaining > 0) return false;
      } else if (selectedStatusFilter === 'overdue') {
        if (l.overdueInstallmentsCount === 0) return false;
      }

      return true;
    });
  }, [calculatedLeases, searchQuery, selectedStationFilter, selectedStatusFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalContracts = calculatedLeases.length;
    const totalAnnualRents = calculatedLeases.reduce((sum, l) => sum + Number(l.annualRent || 0), 0);
    const totalPaidAll = calculatedLeases.reduce((sum, l) => sum + Number(l.totalPaid || 0), 0);
    const totalRemainingAll = calculatedLeases.reduce((sum, l) => sum + Number(l.totalRemaining || 0), 0);
    const overallProgress = totalAnnualRents > 0 ? Math.round((totalPaidAll / totalAnnualRents) * 100) : 100;

    // All upcoming/overdue installments across all leases
    const urgentPaymentsList: {
      leaseId: string;
      leaseName: string;
      lessorName: string;
      installment: LeaseInstallment;
    }[] = [];

    calculatedLeases.forEach((l) => {
      (l.installments || []).forEach((inst) => {
        if (inst.status === 'overdue' || (inst.status !== 'paid' && inst.daysUntilDue <= 30)) {
          urgentPaymentsList.push({
            leaseId: l.id,
            leaseName: l.stationName,
            lessorName: l.lessorName,
            installment: inst
          });
        }
      });
    });

    urgentPaymentsList.sort((a, b) => a.installment.daysUntilDue - b.installment.daysUntilDue);

    return {
      totalContracts,
      totalAnnualRents,
      totalPaidAll,
      totalRemainingAll,
      overallProgress,
      urgentPaymentsList
    };
  }, [calculatedLeases]);

  // Actions: Add / Edit
  const handleOpenAddModal = () => {
    const now = new Date();
    const nextYear = new Date(now);
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    const startStr = now.toISOString().split('T')[0];
    const endStr = nextYear.toISOString().split('T')[0];
    const defaultRent = 120000;
    const insts = generateDefaultInstallments(startStr, endStr, defaultRent, 'semi_annual');

    setEditingLease({
      id: 'lease-' + Date.now(),
      stationId: stations[0]?.id || 'all',
      stationName: stations[0]?.name || 'المحطة الأولى',
      contractNumber: '',
      lessorName: '',
      lessorPhone: '',
      startDate: startStr,
      endDate: endStr,
      annualRent: defaultRent,
      paymentFrequency: 'semi_annual',
      notes: '',
      installments: insts
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (lease: StationLease) => {
    setEditingLease(JSON.parse(JSON.stringify(lease)));
    setIsAddEditModalOpen(true);
  };

  const handleSaveLease = async (leaseToSave: StationLease) => {
    if (!leaseToSave.stationName) {
      showToast('⚠️ يرجى تحديد محطة الوقود', 'warning');
      return;
    }
    if (!leaseToSave.lessorName.trim()) {
      showToast('⚠️ يرجى إدخال اسم المالك / المؤجر', 'warning');
      return;
    }
    if (!leaseToSave.annualRent || leaseToSave.annualRent <= 0) {
      showToast('⚠️ يرجى إدخال قيمة الإيجار السنوي بالريال', 'warning');
      return;
    }

    // Resolve station name if matched
    if (leaseToSave.stationId !== 'all') {
      const matchSt = stations.find((s) => s.id === leaseToSave.stationId);
      if (matchSt) leaseToSave.stationName = matchSt.name;
    }

    const exists = leases.some((l) => l.id === leaseToSave.id);
    let updated: StationLease[];
    if (exists) {
      updated = leases.map((l) =>
        l.id === leaseToSave.id ? { ...leaseToSave, updatedAt: new Date().toISOString() } : l
      );
    } else {
      updated = [
        ...leases,
        { ...leaseToSave, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
    }

    const ok = await persistLeases(updated);
    if (ok) {
      setIsAddEditModalOpen(false);
      setEditingLease(null);
    }
  };

  const handleDeleteLease = async (id: string, name: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`هل أنت متأكد من حذف عقد إيجار: "${name}"؟`)) {
      return;
    }

    const updated = leases.filter((l) => l.id !== id);
    await persistLeases(updated);
    showToast(`🗑️ تم حذف عقد إيجار "${name}"`, 'success');
  };

  // Actions: Record Payment
  const handleOpenPaymentModal = (lease: StationLease, installment?: LeaseInstallment) => {
    setPaymentTargetLease(lease);

    // If installment specified, use it; otherwise find first unpaid installment
    let targetInst = installment;
    if (!targetInst) {
      targetInst = lease.installments.find((i) => i.status !== 'paid') || lease.installments[0];
    }

    setPaymentTargetInstallment(targetInst || null);
    setPaymentAmountInput(targetInst ? Number(targetInst.remainingAmount || targetInst.dueAmount || 0) : 0);
    setPaymentDateInput(new Date().toISOString().split('T')[0]);
    setPaymentMethodInput('bank_transfer');
    setPaymentRefInput('');
    setPaymentBankInput('مصرف الراجحي');
    setPaymentNotesInput('');
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = async () => {
    if (!paymentTargetLease || !paymentTargetInstallment) return;
    if (!paymentAmountInput || paymentAmountInput <= 0) {
      showToast('⚠️ يرجى إدخال مبلغ سداد صحيح', 'warning');
      return;
    }

    const newPaymentRecord: LeasePaymentRecord = {
      id: 'pay-' + Date.now(),
      installmentId: paymentTargetInstallment.id,
      amount: Number(paymentAmountInput),
      paymentDate: paymentDateInput,
      paymentMethod: paymentMethodInput,
      referenceNumber: paymentRefInput.trim(),
      bankName: paymentBankInput.trim(),
      notes: paymentNotesInput.trim(),
      recordedAt: new Date().toISOString()
    };

    // Update the specific installment in the lease
    const updatedInstallments = paymentTargetLease.installments.map((inst) => {
      if (inst.id === paymentTargetInstallment.id) {
        const newPayments = [...(inst.payments || []), newPaymentRecord];
        const newPaidAmount = newPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const newRemaining = Math.max(0, Number(inst.dueAmount || 0) - newPaidAmount);
        return {
          ...inst,
          paidAmount: newPaidAmount,
          remainingAmount: newRemaining,
          status: (newRemaining <= 0 ? 'paid' : 'partial') as LeaseInstallment['status'],
          payments: newPayments
        };
      }
      return inst;
    });

    const updatedLease: StationLease = {
      ...paymentTargetLease,
      installments: updatedInstallments,
      updatedAt: new Date().toISOString()
    };

    const updatedAllLeases = leases.map((l) => (l.id === updatedLease.id ? updatedLease : l));
    const ok = await persistLeases(updatedAllLeases);
    if (ok) {
      showToast(`🎉 تم تسجيل سداد مبلغ ${Number(paymentAmountInput).toLocaleString()} ريال بنجاح!`, 'success');
      setIsPaymentModalOpen(false);
      setPaymentTargetLease(null);
      setPaymentTargetInstallment(null);
    }
  };

  // Actions: Delete Payment Record
  const handleDeletePaymentRecord = async (leaseId: string, installmentId: string, paymentId: string) => {
    if (typeof window !== 'undefined' && !window.confirm('هل أنت متأكد من إلغاء عملية السداد هذه؟')) {
      return;
    }

    const targetLease = leases.find((l) => l.id === leaseId);
    if (!targetLease) return;

    const updatedInsts = targetLease.installments.map((inst) => {
      if (inst.id === installmentId) {
        const filteredPayments = (inst.payments || []).filter((p) => p.id !== paymentId);
        const newPaid = filteredPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const newRem = Math.max(0, Number(inst.dueAmount || 0) - newPaid);
        return {
          ...inst,
          paidAmount: newPaid,
          remainingAmount: newRem,
          status: (newRem <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'pending')) as LeaseInstallment['status'],
          payments: filteredPayments
        };
      }
      return inst;
    });

    const updatedLease = { ...targetLease, installments: updatedInsts, updatedAt: new Date().toISOString() };
    const updatedAll = leases.map((l) => (l.id === updatedLease.id ? updatedLease : l));
    await persistLeases(updatedAll);
    showToast('🗑️ تم إلغاء عملية السداد وتحديث الرصيد المتبقي', 'success');

    // Also update modal target if open
    if (statementTargetLease?.id === leaseId) {
      setStatementTargetLease(updatedLease);
    }
  };

  // Actions: Open Statement Modal
  const handleOpenStatementModal = (lease: StationLease) => {
    setStatementTargetLease(lease);
    setIsStatementModalOpen(true);
  };

  return {
    leases: filteredLeases,
    rawLeases: calculatedLeases,
    stations,
    stats,
    isLoading,
    isSaving,
    searchQuery,
    setSearchQuery,
    selectedStationFilter,
    setSelectedStationFilter,
    selectedStatusFilter,
    setSelectedStatusFilter,
    isAddEditModalOpen,
    setIsAddEditModalOpen,
    editingLease,
    setEditingLease,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    paymentTargetLease,
    paymentTargetInstallment,
    setPaymentTargetInstallment,
    paymentAmountInput,
    setPaymentAmountInput,
    paymentDateInput,
    setPaymentDateInput,
    paymentMethodInput,
    setPaymentMethodInput,
    paymentRefInput,
    setPaymentRefInput,
    paymentBankInput,
    setPaymentBankInput,
    paymentNotesInput,
    setPaymentNotesInput,
    isStatementModalOpen,
    setIsStatementModalOpen,
    statementTargetLease,
    handleOpenAddModal,
    handleOpenEditModal,
    handleSaveLease,
    handleDeleteLease,
    handleOpenPaymentModal,
    handleExecutePayment,
    handleDeletePaymentRecord,
    handleOpenStatementModal,
    refresh: fetchData
  };
}
