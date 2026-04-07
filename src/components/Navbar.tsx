'use client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Navbar() {
  const { t, locale, setLocale } = useLanguage();

  return (
    <nav className="bg-white border-b border-gray-100 px-6 h-13 flex items-center justify-between sticky top-0 z-50">
      <a href="/" className="text-sm font-semibold tracking-tight">
        <span className="text-gray-900">Market</span>
        <span className="text-[#1A5FA8]">Intel</span>
      </a>
      <div className="flex items-center gap-4">
        <a href="/" className="text-xs text-gray-500 hover:text-gray-800">{t('nav.newReport')}</a>
        <button
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          className="text-xs border border-gray-200 px-3 py-1.5 rounded-full text-gray-600 hover:border-gray-400 transition-colors"
        >
          {t('nav.language')}
        </button>
      </div>
    </nav>
  );
}
