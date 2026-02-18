
import React from 'react';

const BackgroundEffects: React.FC = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none min-h-full">
      {/* Primary Glows - Simplified to pure CSS for screenshot reliability */}
      <div 
        className="absolute top-[-20%] right-[-10%] w-[100%] h-[100%] rounded-full blur-[160px]" 
        style={{ 
          background: 'radial-gradient(circle, rgba(222, 136, 89, 0.08) 0%, transparent 70%)' 
        }}
      />
      
      <div 
        className="absolute bottom-[-15%] left-[-15%] w-[90%] h-[90%] rounded-full blur-[140px]" 
        style={{ 
          background: 'radial-gradient(circle, rgba(35, 129, 151, 0.08) 0%, transparent 70%)' 
        }}
      />
      
      {/* Center ambient lift */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-white/[0.01] blur-[200px]" />

      {/* Noise layer - data-html2canvas-ignore prevents the muddy gray artifact in shots */}
      <div 
        data-html2canvas-ignore
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          filter: 'contrast(150%) brightness(100%)',
        }}
      />
      
      {/* Subtle Grid dots */}
      <div 
        className="absolute inset-0 opacity-[0.02]" 
        style={{ 
          backgroundImage: `radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)`,
          backgroundSize: '44px 44px'
        }} 
      />
    </div>
  );
};

export default BackgroundEffects;
