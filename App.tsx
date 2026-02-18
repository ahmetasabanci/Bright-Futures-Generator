
import React, { useState, useEffect, useCallback } from 'react';
import { SECTORS, TECHNOLOGIES } from './constants';
import { FuturePrediction, ExplanationState } from './types';
import { fetchExplanation, generateVisionImage } from './services/geminiService';
import BackgroundEffects from './components/BackgroundEffects';

const App: React.FC = () => {
  const [prediction, setPrediction] = useState<FuturePrediction>({ sector: '', technology: '' });
  const [explanation, setExplanation] = useState<ExplanationState>({
    text: '',
    isLoading: false,
    error: null,
  });
  const [isGeneratingVision, setIsGeneratingVision] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  
  const generateNewPrediction = useCallback(() => {
    const randomSector = SECTORS[Math.floor(Math.random() * SECTORS.length)];
    const randomTech = TECHNOLOGIES[Math.floor(Math.random() * TECHNOLOGIES.length)];
    setPrediction({ sector: randomSector, technology: randomTech });
    setExplanation({ text: '', isLoading: false, error: null });
    setShowCopyFeedback(false);
  }, []);

  useEffect(() => {
    generateNewPrediction();
  }, [generateNewPrediction]);

  const handleExplain = async () => {
    if (!prediction.sector || !prediction.technology) return;
    setExplanation(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetchExplanation(prediction.sector, prediction.technology);
      setExplanation({ text: response, isLoading: false, error: null });
      return response;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setExplanation({ text: '', isLoading: false, error: msg });
      throw new Error(msg);
    }
  };

  const handleCreateArtifact = async () => {
    setIsGeneratingVision(true);
    try {
      // 1. Auto-generate explanation if missing so the card is complete
      let currentExplanation = explanation.text;
      if (!currentExplanation) {
        try {
          currentExplanation = await handleExplain() || '';
        } catch (e) {
          console.warn("Could not fetch explanation for artifact, proceeding with basic card.");
        }
      }

      // 2. Generate the background vision
      const base64Image = await generateVisionImage(prediction.sector, prediction.technology);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1920;
      canvas.height = 1080;

      const bgImg = new Image();
      bgImg.src = base64Image;
      await new Promise((resolve) => (bgImg.onload = resolve));

      // 3. Draw Background & Overlays
      ctx.drawImage(bgImg, 0, 0, 1920, 1080);
      ctx.fillStyle = 'rgba(11, 17, 33, 0.75)'; // Slightly darker for better readability
      ctx.fillRect(0, 0, 1920, 1080);

      const vignette = ctx.createRadialGradient(960, 540, 100, 960, 540, 1200);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, 1920, 1080);

      // 4. Compositing Text
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const applyShadow = (blur = 20, color = 'rgba(0,0,0,0.9)') => {
        ctx.shadowColor = color;
        ctx.shadowBlur = blur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
      };
      const clearShadow = () => { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; };

      // Header Badge
      ctx.font = '900 22px Montserrat';
      ctx.fillStyle = '#F3C5AB';
      ctx.letterSpacing = '10px';
      ctx.fillText('BRIGHT FUTURES GENERATOR v2.0', 960, 80);

      // Main Sentence Logic
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.letterSpacing = '12px';
      ctx.font = '500 36px Montserrat';
      ctx.fillText('THE FUTURE OF', 960, 240);

      // Sector
      applyShadow(30);
      ctx.font = 'italic bold 92px Comfortaa';
      ctx.fillStyle = '#238197';
      ctx.letterSpacing = '-2px';
      ctx.fillText(prediction.sector.toUpperCase(), 960, 350);
      clearShadow();

      // Connect
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.letterSpacing = '10px';
      ctx.font = '300 36px Montserrat';
      ctx.fillText('WILL BE BRIGHT BECAUSE OF', 960, 445);

      // Tech
      applyShadow(30);
      ctx.font = 'italic bold 92px Comfortaa';
      ctx.fillStyle = '#DE8859';
      ctx.letterSpacing = '-2px';
      ctx.fillText(prediction.technology.toUpperCase(), 960, 560);
      clearShadow();

      // Strategic Argument (Automatic or Manual)
      if (currentExplanation) {
        ctx.font = 'italic 300 22px Comfortaa';
        ctx.fillStyle = 'rgba(248, 250, 252, 0.98)';
        ctx.letterSpacing = '0.5px';
        applyShadow(15, 'rgba(0,0,0,0.5)');
        
        const words = `"${currentExplanation}"`.split(' ');
        let line = '';
        let y = 680;
        const maxWidth = 1400;
        
        for(let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line, 960, y);
            line = words[n] + ' ';
            y += 55;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 960, y);
      }

      // Footer
      clearShadow();
      ctx.font = 'bold 22px Montserrat';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.letterSpacing = '8px';
      ctx.fillText('A TUHAF STUDIO EXPERIMENT • GEMINI SYNTHESIZED', 960, 1030);

      // Trigger Download
      const link = document.createElement('a');
      link.download = `vision-${prediction.sector.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error("Artifact generation failed:", err);
      alert("Vision synthesis failed. The future is currently occluded.");
    } finally {
      setIsGeneratingVision(false);
    }
  };

  const handleShareText = async () => {
    const fullText = `The future of ${prediction.sector} will be bright because of ${prediction.technology}.\n\nWhy? ${explanation.text}\n\nGenerated by Bright Futures Generator.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'A Bright Future Prediction', text: fullText });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          navigator.clipboard.writeText(fullText);
          setShowCopyFeedback(true);
          setTimeout(() => setShowCopyFeedback(false), 2000);
        }
      }
    } else {
      navigator.clipboard.writeText(fullText);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-8 relative selection:bg-[#DE8859]/30 font-sans overflow-x-hidden bg-[#0b1121]">
      <BackgroundEffects />

      {/* Header Badge */}
      <header className="w-full flex justify-center pt-4 pb-10 md:pt-8 md:pb-16 z-20 animate-in fade-in slide-in-from-top-2 duration-700 ease-out">
        <div className="flex items-center space-x-3 px-5 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg ring-1 ring-white/5">
          <div className="relative flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#DE8859' }} />
            <span className="absolute inset-0 w-1.5 h-1.5 rounded-full blur-sm opacity-50 animate-ping" style={{ backgroundColor: '#DE8859' }} />
          </div>
          <span className="text-[9px] md:text-xs font-black tracking-[0.4em] uppercase opacity-90" style={{ color: '#F3C5AB' }}>
            Bright Futures Generator v2.0
          </span>
        </div>
      </header>

      {/* Prediction Core - Harmonized sizes */}
      <main className="w-full max-w-4xl flex flex-col items-center z-10 relative">
        <div className="text-center w-full">
          <p className="text-[10px] md:text-sm text-slate-500 font-bold tracking-[0.5em] uppercase opacity-60 mb-3 md:mb-4">
            The future of
          </p>
          <div className="relative flex flex-col items-center px-4">
             <h2 className="relative font-serif italic font-bold text-center w-full">
               <span className="block text-4xl md:text-6xl lg:text-7xl leading-tight" style={{ color: '#238197' }}>
                 {prediction.sector}
               </span>
               <span className="block text-[9px] md:text-xs text-slate-400 my-4 md:my-6 not-italic font-sans font-medium tracking-[0.4em] uppercase leading-none opacity-40">
                 will be bright because of
               </span>
               <span className="block text-4xl md:text-6xl lg:text-7xl leading-tight" style={{ color: '#DE8859' }}>
                 {prediction.technology}
               </span>
             </h2>
          </div>
        </div>

        {/* Controls - Compact and clear */}
        <div className="flex flex-col md:flex-row items-center gap-3 mt-10 md:mt-12">
          <button
            onClick={handleExplain}
            disabled={explanation.isLoading || !!explanation.text}
            className={`group relative px-10 py-3.5 rounded-xl font-black transition-all duration-300 overflow-hidden ${explanation.text ? 'bg-transparent border border-white/5 text-slate-500 cursor-default' : 'text-white hover:bg-[#2a99b3] active:scale-95 shadow-lg'}`}
            style={!explanation.text ? { backgroundColor: '#238197' } : {}}
          >
            <span className="relative z-10 tracking-widest uppercase text-[10px] font-black">
              {explanation.isLoading ? "Analyzing..." : (explanation.text ? "Perspective Cast" : "Consult Why?")}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={generateNewPrediction}
              className="px-5 py-3.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 flex items-center space-x-2 border border-white/5 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 transition-transform duration-500 group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-[10px] tracking-[0.1em] uppercase">Recast</span>
            </button>

            <button
              onClick={handleCreateArtifact}
              disabled={isGeneratingVision}
              className="px-5 py-3.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-300 flex items-center space-x-2 border border-white/5 group"
            >
              {isGeneratingVision ? (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                </svg>
              )}
              <span className="text-[10px] tracking-[0.1em] uppercase">{isGeneratingVision ? "Synthesizing..." : "Vision"}</span>
            </button>
          </div>
        </div>

        {/* Strategic Argument Output */}
        {(explanation.text || explanation.error) && (
          <div className="w-full max-w-xl mt-10 md:mt-12 mb-10 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500 ease-out">
            <div className="p-6 md:p-8 rounded-[1.5rem] bg-glass border border-white/5 backdrop-blur-2xl relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-16 -mt-16 rounded-full opacity-10" style={{ backgroundColor: '#DE8859' }} />
              
              {explanation.error ? (
                <div className="text-rose-400/80 flex items-start space-x-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-[11px] font-medium leading-relaxed">{explanation.error}</p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-[9px] font-black uppercase tracking-[0.3em] opacity-80" style={{ color: '#DE8859' }}>
                      <div className="h-[1px] w-8 bg-current opacity-30"></div>
                      <span>Strategic Argument</span>
                    </div>
                    <button onClick={handleShareText} className="flex items-center space-x-2 text-[9px] font-black uppercase tracking-[0.1em] px-4 py-1.5 rounded-lg border border-white/5 hover:bg-white/5 transition-all" style={{ color: '#238197' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      <span>{showCopyFeedback ? "Copied" : "Share"}</span>
                    </button>
                  </div>
                  <p className="text-lg md:text-xl text-slate-100 leading-relaxed font-serif italic font-medium tracking-tight">
                    "{explanation.text}"
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="w-full text-center opacity-30 px-4 py-8 mt-auto">
        <p className="text-slate-500 text-[9px] tracking-[0.4em] uppercase font-bold">
          A <a href="https://tuhaf.studio" target="_blank" rel="noopener noreferrer" className="text-slate-200 hover:text-white transition-colors underline decoration-white/10 pointer-events-auto">Tuhaf Studio</a> Experiment &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default App;
