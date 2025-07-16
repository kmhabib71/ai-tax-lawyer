'use client';

import { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from './button';
import { Card } from './card';
import { AlertTriangle, Shield, FileText } from 'lucide-react';

interface LegalDisclaimerProps {
  onAccept: () => void;
  onDecline?: () => void;
  variant?: 'modal' | 'banner' | 'card';
  showButtons?: boolean;
}

export function LegalDisclaimer({ 
  onAccept, 
  onDecline, 
  variant = 'card',
  showButtons = true 
}: LegalDisclaimerProps) {
  const { t } = useTranslation();

  const disclaimerContent = (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-amber-600">
        <AlertTriangle className="h-5 w-5" />
        <h3 className="font-semibold text-lg">{t('legal.disclaimer.title')}</h3>
      </div>
      
      <div className="space-y-3 text-sm text-gray-700">
        <p>{t('legal.disclaimer.content')}</p>
        
        <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">
          <div className="flex items-start space-x-2">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <p className="text-blue-800">{t('legal.disclaimer.aiAdvice')}</p>
          </div>
        </div>
        
        <div className="bg-red-50 p-3 rounded-lg border-l-4 border-red-400">
          <div className="flex items-start space-x-2">
            <FileText className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-red-800">{t('legal.disclaimer.liability')}</p>
          </div>
        </div>
      </div>
      
      {showButtons && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="accept-disclaimer"
              className="rounded border-gray-300"
            />
            <label htmlFor="accept-disclaimer" className="text-sm text-gray-600">
              {t('legal.disclaimer.agree')}
            </label>
          </div>
          
          <div className="flex space-x-2">
            {onDecline && (
              <Button variant="outline" onClick={onDecline}>
                {t('common.no')}
              </Button>
            )}
            <Button 
              onClick={onAccept}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {t('common.yes')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'banner') {
    return (
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6">
        {disclaimerContent}
      </div>
    );
  }

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
          {disclaimerContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="p-6">
      {disclaimerContent}
    </Card>
  );
}