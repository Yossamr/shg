
import React, { useState, useEffect } from 'react';
import { SettingsService } from '../services/storage';

// Gold Master Egypt Logo Component
// Uses the official logo image from Settings if set, otherwise falls back to /logo.jpg
export const AppIcon: React.FC<{ size?: number; className?: string }> = ({ size = 64, className = '' }) => {
  const [logo, setLogo] = useState<string>('./logo.jpg');

  useEffect(() => {
    const loadLogo = () => {
      try {
        const store = SettingsService.getStoreProfile();
        if (store && store.logoBase64) {
          setLogo(store.logoBase64);
        } else {
          setLogo('./logo.jpg');
        }
      } catch (e) {
        setLogo('./logo.jpg');
      }
    };

    loadLogo();

    // Listen for store-profile-updated event to update logo dynamically
    window.addEventListener('store-profile-updated', loadLogo);
    return () => {
      window.removeEventListener('store-profile-updated', loadLogo);
    };
  }, []);

  return (
    <img
      src={logo}
      alt="Gold Master Egypt"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'cover', borderRadius: '20%' }}
      onError={(e) => {
        // Fallback to /logo.jpg if load fails
        if (logo !== './logo.jpg' && logo !== '/logo.jpg') {
          setLogo('./logo.jpg');
        }
      }}
    />
  );
};
