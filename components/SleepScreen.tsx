import React, { useState, useEffect } from 'react';
import { GoldPriceService } from '../services/storage';
import { Karat } from '../types';
import { DollarSign, Clock } from 'lucide-react';

interface SleepScreenProps {
  onWake: () => void;
}

export const SleepScreen: React.FC<SleepScreenProps> = ({ onWake }) => {
  const [prices, setPrices] = useState({ base21: 0, ounce: 0, p24: 0, p18: 0 });
  const [time, setTime] = useState(new Date());

  const updateData = () => {
    const stored = GoldPriceService.getStoredPrice();
    setPrices({
      base21: stored.base21,
      ounce: stored.ouncePriceUsd,
      p24: GoldPriceService.calculatePrice(Karat.K24, stored.base21),
      p18: GoldPriceService.calculatePrice(Karat.K18, stored.base21)
    });
  };

  useEffect(() => {
    updateData();
    // Update time every second
    const timeInterval = setInterval(() => setTime(new Date()), 1000);
    // Check prices every 5 seconds (lighter check than main app)
    const priceInterval = setInterval(updateData, 5000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(priceInterval);
    };
  }, []);

  return (
    <div 
      onClick={onWake}
      className="fixed inset-0 z-[9999] bg-black cursor-pointer flex flex-col items-center justify-center select-none animate-fade-in"
    >
      {/* Time */}
      <div className="absolute top-10 flex items-center gap-2 text-gray-500 font-mono text-xl opacity-70">
         <Clock size={20} />
         {time.toLocaleTimeString('ar-EG')}
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-12 w-full max-w-4xl px-4">
        
        {/* Ounce */}
        <div className="flex flex-col items-center animate-pulse">
           <div className="text-blue-400 text-lg font-bold mb-2 flex items-center gap-2">
             <DollarSign size={20} /> الأوقية العالمية
           </div>
           <div className="text-5xl font-mono font-bold text-white tracking-widest">
             {prices.ounce.toLocaleString()} <span className="text-2xl text-gray-600">$</span>
           </div>
        </div>

        {/* Divider */}
        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-gold-600 to-transparent opacity-50"></div>

        {/* 21 Karat */}
        <div className="flex flex-col items-center transform scale-110">
          <h2 className="text-gold-500 text-2xl font-bold mb-4 tracking-widest uppercase">سعر عيار 21</h2>
          <div className="text-[120px] leading-none font-black text-gold-400 drop-shadow-[0_0_15px_rgba(217,119,6,0.5)] font-mono">
            {prices.base21}
          </div>
          <p className="text-gray-500 font-bold mt-2 text-lg">جنيه مصري</p>
        </div>

        {/* Other Karats */}
        <div className="flex gap-16 mt-8">
           <div className="text-center">
              <div className="text-gold-200 text-xl font-bold mb-1">عيار 24</div>
              <div className="text-4xl font-mono font-bold text-white">{prices.p24}</div>
           </div>
           <div className="w-px bg-gray-800 h-16"></div>
           <div className="text-center">
              <div className="text-gold-200 text-xl font-bold mb-1">عيار 18</div>
              <div className="text-4xl font-mono font-bold text-white">{prices.p18}</div>
           </div>
        </div>

      </div>

      <div className="absolute bottom-10 text-gray-600 text-sm animate-bounce">
        اضغط على الشاشة للعودة
      </div>
    </div>
  );
};
