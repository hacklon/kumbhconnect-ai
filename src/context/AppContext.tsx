'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'hi' | 'mr';

interface AppContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  highContrast: boolean;
  setHighContrast: (val: boolean) => void;
  isOnline: boolean;
  offlineReportsCount: number;
  setOfflineReportsCount: (count: number) => void;
  role: 'public' | 'volunteer' | 'police' | 'admin';
  setRole: (role: 'public' | 'volunteer' | 'police' | 'admin') => void;
  translate: (key: string) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    title: "KumbhConnect AI",
    tagline: "Nashik Mela 2027 Missing Persons Unified Registry",
    report_missing: "Report Missing Person",
    report_found: "Register Found Person",
    track_case: "Track Case Status",
    dashboard: "Operator Dashboard",
    language_label: "Language",
    accessibility: "Accessibility",
    high_contrast: "High Contrast Mode",
    normal_contrast: "Normal Contrast Mode",
    missing_form_title: "Report a Missing Pilgrim",
    found_form_title: "Report a Found Pilgrim",
    form_name: "Full Name",
    form_age: "Age Band",
    form_gender: "Gender",
    form_language: "Primary Language Spoken",
    form_state: "State of Origin",
    form_location: "Last Seen Location / Sighted Location",
    form_reporter_mobile: "Your Mobile Number",
    form_clothing: "Clothing Details",
    form_physical: "Physical Description",
    form_voice: "Record Voice Description (Optional)",
    form_photo: "Upload Photo",
    form_submit: "Submit Report",
    volunteer_title: "Volunteer Portal",
    police_title: "Police Booth Dashboard",
    admin_title: "State Command Center",
    connecting: "Connecting to live database...",
    offline_notice: "Running in Offline Mode. Reports will auto-sync on connection.",
    home: "Home",
    logout: "Log Out",
    welcome: "Welcome",
    status_pending: "Search in Progress",
    status_found: "Located",
    status_reunited: "Reunited"
  },
  hi: {
    title: "कुंभकनेक्ट AI",
    tagline: "नाशिक मेला 2027 लापता व्यक्ति एकीकृत रजिस्ट्री",
    report_missing: "लापता व्यक्ति की रिपोर्ट करें",
    report_found: "मिले हुए व्यक्ति की पंजीकरण करें",
    track_case: "केस की स्थिति ट्रैक करें",
    dashboard: "ऑपरेटर डैशबोर्ड",
    language_label: "भाषा",
    accessibility: "अभिगम्यता",
    high_contrast: "हाई कंट्रास्ट मोड",
    normal_contrast: "सामान्य कंट्रास्ट मोड",
    missing_form_title: "लापता तीर्थयात्री की रिपोर्ट",
    found_form_title: "मिले हुए तीर्थयात्री की रिपोर्ट",
    form_name: "पूरा नाम",
    form_age: "आयु वर्ग",
    form_gender: "लिंग",
    form_language: "मुख्य बोली जाने वाली भाषा",
    form_state: "मूल राज्य",
    form_location: "आखरी बार देखा गया स्थान",
    form_reporter_mobile: "आपका मोबाइल नंबर",
    form_clothing: "कपड़ों का विवरण",
    form_physical: "शारीरिक विवरण",
    form_voice: "आवाज विवरण रिकॉर्ड करें (वैकल्पिक)",
    form_photo: "फोटो अपलोड करें",
    form_submit: "रिपोर्ट दर्ज करें",
    volunteer_title: "स्वयंसेवक पोर्टल",
    police_title: "पुलिस बूथ डैशबोर्ड",
    admin_title: "राज्य कमांड सेंटर",
    connecting: "लाइव डेटाबेस से जुड़ रहा है...",
    offline_notice: "ऑफ़लाइन मोड में चल रहा है। कनेक्शन आने पर रिपोर्ट स्वतः सिंक हो जाएगी।",
    home: "होम",
    logout: "लॉग आउट",
    welcome: "स्वागत है",
    status_pending: "खोज जारी है",
    status_found: "मिल गए हैं",
    status_reunited: "परिवार से मिलवाया"
  },
  mr: {
    title: "कुंभकनेक्ट AI",
    tagline: "नाशिक मेळा २०२७ हरवलेल्या व्यक्तींची एकत्रित नोंदणी",
    report_missing: "हरवलेल्या व्यक्तीची नोंद करा",
    report_found: "सापडलेल्या व्यक्तीची नोंदणी करा",
    track_case: "केसची स्थिती तपासा",
    dashboard: "ऑपरेटर डॅशबोर्ड",
    language_label: "भाषा",
    accessibility: "अभिगम्यता",
    high_contrast: "हाय कंट्रास्ट मोड",
    normal_contrast: "सामान्य कंट्रास्ट मोड",
    missing_form_title: "हरवलेल्या भाविकाची माहिती",
    found_form_title: "सापडलेल्या भाविकाची माहिती",
    form_name: "पूर्ण नाव",
    form_age: "वय गट",
    form_gender: "लिंग",
    form_language: "मुख्य बोलली जाणारी भाषा",
    form_state: "मूळ राज्य",
    form_location: "शेवटचे पाहिलेले ठिकाण / सापडलेले ठिकाण",
    form_reporter_mobile: "तुमचा मोबाईल नंबर",
    form_clothing: "कपड्यांचा तपशील",
    form_physical: "शारीरिक वर्णन",
    form_voice: "आवाज वर्णन रेकॉर्ड करा (पर्यायी)",
    form_photo: "फोटो अपलोड करा",
    form_submit: "माहिती सबमिट करा",
    volunteer_title: "स्वयंसेवक पोर्टल",
    police_title: "पोलीस बूथ डॅशबोर्ड",
    admin_title: "राज्य कमांड सेंटर",
    connecting: "थेट डेटाबेसशी जोडत आहे...",
    offline_notice: "ऑफलाईन मोडमध्ये कार्यरत. कनेक्शन आल्यावर माहिती स्वयंचलित सिंक होईल.",
    home: "मुख्यपृष्ठ",
    logout: "बाहेर पडा",
    welcome: "स्वागत आहे",
    status_pending: "शोध सुरू आहे",
    status_found: "सापडले",
    status_reunited: "कुटुंबाला सोपवले"
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [highContrast, setHighContrast] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineReportsCount, setOfflineReportsCount] = useState(0);
  const [role, setRole] = useState<'public' | 'volunteer' | 'police' | 'admin'>('public');

  useEffect(() => {
    // Monitor online state
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Check IndexedDB queue length for badge updates
      const checkQueue = async () => {
        if ('indexedDB' in window) {
          try {
            const req = indexedDB.open('KumbhConnectOffline', 1);
            req.onupgradeneeded = (e: any) => {
              const db = e.target.result;
              if (!db.objectStoreNames.contains('reports')) {
                db.createObjectStore('reports', { keyPath: 'id' });
              }
            };
            req.onsuccess = (e: any) => {
              const db = e.target.result;
              const tx = db.transaction('reports', 'readonly');
              const store = tx.objectStore('reports');
              const countReq = store.count();
              countReq.onsuccess = () => {
                setOfflineReportsCount(countReq.result);
              };
            };
          } catch (err) {
            console.error('IndexedDB check failed:', err);
          }
        }
      };
      
      checkQueue();
      const interval = setInterval(checkQueue, 5000); // Poll IndexedDB size every 5s

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (highContrast) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    }
  }, [highContrast]);

  const translate = (key: string): string => {
    const langSet = TRANSLATIONS[language];
    return langSet[key] || langSet[key] || key;
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        highContrast,
        setHighContrast,
        isOnline,
        offlineReportsCount,
        setOfflineReportsCount,
        role,
        setRole,
        translate
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
