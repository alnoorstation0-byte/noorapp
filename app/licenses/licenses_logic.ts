"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast-context';

export interface RequiredDoc {
  id: string;
  name: string;
  isReady: boolean;
  notes?: string;
}

export interface LicenseItem {
  id: string;
  name: string;
  category: 
    | 'municipal' 
    | 'civil_defense' 
    | 'energy' 
    | 'calibration' 
    | 'commercial' 
    | 'tax_zakat' 
    | 'insurance' 
    | 'labor' 
    | 'environment' 
    | 'lease' 
    | 'transport' 
    | 'other';
  authority: string;
  licenseNumber: string;
  stationId?: string; // ID of warehouse or 'all'
  stationName?: string;
  issueDate?: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  alertDaysBefore: number; // e.g. 30, 45, 60, 90
  documentsRequired: RequiredDoc[];
  notes?: string;
  attachmentUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LicenseCalculated extends LicenseItem {
  daysRemaining: number;
  status: 'active' | 'expiring_soon' | 'expired';
  docsProgress: {
    total: number;
    ready: number;
    percent: number;
  };
}

export const SAUDI_LICENSE_TEMPLATES: {
  name: string;
  category: LicenseItem['category'];
  authority: string;
  defaultAlertDays: number;
  icon: string;
  description: string;
  defaultDocs: string[];
}[] = [
  {
    name: 'رخصة البلدية والأنشطة التجارية للمحطة',
    category: 'municipal',
    authority: 'وزارة البلديات والإسكان (منصة بلدي)',
    defaultAlertDays: 60,
    icon: '🏛️',
    description: 'الرخصة الأساسية لممارسة نشاط بيع المحروقات وتشغيل المحطة والمرافق التابعة لها.',
    defaultDocs: [
      'صورة عقد الإيجار ساري وموثق أو صك الملكية الإلكتروني',
      'ترخيص السلامة من الدفاع المدني (ساري المفعول)',
      'صورة اللوحة والواجهة الخارجية للمحطة',
      'الشهادات الصحية للعمالة (في حال وجود متجر تموينات تابع)',
      'سداد الرسوم البلدية المقررة عبر سداد'
    ]
  },
  {
    name: 'ترخيص السلامة والوقاية من الحريق',
    category: 'civil_defense',
    authority: 'المديرية العامة للدفاع المدني (منصة سلامة)',
    defaultAlertDays: 45,
    icon: '🚒',
    description: 'ترخيص السلامة واشتراطات أجهزة الإطفاء ومنظومة الوقاية من الحريق بالخزانات والمضخات.',
    defaultDocs: [
      'عقد صيانة دوري ساري مع شركة سلامة معتمدة لدى الدفاع المدني',
      'تقرير فحص واختبار أجهزة الإطفاء الآلية واليدوية وحساسات اللهب',
      'شهادة معايرة واختبار صمامات قطع الوقود الاضطراري',
      'سداد المقابل المالي للتجديد في منصة سلامة'
    ]
  },
  {
    name: 'رخصة تأهيل وتشغيل محطة الوقود',
    category: 'energy',
    authority: 'وزارة الطاقة',
    defaultAlertDays: 90,
    icon: '⚡',
    description: 'شهادة تأهيل محطات الوقود ومراكز الخدمة وفق معايير اللائحة الفنية الصادرة من وزارة الطاقة.',
    defaultDocs: [
      'رخصة بلدي سارية ومطابقة للأنشطة',
      'ترخيص الدفاع المدني ساري',
      'تقرير الفحص الدوري لمنع تسرب الوقود ونظام استرجاع الأبخرة',
      'شهادة فحص دوري للخزانات والمضخات الأرضية',
      'كشف بكافة عدادات ومضخات الوقود وأرقامها التسلسلية'
    ]
  },
  {
    name: 'شهادة معايرة وفحص مضخات الوقود',
    category: 'calibration',
    authority: 'الهيئة السعودية للمواصفات والمقاييس (منصة تقييس)',
    defaultAlertDays: 30,
    icon: '📟',
    description: 'شهادة التحقق الدوري والمعايرة المعتمدة لمضخات الوقود لضمان صحة كمية اللترات وصلاحية المضخات.',
    defaultDocs: [
      'حجز موعد الزيارة الميدانية عبر منصة تقييس',
      'إجراء المعايرة الميدانية لجميع مسدسات ومضخات البنزين والديزل',
      'تركيب ملصقات التحقق الخضراء الجديدة على المضخات',
      'سداد فاتورة خدمة المعايرة'
    ]
  },
  {
    name: 'السجل التجاري للمنشأة / الفرع',
    category: 'commercial',
    authority: 'وزارة التجارة',
    defaultAlertDays: 30,
    icon: '📄',
    description: 'القيد التجاري الرسمي الموثق للمنشأة أو فروع محطات الوقود التابعة.',
    defaultDocs: [
      'تسديد المقابل المالي لتجديد السجل التجاري',
      'تحديث بيانات الاتصال والعنوان الوطني',
      'التأكد من عدم وجود مخالفات أو قيود تجارية معلقة'
    ]
  },
  {
    name: 'شهادة الزكاة والضريبة والجمارك',
    category: 'tax_zakat',
    authority: 'هيئة الزكاة والضريبة والجمارك (ZATCA)',
    defaultAlertDays: 30,
    icon: '⚖️',
    description: 'شهادة التسجيل والالتزام بتقديم الإقرارات الزكوية وضريبة القيمة المضافة والفوترة الإلكترونية.',
    defaultDocs: [
      'تقديم الإقرارات الضريبية الدورية وسداد المستحقات',
      'تقديم الإقرار الزكوي والحسابات الختامية السنوية',
      'التحقق من ربط الفوترة الإلكترونية (مرحلة الربط والتكامل)'
    ]
  },
  {
    name: 'شهادة التأمينات الاجتماعية',
    category: 'insurance',
    authority: 'المؤسسة العامة للتأمينات الاجتماعية (GOSI)',
    defaultAlertDays: 30,
    icon: '🛡️',
    description: 'شهادة الالتزام والانتظام في سداد اشتراكات العاملين بالمنشأة والمحطات.',
    defaultDocs: [
      'سداد فواتير الاشتراكات الشهرية لجميع عمال المحطة',
      'تحديث أجور وبيانات العمال والمشغلين في التأمينات',
      'استخراج شهادة الالتزام الإلكترونية بعد السداد'
    ]
  },
  {
    name: 'شهادة السعودة ونسب التوطين',
    category: 'labor',
    authority: 'وزارة الموارد البشرية والتنمية الاجتماعية (منصة قوى)',
    defaultAlertDays: 30,
    icon: '👥',
    description: 'شهادة التوطين وتحقيق النسب المقررة لنطاقات في وظائف إدارة وتشغيل محطات الوقود.',
    defaultDocs: [
      'التأكد من وقوع المنشأة في النطاق الأخضر المرتفع أو البلاتيني',
      'توثيق عقود جميع الموظفين إلكترونياً على منصة قوى',
      'الالتزام بنظام حماية الأجور وصرف الرواتب'
    ]
  },
  {
    name: 'التصريح والالتزام البيئي للمحطة',
    category: 'environment',
    authority: 'المركز الوطني للرقابة على الالتزام البيئي',
    defaultAlertDays: 60,
    icon: '🌱',
    description: 'شهادة التصريح البيئي وضمان عدم تسرب المشتقات البترولية للمياه الجوفية والتخلص الآمن من الزيوت.',
    defaultDocs: [
      'تقرير الفحص الهيدروستاتيكي أو الإلكتروني لجدران الخزانات',
      'عقد التخلص من الزيوت والمخلفات البترولية مع شركة تدوير معتمدة',
      'سداد المقابل المالي للتصريح البيئي'
    ]
  },
  {
    name: 'عقد إيجار المحطة / الأرض',
    category: 'lease',
    authority: 'الشبكة الإلكترونية لخدمات الإيجار (إيجار)',
    defaultAlertDays: 60,
    icon: '🏢',
    description: 'عقد الإيجار التجاري الموحد الموثق لموقع محطة الوقود والمباني التابعة لها.',
    defaultDocs: [
      'التواصل مع المالك لتجديد مدة العقد والاتفاق على القيمة',
      'توثيق العقد المحدث عبر منصة إيجار وسداد رسوم التوثيق',
      'سداد الدفعة الإيجارية المترتبة'
    ]
  },
  {
    name: 'بطاقات تشغيل صهاريج نقل الوقود',
    category: 'transport',
    authority: 'الهيئة العامة للنقل (منصة وصل / بوابة نقل)',
    defaultAlertDays: 45,
    icon: '🚛',
    description: 'بطاقة التشغيل والتصريح المعتمد لنقل المواد البترولية والخطرة عبر الصهاريج الخاصة بالمحطة.',
    defaultDocs: [
      'الفحص الفني الدوري للشاحنة والصهريج ساري المفعول',
      'وثيقة تأمين سارية على المركبة وحمولتها',
      'رخصة نقل مواد خطرة سارية للسائق',
      'ربط الشاحنة بنظام التتبع الآلي المعتمد (منصة وصل)'
    ]
  }
];

const INITIAL_DEFAULT_LICENSES: LicenseItem[] = [
  {
    id: 'lic-init-1',
    name: 'رخصة البلدية والأنشطة التجارية - المحطة الرئيسية',
    category: 'municipal',
    authority: 'وزارة البلديات والإسكان (منصة بلدي)',
    licenseNumber: 'BLD-441098231',
    stationId: 'all',
    stationName: 'جميع المحطات / المركز الرئيسي',
    issueDate: new Date(Date.now() - 300 * 86400000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 42 * 86400000).toISOString().split('T')[0], // قارب على الانتهاء
    alertDaysBefore: 60,
    documentsRequired: [
      { id: 'd1', name: 'عقد الإيجار ساري وموثق عبر منصة إيجار', isReady: true },
      { id: 'd2', name: 'رخصة الدفاع المدني سارية المفعول', isReady: true },
      { id: 'd3', name: 'شهادات صحية لعمال التموينات إن وجد', isReady: false, notes: 'متبقي فحص عامل واحد' },
      { id: 'd4', name: 'سداد رسوم بلدي عبر منصة سداد', isReady: false, notes: 'بانتظار إصدار الفاتورة' }
    ],
    notes: 'الرخصة الأساسية للتشغيل، يجب إنهاء سداد الرسوم قبل 3 أسابيع لتجنب الإغلاق'
  },
  {
    id: 'lic-init-2',
    name: 'ترخيص السلامة ومكافحة الحريق (سلامة)',
    category: 'civil_defense',
    authority: 'المديرية العامة للدفاع المدني (منصة سلامة)',
    licenseNumber: 'CD-98321045',
    stationId: 'all',
    stationName: 'المحطة الأولى',
    issueDate: new Date(Date.now() - 340 * 86400000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 18 * 86400000).toISOString().split('T')[0], // إنذار عاجل!
    alertDaysBefore: 45,
    documentsRequired: [
      { id: 'd1', name: 'عقد صيانة دوري ساري مع شركة سلامة معتمدة', isReady: true },
      { id: 'd2', name: 'تقرير فحص واختبار أجهزة الإطفاء وحساسات الغاز', isReady: false, notes: 'مطلوب فحص فني يوم الخميس' },
      { id: 'd3', name: 'سداد المقابل المالي لمنصة سلامة', isReady: false }
    ],
    notes: 'هام جداً: متبقي أقل من 20 يوماً ويجب تسليم التقرير الفني'
  },
  {
    id: 'lic-init-3',
    name: 'شهادة معايرة وفحص مضخات الوقود (تقييس)',
    category: 'calibration',
    authority: 'الهيئة السعودية للمواصفات والمقاييس (تقييس)',
    licenseNumber: 'TAQ-2025-8831',
    stationId: 'all',
    stationName: 'المحطة الأولى',
    issueDate: new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 140 * 86400000).toISOString().split('T')[0], // ساري
    alertDaysBefore: 30,
    documentsRequired: [
      { id: 'd1', name: 'حجز موعد عبر منصة تقييس', isReady: true },
      { id: 'd2', name: 'إتمام المعايرة الميدانية لجميع مسدسات الوقود', isReady: true },
      { id: 'd3', name: 'تركيب ملصقات تقييس الخضراء المعتمدة', isReady: true }
    ],
    notes: 'تمت المعايرة بنجاح وجميع المضخات مطابقة تماماً للنسب القانونية'
  },
  {
    id: 'lic-init-4',
    name: 'السجل التجاري الرئيسي للمنشأة',
    category: 'commercial',
    authority: 'وزارة التجارة',
    licenseNumber: '1010892019',
    stationId: 'all',
    stationName: 'المركز الرئيسي',
    issueDate: new Date(Date.now() - 400 * 86400000).toISOString().split('T')[0],
    expiryDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], // منتهي!
    alertDaysBefore: 30,
    documentsRequired: [
      { id: 'd1', name: 'تسديد الرسوم عبر البنك / منصة الأعمال', isReady: false },
      { id: 'd2', name: 'تحديث العنوان الوطني', isReady: true }
    ],
    notes: 'السجل التجاري انتهى قبل 5 أيام، يلزم التجديد الفوري خلال هذا الأسبوع'
  }
];

