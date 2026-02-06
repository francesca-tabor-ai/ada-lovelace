
import React, { useState, useRef } from 'react';
import { 
  ADA_SPEECH, 
  TECH_SOVEREIGNTY_SPEECH, 
  BIOGRAPHY_SPEECH,
  IMAGE_PROMPT, 
  TECH_SOVEREIGNTY_IMAGE_PROMPT,
  BIOGRAPHY_IMAGE_PROMPT
} from './constants';
import { generateAdaImage, generateAdaSpeechAudio } from './services/geminiService';
import { AdaContent, GenerationState, AdaTopic } from './types';
import AdaStage from './components/AdaStage';
import AdaChatStage from './components/AdaChatStage';

const App: React.FC = () => {
  const [content, setContent] = useState<AdaContent | null>(null);
  const [isChatMode, setIsChatMode] = useState(false);
  
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progressMessage: '',
    error: null,
  });

  const audioContextRef = useRef<AudioContext | null>(null);

  const handleGenerate = async (topic: AdaTopic) => {
    // Switch to loading state immediately
    setIsChatMode(false);
    
    let loadingMsg = 'Loading Ada...';
    switch(topic) {
      case 'biography': loadingMsg = "Summoning Ada's Biography..."; break;
      case 'keir': loadingMsg = "Drafting the Parliamentary Address..."; break;
      case 'sovereignty': loadingMsg = "Architecting Tech Sovereignty..."; break;
    }

    setState({ isGenerating: true, progressMessage: loadingMsg, error: null });
    
    let speech = '';
    let prompt = '';
    let title = '';
    let subtitle = '';
    let sidebarTitle = '';
    let sidebarSubtitle = '';
    let sidebarQuote = '';

    switch (topic) {
      case 'keir':
        speech = ADA_SPEECH;
        prompt = IMAGE_PROMPT;
        title = "Parliamentary address";
        subtitle = "Memorandum of Urgency";
        sidebarTitle = "Historical Context";
        sidebarSubtitle = "Analytical Engine Notes, 1843";
        sidebarQuote = '"The Analytical Engine has no pretensions to originate anything; it can only do whatever we know how to order it to perform."';
        break;
      case 'sovereignty':
        speech = TECH_SOVEREIGNTY_SPEECH;
        prompt = TECH_SOVEREIGNTY_IMAGE_PROMPT;
        title = "A Vision of Tech Sovereignty";
        subtitle = "New Strategic Framework";
        sidebarTitle = "Theoretical Pillar";
        sidebarSubtitle = "Systemic Democratic Resilience";
        sidebarQuote = '"Tech sovereignty is not just about servers; it is about the cognitive sovereignty of your people."';
        break;
      case 'biography':
        speech = BIOGRAPHY_SPEECH;
        prompt = BIOGRAPHY_IMAGE_PROMPT;
        title = "Augusta Ada King-Noel";
        subtitle = "A Poetical Science Life";
        sidebarTitle = "Personal Motto";
        sidebarSubtitle = "Flyology & Abstract Operations";
        sidebarQuote = '"I believe that intuition and imagery are critical to the application of mathematical concepts."';
        break;
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const [imageUrl, audioBuffer] = await Promise.all([
        generateAdaImage(prompt),
        generateAdaSpeechAudio(speech, audioContextRef.current)
      ]);
      
      setContent({
        topic,
        imageUrl,
        audioBuffer,
        speechText: speech,
        title,
        subtitle,
        sidebarTitle,
        sidebarSubtitle,
        sidebarQuote
      });
      
      setState({ isGenerating: false, progressMessage: '', error: null });
    } catch (err: any) {
      console.error(err);
      setState({ 
        isGenerating: false, 
        progressMessage: '', 
        error: 'The machine failed to respond. Please check your connection and environment key.' 
      });
    }
  };

  const handleReset = () => {
    setContent(null);
    setIsChatMode(false);
    setState({ isGenerating: false, progressMessage: '', error: null });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col selection:bg-amber-500/30">
      {/* Navigation Branding */}
      <nav className="fixed top-0 w-full p-8 flex justify-between items-center z-50">
        <button onClick={handleReset} className="flex items-center gap-4 group transition-opacity active:opacity-70">
          <div className="w-12 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
            <span className="text-amber-500 text-sm font-bold tracking-widest">ADA</span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-[0.3em] text-white/30 uppercase leading-none group-hover:text-white/60 transition-colors">The Analytical</span>
            <span className="text-xs font-bold tracking-[0.3em] text-white/30 uppercase mt-0.5 group-hover:text-white/60 transition-colors">Engine Project</span>
          </div>
        </button>

        <div className="flex items-center gap-4 md:gap-8">
          <button 
            onClick={() => handleGenerate('biography')}
            className={`text-[10px] font-black tracking-[0.4em] uppercase transition-all active:scale-95 px-4 py-2 ${content?.topic === 'biography' && !state.isGenerating ? 'text-amber-500 underline underline-offset-8' : 'text-white/40 hover:text-amber-500'}`}
          >
            Biography
          </button>
          <button 
            onClick={() => handleGenerate('keir')}
            className={`text-[10px] font-black tracking-[0.4em] uppercase transition-all active:scale-95 px-4 py-2 ${content?.topic === 'keir' && !state.isGenerating ? 'text-amber-500 underline underline-offset-8' : 'text-white/40 hover:text-amber-500'}`}
          >
            Parliamentary address
          </button>
          <button 
            onClick={() => handleGenerate('sovereignty')}
            className={`text-[10px] font-black tracking-[0.4em] uppercase transition-all active:scale-95 px-4 py-2 ${content?.topic === 'sovereignty' && !state.isGenerating ? 'text-amber-500 underline underline-offset-8' : 'text-white/40 hover:text-amber-500'}`}
          >
            Tech Sovereignty
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24">
        {state.isGenerating ? (
          /* LOADING SCREEN */
          <div className="flex flex-col items-center gap-16 animate-in fade-in duration-500">
            <div className="relative w-64 h-64 flex items-center justify-center">
               <div className="absolute inset-0 border-[1px] border-amber-500/10 rounded-full animate-[ping_4s_infinite]" />
               <div className="absolute inset-4 border-[2px] border-dashed border-amber-500/20 rounded-full animate-[spin_15s_linear_infinite]" />
               <div className="absolute inset-12 border-[1px] border-amber-500/30 rounded-full animate-[spin_8s_linear_infinite_reverse]" />
               <div className="relative text-amber-500 font-serif text-5xl italic animate-pulse">ADA</div>
            </div>
            <div className="text-center space-y-4">
              <p className="text-3xl font-serif italic text-white/80 tracking-wide">
                {state.progressMessage}
              </p>
              <div className="flex items-center justify-center gap-1 h-1">
                 <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        ) : isChatMode ? (
          <div className="w-full max-w-7xl pt-12">
            <AdaChatStage onReset={handleReset} />
          </div>
        ) : content ? (
          <div className="w-full max-w-7xl pt-12">
            <AdaStage 
              content={content} 
              audioContext={audioContextRef.current} 
              onReset={handleReset}
              onNavigate={handleGenerate}
            />
          </div>
        ) : (
          /* LANDING PAGE */
          <div className="w-full max-w-4xl text-center flex flex-col items-center animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="mb-8 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em] shadow-2xl">
              National Digital Resilience Council
            </div>
            
            <h1 className="text-7xl md:text-9xl font-serif mb-10 leading-[0.9] tracking-tight text-white/95">
              Meet <span className="italic text-amber-500">Ada Lovelace</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/40 mb-14 leading-relaxed max-w-2xl font-serif italic font-light">
              "We must reclaim the agency to order the machine, rather than being ordered by it."
            </p>
            
            <div className="flex flex-col items-center gap-6 w-full max-w-4xl">
              <button
                onClick={() => setIsChatMode(true)}
                className="group relative px-12 py-10 bg-amber-500 text-black font-black rounded-[2rem] transition-all hover:scale-[1.05] active:scale-95 shadow-[0_0_80px_rgba(245,158,11,0.2)] hover:shadow-amber-500/40 flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-3">
                    <span className="uppercase tracking-[0.3em] text-lg">Consult with Ada</span>
                </div>
                <span className="uppercase tracking-[0.1em] text-xs opacity-60">Digital Sovereignty Dialogue</span>
              </button>
            </div>
          </div>
        )}

        {state.error && (
          <div className="fixed bottom-12 px-8 py-4 glass rounded-3xl text-red-400 border border-red-500/20 z-[60] flex items-center gap-4 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="font-medium text-sm">{state.error}</span>
          </div>
        )}
      </main>

      <footer className="w-full p-10 flex flex-col items-center gap-4 text-white/10 opacity-50">
        <div className="flex gap-8 text-[9px] tracking-[0.5em] uppercase font-bold">
          <span>Digital Sovereignity</span>
          <span>&bull;</span>
          <span>Socio-Technical Resilience</span>
          <span>&bull;</span>
          <span>Cognitive Freedom</span>
        </div>
        <div className="text-[10px] tracking-widest uppercase">London &bull; AD 1843/2024</div>
      </footer>
    </div>
  );
};

export default App;
