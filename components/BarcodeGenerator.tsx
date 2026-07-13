import React from 'react';

// Simple visual representation of a barcode (Code 39 style logic purely for visual)
// In a real app, use 'react-barcode' library.
export const BarcodeGenerator: React.FC<{ value: string; width?: number; height?: number }> = ({ value, width = 150, height = 50 }) => {
  return (
    <div className="flex flex-col items-center bg-white p-2 border rounded">
       <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
         <rect x="0" y="0" width={width} height={height} fill="white" />
         {value.split('').map((char, index) => {
           // Simulate bars based on char code parity
           const x = 10 + (index * (width - 20) / value.length);
           const w = 2 + (char.charCodeAt(0) % 3); 
           return <rect key={index} x={x} y="5" width={w} height={height - 20} fill="black" />;
         })}
       </svg>
       <span className="font-mono text-xs tracking-widest mt-1 text-black">{value}</span>
    </div>
  );
};
