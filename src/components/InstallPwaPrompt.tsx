import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Share2, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallAppButton({ className = '' }: { className?: string }) {
  const [showModal, setShowModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(isStandaloneMode);
  }, []);

  if (isStandalone) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm ${className}`}
        title="วิธีติดตั้งแอปลงมือถือหรือแท็บเล็ต"
      >
        <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
        <span>ติดตั้งแอปลงเครื่อง</span>
      </button>

      {showModal && <PwaInstructionsModal onClose={() => setShowModal(false)} />}
    </>
  );
}

export function PwaInstructionsModal({
  onClose,
  deferredPrompt,
  onPromptSuccess
}: {
  onClose: () => void;
  deferredPrompt?: BeforeInstallPromptEvent | null;
  onPromptSuccess?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'ios' | 'android'>('android');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    if (isIosDevice) {
      setActiveTab('ios');
    } else {
      setActiveTab('android');
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          if (onPromptSuccess) onPromptSuccess();
          onClose();
        }
      } catch (err) {
        console.error('Error installing PWA:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-indigo-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src="/school-logo.png"
              alt="App Icon"
              className="w-12 h-12 rounded-2xl bg-white p-1.5 object-contain shadow-md"
            />
            <div>
              <h3 className="text-lg font-bold text-white">ติดตั้งแอปลงหน้าจอมือถือ</h3>
              <p className="text-xs text-indigo-100">เปิดใช้งานได้ทันทีจากหน้าจอโฮม ไม่ต้องดาวน์โหลดผ่าน Store</p>
            </div>
          </div>
        </div>

        {/* Platform Switcher Tabs */}
        <div className="p-6">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'ios'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="text-sm">🍎</span> iPhone / iPad (iOS)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`py-2 px-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'android'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="text-sm">🤖</span> Android / Chrome
            </button>
          </div>

          {/* iOS Instructions */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
                💡 สำหรับ iOS กรุณาเปิดใช้งานผ่าน <strong>เบราว์เซอร์ Safari</strong> เพื่อติดตั้งลงหน้าจอโฮม
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                      กดปุ่ม <Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> &quot;แชร์&quot; (Share)
                    </p>
                    <p className="text-slate-500">แตะที่ไอคอนแชร์ที่แถบเครื่องมือด้านล่างของ Safari</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                      เลือก <PlusSquare className="w-3.5 h-3.5 text-slate-800 inline" /> &quot;เพิ่มไปยังหน้าจอโฮม&quot;
                    </p>
                    <p className="text-slate-500">(Add to Home Screen) เลื่อนรายการลงมาเล็กน้อยเพื่อเลือกเมนูนี้</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1">
                      กด &quot;เพิ่ม&quot; (Add) ที่มุมบนขวา
                    </p>
                    <p className="text-slate-500">ไอคอนแอปจะไปปรากฏอยู่บนหน้าจอหลักของเครื่องทันที</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Android Instructions */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {deferredPrompt ? (
                <div className="text-center py-2 space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs text-left flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>อุปกรณ์พร้อมติดตั้ง:</strong> กดปุ่มด้านล่างเพื่อเริ่มการติดตั้งแอปได้ทันที
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    กดที่นี่เพื่อติดตั้งแอปลงเครื่อง
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 text-xs leading-relaxed">
                    💡 สำหรับ Android กรุณาเปิดผ่าน <strong>Google Chrome</strong> หรือ <strong>Samsung Internet</strong>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1">
                        แตะปุ่มจุดสามจุด (⋮) ที่มุมบนขวาของเบราว์เซอร์
                      </p>
                      <p className="text-slate-500">เพื่อเปิดเมนูการตั้งค่าของเบราว์เซอร์</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                        เลือก <Download className="w-3.5 h-3.5 text-indigo-600 inline" /> &quot;ติดตั้งแอป&quot; หรือ &quot;เพิ่มลงในหน้าจอหลัก&quot;
                      </p>
                      <p className="text-slate-500">(Install app / Add to Home screen)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                    <div className="w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="text-xs text-slate-700">
                      <p className="font-semibold text-slate-900 mb-1">
                        กดยืนยัน &quot;ติดตั้ง&quot; (Install)
                      </p>
                      <p className="text-slate-500">ระบบจะทำการเพิ่มแอปไว้บนหน้าจอหลักของคุณ</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature Highlights */}
          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>เปิดเต็มจอ ไร้แถบเว็บ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>ประหยัดเน็ต โหลดรวดเร็ว</span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors text-xs"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    const standalone = checkStandalone();

    // Check if dismissed recently (24 hours)
    const dismissedTime = localStorage.getItem('pwa_banner_dismissed_at');
    const isDismissedRecently = dismissedTime && Date.now() - parseInt(dismissedTime, 10) < 24 * 60 * 60 * 1000;

    if (!standalone && !isDismissedRecently) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissedRecently && !standalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setShowBanner(false);
          setShowModal(false);
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.error('Error during PWA install:', err);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    localStorage.setItem('pwa_banner_dismissed_at', Date.now().toString());
  };

  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Floating Bottom Banner */}
      {showBanner && (
        <aside
          aria-label="แนะนำการติดตั้งแอปพลิเคชัน"
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/school-logo.png"
                alt="App Icon"
                className="w-10 h-10 rounded-xl bg-white p-1 object-contain shrink-0 shadow"
              />
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                  ติดตั้งแอปลงเครื่อง
                  <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-1.5 py-0.5 rounded">
                    iOS/Android
                  </span>
                </h2>
                <p className="text-[11px] text-slate-300 truncate">เปิดง่าย เต็มหน้าจอ โหลดไว</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                ติดตั้ง
              </button>
              <button
                type="button"
                onClick={handleDismissBanner}
                aria-label="ปิดการแจ้งเตือนติดตั้งแอป"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal */}
      {showModal && (
        <PwaInstructionsModal
          onClose={() => setShowModal(false)}
          deferredPrompt={deferredPrompt}
          onPromptSuccess={() => {
            setShowBanner(false);
            setDeferredPrompt(null);
          }}
        />
      )}
    </>
  );
}
