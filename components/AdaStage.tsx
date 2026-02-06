
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AdaContent, AdaTopic } from '../types';

interface AdaStageProps {
  content: AdaContent;
  audioContext: AudioContext | null;
  onReset: () => void;
  onNavigate: (topic: AdaTopic) => void;
}

const AdaStage: React.FC<AdaStageProps> = ({ content, audioContext, onReset, onNavigate }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const topicOrder: AdaTopic[] = ['biography', 'keir', 'sovereignty'];
  const currentIndex = topicOrder.indexOf(content.topic);
  const nextTopic = currentIndex < topicOrder.length - 1 ? topicOrder[currentIndex + 1] : null;

  const getNextTitle = (topic: AdaTopic | null) => {
    switch(topic) {
      case 'biography': return 'Biography';
      case 'keir': return 'Parliamentary address';
      case 'sovereignty': return 'Tech Sovereignty';
      default: return null;
    }
  };

  // Calculate paragraph markers based on character length for more accurate highlighting
  const { paragraphs, markers } = useMemo(() => {
    const paras = content.speechText.split('\n\n');
    const totalChars = content.speechText.length;
    let charAcc = 0;
    
    const marks = paras.map((p) => {
      const start = (charAcc / totalChars) * 100;
      charAcc += p.length + 2; // Approximate for the split \n\n
      const end = (charAcc / totalChars) * 100;
      return { start, end };
    });
    
    return { paragraphs: paras, markers: marks };
  }, [content.speechText]);

  const stopAudio = useCallback(() => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop(0);
      } catch (e) {}
      sourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    setProgress(0);
  }, []);

  const playAudio = useCallback(() => {
    if (!audioContext || !content.audioBuffer) return;
    if (isPlaying) {
      stopAudio();
      return;
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = content.audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      setIsPlaying(false);
      setProgress(100);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    sourceRef.current = source;
    startTimeRef.current = audioContext.currentTime;
    source.start(0);
    setIsPlaying(true);

    const updateProgress = () => {
      if (!content.audioBuffer) return;
      const elapsed = audioContext.currentTime - startTimeRef.current;
      const percentage = (elapsed / content.audioBuffer.duration) * 100;
      
      if (percentage <= 100) {
        setProgress(percentage);
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      } else {
        setIsPlaying(false);
        setProgress(100);
      }
    };
    
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [audioContext, content.audioBuffer, isPlaying, stopAudio]);

  useEffect(() => {
    const timer = setTimeout(() => {
      playAudio();
    }, 1000);
    return () => {
      clearTimeout(timer);
      stopAudio();
    };
  }, [content.topic]);

  return (
    <div className="w-full flex flex-col gap-10 items-center animate-in fade-in zoom-in-95 duration-1000">
      <div className="relative w-full max-w-5xl group overflow-hidden rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80 z-10" />
        {content.imageUrl && (
          <img 
            src={content.imageUrl} 
            alt="Ada Lovelace Portrait" 
            className={`w-full aspect-[21/9] object-cover transition-transform duration-[30s] ease-in-out ${isPlaying ? 'scale-110' : 'scale-100'}`}
          />
        )}
        
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-500">
            <button onClick={playAudio} className="group/btn relative w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-amber-500 rounded-full blur-2xl opacity-20 group-hover/btn:opacity-40 transition-opacity" />
              <div className="absolute inset-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-full group-hover/btn:scale-110 transition-transform duration-300" />
              <svg className="relative w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 z-30 p-8 flex flex-col gap-4">
           <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-amber-500 text-[10px] uppercase tracking-[0.4em] font-bold mb-1">Status: {isPlaying ? 'Speaking' : 'Standing By'}</span>
                <h2 className="text-2xl font-serif text-white/90 italic">{content.title}</h2>
              </div>
              <div className="text-white/40 text-[10px] tracking-widest uppercase mb-1">
                {isPlaying ? 'Audio Stream Active' : 'Waiting for Input'}
              </div>
           </div>
           <div className="relative h-1 w-full bg-white/10 rounded-full overflow-hidden">
             <div className="h-full bg-amber-500 shadow-[0_0_10px_#f59e0b] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
           </div>
        </div>
      </div>

      <div className="w-full max-w-4xl grid lg:grid-cols-12 gap-12 items-start pb-24">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="glass p-10 md:p-14 rounded-[2rem] border border-white/10 shadow-inner">
            <div className="mb-10 flex flex-col gap-2">
              <span className="text-amber-500 text-xs font-bold tracking-[0.3em] uppercase">{content.subtitle}</span>
              <h3 className="text-3xl font-serif text-white/90">{content.title}</h3>
              <div className="w-12 h-1 bg-amber-500/30 mt-4 rounded-full" />
            </div>
            
            <div className="space-y-8 text-white/70 leading-[1.8] text-xl font-light font-serif italic relative">
              {paragraphs.map((para, i) => {
                const isHighlighted = isPlaying && progress >= markers[i].start && progress < markers[i].end;
                return (
                  <p 
                    key={i} 
                    className={`transition-all duration-700 origin-left ${isHighlighted ? 'text-amber-400 opacity-100 translate-x-4 scale-105' : 'opacity-20 translate-x-0 scale-100'}`}
                  >
                    {para}
                  </p>
                );
              })}
            </div>

            {/* Next Chapter Button */}
            {nextTopic && (
              <div className="mt-16 pt-8 border-t border-white/5 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                <button 
                  onClick={() => onNavigate(nextTopic)}
                  className="group flex flex-col items-start gap-2 text-left"
                >
                  <span className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.4em]">Next Chapter</span>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-serif text-white/80 group-hover:text-amber-500 transition-colors">
                      {getNextTitle(nextTopic)}
                    </span>
                    <svg className="w-6 h-6 text-amber-500 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
          <div className="glass p-8 rounded-3xl border border-white/5 space-y-6">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-amber-500">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
               </div>
               <div>
                 <h4 className="text-white font-medium">{content.sidebarTitle}</h4>
                 <p className="text-white/40 text-xs tracking-tight">{content.sidebarSubtitle}</p>
               </div>
            </div>
            <p className="text-sm text-white/50 leading-relaxed italic">{content.sidebarQuote}</p>
          </div>

          <div className="flex flex-col gap-3">
             <button onClick={isPlaying ? stopAudio : playAudio} className={`w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs transition-all ${isPlaying ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'bg-white text-black hover:bg-amber-500 hover:text-white'}`}>
              {isPlaying ? <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> Silence the Vision</> : <><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> Replay Address</>}
            </button>
            <button onClick={onReset} className="w-full py-5 glass text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all font-bold uppercase tracking-widest text-xs">
              Return to Present
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdaStage;