export function useLicensesLogic() {
  const { showToast } = useToast();
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [stations, setStations] = useState<{ id: string; name: string; location?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStationFilter, setSelectedStationFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingLicense, setEditingLicense] = useState<LicenseItem | null>(null);

  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [activeChecklistLicense, setActiveChecklistLicense] = useState<LicenseItem | null>(null);

  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewLicenseTarget, setRenewLicenseTarget] = useState<LicenseItem | null>(null);
  const [newRenewExpiryDate, setNewRenewExpiryDate] = useState('');

  // Fetch stations (warehouses) and licenses
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch stations/warehouses
      const { data: whData } = await supabase
        .from('warehouses')
        .select('id, name, location')
        .order('name');

      if (whData && whData.length > 0) {
        setStations(whData);
      }

      // 2. Fetch licenses from system_settings or localStorage
      let loadedLicenses: LicenseItem[] = [];
      const { data: settingsData, error: settingsErr } = await supabase
        .from('system_settings')
        .select('notifications')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      if (!settingsErr && settingsData?.notifications?.licenses && Array.isArray(settingsData.notifications.licenses)) {
        loadedLicenses = settingsData.notifications.licenses;
      } else {
        // Check local storage fallback
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem('alnoor_licenses_data');
          if (cached) {
            try {
              loadedLicenses = JSON.parse(cached);
            } catch (e) {
              console.error('Failed to parse cached licenses', e);
            }
          }
        }
      }

      // If still empty, use standard Saudi gas station default templates
      if (loadedLicenses.length === 0) {
        loadedLicenses = INITIAL_DEFAULT_LICENSES;
        // Persist defaults
        await persistLicenses(INITIAL_DEFAULT_LICENSES, false);
      }

      setLicenses(loadedLicenses);
    } catch (err: any) {
      console.error('Error fetching licenses data:', err);
      showToast('⚠️ تعذر تحميل التراخيص من الخادم، جاري استخدام النسخة المحلية', 'warning');
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('alnoor_licenses_data');
        if (cached) {
          try {
            setLicenses(JSON.parse(cached));
          } catch (e) {
            setLicenses(INITIAL_DEFAULT_LICENSES);
          }
        } else {
          setLicenses(INITIAL_DEFAULT_LICENSES);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist licenses to Supabase system_settings and localStorage
  const persistLicenses = async (updatedList: LicenseItem[], showFeedback = true) => {
    setIsSaving(true);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('alnoor_licenses_data', JSON.stringify(updatedList));
      }

      // Read current notifications jsonb to preserve other fields
      const { data: currentSettings } = await supabase
        .from('system_settings')
        .select('notifications')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .maybeSingle();

      const updatedNotifications = {
        ...(currentSettings?.notifications || {}),
        licenses: updatedList,
        lastLicensesUpdated: new Date().toISOString()
      };

      const { error: upsertErr } = await supabase
        .from('system_settings')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          notifications: updatedNotifications,
          updated_at: new Date().toISOString()
        });

      if (upsertErr) {
        console.warn('Could not save to system_settings in Supabase, saved locally:', upsertErr);
      }

      setLicenses(updatedList);
      if (showFeedback) {
        showToast('✅ تم حفظ بيانات الترخيص بنجاح', 'success');
      }
      return true;
    } catch (error: any) {
      console.error('Failed to save license:', error);
      if (showFeedback) {
        showToast('❌ حدث خطأ أثناء الحفظ: ' + (error.message || ''), 'error');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate days remaining and status for each license
  const calculatedLicenses: LicenseCalculated[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return licenses.map((item) => {
      let daysRemaining = 0;
      let status: 'active' | 'expiring_soon' | 'expired' = 'active';

      if (item.expiryDate) {
        const expiry = new Date(item.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const diffMs = expiry.getTime() - today.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          status = 'expired';
        } else if (daysRemaining <= (item.alertDaysBefore || 30)) {
          status = 'expiring_soon';
        } else {
          status = 'active';
        }
      }

      const totalDocs = item.documentsRequired?.length || 0;
      const readyDocs = item.documentsRequired?.filter((d) => d.isReady).length || 0;
      const percent = totalDocs > 0 ? Math.round((readyDocs / totalDocs) * 100) : 100;

      return {
        ...item,
        daysRemaining,
        status,
        docsProgress: {
          total: totalDocs,
          ready: readyDocs,
          percent
        }
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining); // Nearest expiry first
  }, [licenses]);

  // Filtered licenses
  const filteredLicenses = useMemo(() => {
    return calculatedLicenses.filter((lic) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = lic.name?.toLowerCase().includes(q);
        const matchNum = lic.licenseNumber?.toLowerCase().includes(q);
        const matchAuth = lic.authority?.toLowerCase().includes(q);
        const matchStation = lic.stationName?.toLowerCase().includes(q);
        if (!matchName && !matchNum && !matchAuth && !matchStation) return false;
      }

      // Station filter
      if (selectedStationFilter !== 'all') {
        if (lic.stationId !== selectedStationFilter && lic.stationId !== 'all') {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'all') {
        if (lic.status !== selectedStatusFilter) return false;
      }

      // Category filter
      if (selectedCategoryFilter !== 'all') {
        if (lic.category !== selectedCategoryFilter) return false;
      }

      return true;
    });
  }, [calculatedLicenses, searchQuery, selectedStationFilter, selectedStatusFilter, selectedCategoryFilter]);

  // Overall Statistics
  const stats = useMemo(() => {
    const total = calculatedLicenses.length;
    const active = calculatedLicenses.filter((l) => l.status === 'active').length;
    const expiringSoon = calculatedLicenses.filter((l) => l.status === 'expiring_soon').length;
    const expired = calculatedLicenses.filter((l) => l.status === 'expired').length;

    // Urgent items (expired or expiring within 30 days)
    const urgentList = calculatedLicenses.filter(
      (l) => l.status === 'expired' || (l.status === 'expiring_soon' && l.daysRemaining <= 30)
    );

    return {
      total,
      active,
      expiringSoon,
      expired,
      urgentList
    };
  }, [calculatedLicenses]);

  // Actions
  const handleOpenAddModal = (template?: typeof SAUDI_LICENSE_TEMPLATES[0]) => {
    if (template) {
      setEditingLicense({
        id: 'lic-' + Date.now(),
        name: template.name,
        category: template.category,
        authority: template.authority,
        licenseNumber: '',
        stationId: 'all',
        stationName: 'جميع الفروع / المركز الرئيسي',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        alertDaysBefore: template.defaultAlertDays,
        documentsRequired: template.defaultDocs.map((doc, idx) => ({
          id: `doc-${idx + 1}`,
          name: doc,
          isReady: false
        })),
        notes: template.description
      });
    } else {
      setEditingLicense({
        id: 'lic-' + Date.now(),
        name: '',
        category: 'municipal',
        authority: '',
        licenseNumber: '',
        stationId: 'all',
        stationName: 'جميع الفروع / المركز الرئيسي',
        issueDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        alertDaysBefore: 30,
        documentsRequired: [],
        notes: ''
      });
    }
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (lic: LicenseItem) => {
    setEditingLicense(JSON.parse(JSON.stringify(lic)));
    setIsAddEditModalOpen(true);
  };

  const handleSaveLicense = async (licToSave: LicenseItem) => {
    if (!licToSave.name.trim()) {
      showToast('⚠️ يرجى إدخال مسمى الترخيص', 'warning');
      return;
    }
    if (!licToSave.expiryDate) {
      showToast('⚠️ يرجى تحديد تاريخ انتهاء الترخيص', 'warning');
      return;
    }

    // Resolve station name
    if (licToSave.stationId === 'all') {
      licToSave.stationName = 'جميع الفروع / المركز الرئيسي';
    } else {
      const matched = stations.find((s) => s.id === licToSave.stationId);
      if (matched) licToSave.stationName = matched.name;
    }

    const exists = licenses.some((l) => l.id === licToSave.id);
    let updated: LicenseItem[];
    if (exists) {
      updated = licenses.map((l) =>
        l.id === licToSave.id ? { ...licToSave, updatedAt: new Date().toISOString() } : l
      );
    } else {
      updated = [
        ...licenses,
        { ...licToSave, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      ];
    }

    const success = await persistLicenses(updated);
    if (success) {
      setIsAddEditModalOpen(false);
      setEditingLicense(null);
    }
  };

  const handleDeleteLicense = async (id: string, name: string) => {
    if (typeof window !== 'undefined' && !window.confirm(`هل أنت متأكد من حذف الترخيص: "${name}"؟`)) {
      return;
    }

    const updated = licenses.filter((l) => l.id !== id);
    await persistLicenses(updated);
    showToast(`🗑️ تم حذف ترخيص "${name}"`, 'success');
  };

  // Checklist Actions
  const handleOpenChecklistModal = (lic: LicenseItem) => {
    setActiveChecklistLicense(JSON.parse(JSON.stringify(lic)));
    setIsChecklistModalOpen(true);
  };

  const handleToggleDocReady = async (docId: string) => {
    if (!activeChecklistLicense) return;

    const updatedDocs = (activeChecklistLicense.documentsRequired || []).map((d) =>
      d.id === docId ? { ...d, isReady: !d.isReady } : d
    );

    const updatedItem = { ...activeChecklistLicense, documentsRequired: updatedDocs };
    setActiveChecklistLicense(updatedItem);

    const updatedAll = licenses.map((l) => (l.id === updatedItem.id ? updatedItem : l));
    await persistLicenses(updatedAll, false);
  };

  const handleAddDocToChecklist = async (docName: string) => {
    if (!activeChecklistLicense || !docName.trim()) return;

    const newDoc: RequiredDoc = {
      id: 'doc-' + Date.now(),
      name: docName.trim(),
      isReady: false
    };

    const updatedDocs = [...(activeChecklistLicense.documentsRequired || []), newDoc];
    const updatedItem = { ...activeChecklistLicense, documentsRequired: updatedDocs };
    setActiveChecklistLicense(updatedItem);

    const updatedAll = licenses.map((l) => (l.id === updatedItem.id ? updatedItem : l));
    await persistLicenses(updatedAll, false);
    showToast('➕ تم إضافة المستند إلى قائمة التجهيز', 'success');
  };

  const handleDeleteDocFromChecklist = async (docId: string) => {
    if (!activeChecklistLicense) return;

    const updatedDocs = (activeChecklistLicense.documentsRequired || []).filter((d) => d.id !== docId);
    const updatedItem = { ...activeChecklistLicense, documentsRequired: updatedDocs };
    setActiveChecklistLicense(updatedItem);

    const updatedAll = licenses.map((l) => (l.id === updatedItem.id ? updatedItem : l));
    await persistLicenses(updatedAll, false);
  };

  // Quick Renew Modal
  const handleOpenRenewModal = (lic: LicenseItem) => {
    setRenewLicenseTarget(lic);
    // Suggest 1 year from old expiry if future, or 1 year from today if expired
    const baseDate = new Date(lic.expiryDate);
    const today = new Date();
    const startFrom = baseDate > today ? baseDate : today;
    const nextYear = new Date(startFrom);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setNewRenewExpiryDate(nextYear.toISOString().split('T')[0]);
    setIsRenewModalOpen(true);
  };

  const handleExecuteRenew = async (resetDocs = false) => {
    if (!renewLicenseTarget || !newRenewExpiryDate) return;

    const updatedDocs = resetDocs
      ? (renewLicenseTarget.documentsRequired || []).map((d) => ({ ...d, isReady: false }))
      : renewLicenseTarget.documentsRequired;

    const updatedItem: LicenseItem = {
      ...renewLicenseTarget,
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: newRenewExpiryDate,
      documentsRequired: updatedDocs,
      updatedAt: new Date().toISOString()
    };

    const updatedAll = licenses.map((l) => (l.id === updatedItem.id ? updatedItem : l));
    const ok = await persistLicenses(updatedAll);
    if (ok) {
      showToast(`🎉 تم تجديد الترخيص "${renewLicenseTarget.name}" حتى ${newRenewExpiryDate}`, 'success');
      setIsRenewModalOpen(false);
      setRenewLicenseTarget(null);
    }
  };

  return {
    licenses: filteredLicenses,
    rawLicenses: calculatedLicenses,
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
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    isAddEditModalOpen,
    setIsAddEditModalOpen,
    editingLicense,
    setEditingLicense,
    isChecklistModalOpen,
    setIsChecklistModalOpen,
    activeChecklistLicense,
    isRenewModalOpen,
    setIsRenewModalOpen,
    renewLicenseTarget,
    newRenewExpiryDate,
    setNewRenewExpiryDate,
    handleOpenAddModal,
    handleOpenEditModal,
    handleSaveLicense,
    handleDeleteLicense,
    handleOpenChecklistModal,
    handleToggleDocReady,
    handleAddDocToChecklist,
    handleDeleteDocFromChecklist,
    handleOpenRenewModal,
    handleExecuteRenew,
    refresh: fetchData
  };
}
