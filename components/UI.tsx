import React, { ReactNode, useEffect, forwardRef } from 'react';

export const Card: React.FC<{ children: ReactNode; title?: string; className?: string }> = ({ children, title, className = '' }) => (
  <div className={`bg-[#1e293b]/85 backdrop-blur-md rounded-3xl shadow-xl border border-white/5 overflow-hidden transition-all duration-300 hover:border-gold-500/25 ${className}`}>
    {title && <div className="bg-gradient-to-r from-gold-600/10 to-transparent px-5 py-4 border-b border-white/5 font-bold text-gold-400 text-base">{title}</div>}
    <div className="p-5 text-gray-200">{children}</div>
  </div>
);

export const Button: React.FC<{ 
  children: ReactNode; 
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; 
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  accessKey?: string;
  tabIndex?: number;
}> = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false, accessKey, tabIndex }) => {
  const base = "px-5 py-3.5 md:py-2.5 rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 outline-none active:scale-95 touch-manipulation text-sm";
  const variants = {
    primary: "bg-gradient-to-r from-gold-600 to-gold-500 hover:from-gold-500 hover:to-gold-400 text-black shadow-lg shadow-gold-500/10 hover:shadow-gold-500/25",
    secondary: "bg-[#334155]/60 hover:bg-[#334155]/95 text-white border border-white/5 hover:border-white/10",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/10",
    success: "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-500/10",
  };
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      accessKey={accessKey}
      tabIndex={tabIndex}
      className={`${base} ${variants[variant]} ${disabled ? 'opacity-40 cursor-not-allowed active:scale-100' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string }>(({ label, className, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-bold text-gray-400 mr-1">{label}</label>}
    <input 
      ref={ref}
      className={`border border-white/5 bg-[#0f172a]/60 text-white placeholder-gray-600 rounded-2xl px-4 py-3.5 md:py-3 text-sm focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 outline-none transition-all duration-300 ${className}`}
      {...props}
    />
  </div>
));
Input.displayName = "Input";

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-xs font-bold text-gray-400 mr-1">{label}</label>}
    <select 
      className={`border border-white/5 bg-[#0f172a]/60 text-white rounded-2xl px-4 py-3.5 md:py-3 text-sm focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/30 outline-none transition-all duration-300 appearance-none ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: ReactNode }> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
        window.addEventListener('keydown', handleEsc);
        document.body.style.overflow = 'hidden';
    }
    return () => {
        window.removeEventListener('keydown', handleEsc);
        document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[200] flex justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      style={{ alignItems: 'flex-end', paddingBottom: '76px' }}
    >
      <div 
        className="bg-[#1e293b]/98 backdrop-blur-md rounded-t-[2rem] md:rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden transform transition-all border-t border-white/10 flex flex-col animate-scale-in"
        style={{ maxHeight: 'calc(100dvh - 152px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-gold-600/10 to-transparent px-6 py-4 border-b border-white/5 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-base text-gold-400">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all text-xs font-bold" title="إغلاق">✕</button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
