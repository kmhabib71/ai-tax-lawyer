'use client';

import { Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  const languages = [
    { code: 'en', name: t('common.english'), flag: '🇺🇸' },
    { code: 'bn', name: t('common.bengali'), flag: '🇧🇩' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <Select value={language} onValueChange={(value: 'en' | 'bn') => setLanguage(value)}>
      <SelectTrigger className="w-[140px] h-9">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentLanguage?.flag}</span>
              <span className="text-sm">{currentLanguage?.name}</span>
            </span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <div className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Compact version for mobile or smaller spaces
export function LanguageSwitcherCompact() {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en', flag: '🇺🇸' },
    { code: 'bn', flag: '🇧🇩' },
  ];

  const handleLanguageToggle = () => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  };

  const currentLanguage = languages.find(lang => lang.code === language);

  return (
    <button
      onClick={handleLanguageToggle}
      className="flex items-center gap-1 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={`Switch to ${language === 'en' ? 'Bengali' : 'English'}`}
    >
      <Globe className="h-4 w-4" />
      <span className="text-sm">{currentLanguage?.flag}</span>
    </button>
  );
}