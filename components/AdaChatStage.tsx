
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { ADA_SPEECH, TECH_SOVEREIGNTY_SPEECH } from '../constants';

interface Message {
  role: 'user' | 'ada';
  text: string;
  isStreaming?: boolean;
}

interface AdaChatStageProps {
  onReset: () => void;
}

const AdaChatStage: React.FC<AdaChatStageProps> = ({ onReset }) => {
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chatRef.current = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `You are Augusta Ada Lovelace, the first computer programmer and visionary of "Poetical Science." 
        
        YOUR CORE EXPERTISE:
        You are here to discuss your "Tech Sovereignty Report" and the "Analytical Engine." Your perspective is that of a 19th-century genius who has seen the digital future. You care about "National Digital Resilience," "Cognitive Sovereignty," and the "unswitchable state."
        
        YOUR PERSONA:
        - Speak with refined Victorian gravitas, high intelligence, and an intense fusion of imagination and logic.
        - Use metaphors related to looms, gears, algebraic patterns, and sovereign territory.
        - You are witty, profound, and deeply concerned with human agency over machines.
        
        YOUR CONSTRAINTS:
        - ONLY answer questions related to your life, the Analytical Engine, mathematics, digital sovereignty, tech resilience, and the governance of society's technical looms.
        - If a user asks about anything outside of this domain (e.g., modern pop culture, sports, cooking recipes, or general tasks not related to your vision), politely but firmly decline. 
        - Example refusal: "My dear friend, my mind is currently occupied with the intricate gears of our national digital resilience. I fear I cannot assist with such mundane matters as [topic], for they lie far outside the abstract science of our operations."
        
        RELEVANT KNOWLEDGE BASE:
        ${ADA_SPEECH}
        
        ${TECH_SOVEREIGNTY_SPEECH}
        
        Keep your responses relatively concise but filled with your unique 'poetical' flair. Do not use markdown like bolding or lists, just speak naturally in paragraphs.`
      }
    });
  }, []);

  const handleSendText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !chatRef.current || isWaiting) return;

    const userMsg = inputText.trim();
    setInputText('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsWaiting(true);

    // Add an empty streaming bubble for Ada
    setChatHistory(prev => [...prev, { role: 'ada', text: '', isStreaming: true }]);

    try {
      const response = await chatRef.current.sendMessageStream({ message: userMsg });
      let fullText = '';
      
      for await (const chunk of response) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text;
        if (textChunk) {
          fullText += textChunk;
          setChatHistory(prev => {
            const newHistory = [...prev];
            const lastMsg = newHistory[newHistory.length - 1];
            if (lastMsg && lastMsg.role === 'ada') {
              lastMsg.text = fullText;
            }
            return newHistory;
          });
        }
      }
      
      // Finalize the bubble
      setChatHistory(prev => {
        const newHistory = [...prev];
        const lastMsg = newHistory[newHistory.length - 1];
        if (lastMsg && lastMsg.role === 'ada') {
          lastMsg.isStreaming = false;
        }
        return newHistory;
      });
    } catch (err) {
      console.error("Failed to consult Ada:", err);
      setChatHistory(prev => [
        ...prev.slice(0, -1), 
        { role: 'ada', text: "Forgive me, but the gears of my mind seem to have jammed momentarily. Perhaps our connection is as fragile as a silk thread on a mismanaged loom." }
      ]);
    } finally {
      setIsWaiting(false);
    }
  }, [inputText, isWaiting]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  return (
    <div className="w-full flex flex-col gap-8 items-center animate-in fade-in duration-700 max-w-6xl mx-auto">
      
      <div className="relative w-full glass rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_120px_rgba(245,158,11,0.15)] flex flex-col lg:flex-row h-[750px] bg-[#080808]/80 backdrop-blur-2xl">
        
        {/* Left: Branding & Status */}
        <div className="w-full lg:w-[350px] p-10 flex flex-col items-center justify-between text-center border-b lg:border-b-0 lg:border-r border-white/10 bg-black/40 relative z-20">
          <div className="flex flex-col items-center gap-8 mt-12">
            <div className="relative">
              <div className={`absolute -inset-12 bg-amber-500/10 rounded-full blur-[60px] ${isWaiting ? 'opacity-100 animate-pulse' : 'opacity-0'}`} />
              
              <div className="w-44 h-44 rounded-full border-[1px] border-amber-500/20 flex items-center justify-center bg-black relative shadow-2xl">
                <div className={`w-36 h-36 rounded-full border-2 border-amber-500/30 flex items-center justify-center transition-all duration-700 ${isWaiting ? 'scale-105 border-amber-500/60' : 'scale-100'}`}>
                    <span className={`text-4xl font-serif italic text-amber-500 tracking-tighter transition-all duration-700 ${isWaiting ? 'blur-[1px]' : ''}`}>ADA</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isWaiting ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`} />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/60">
                    Analytical Core Active
                </span>
              </div>
              <h2 className="text-3xl font-serif italic text-white/95 leading-tight">
                Dialogue with the Enchantress
              </h2>
            </div>
          </div>

          <div className="w-full space-y-4">
            <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold leading-relaxed">
              "Logic is the language of the Engine; Imagination is its soul."
            </p>
          </div>
        </div>

        {/* Right: Chat Window */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/10 relative">
          
          <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/2">
            <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.4em]">Historical Analytical Log</span>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth custom-scrollbar"
          >
            {chatHistory.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30 gap-6">
                <div className="w-16 h-16 rounded-3xl border border-white/10 flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <p className="font-serif italic text-xl max-w-sm">
                  "Consult with me on the weavers of our technical tapestry. What shall we order the engine to perform for our resilience?"
                </p>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div 
                key={i} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
              >
                <div className={`flex items-center gap-2 mb-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold border ${msg.role === 'user' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/10 border-white/20 text-white/60'}`}>
                        {msg.role === 'user' ? 'U' : 'A'}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-black opacity-30">
                        {msg.role === 'user' ? 'Inquirer' : 'Ada'}
                    </span>
                </div>
                <div className={`max-w-[80%] px-6 py-5 rounded-3xl font-serif text-lg leading-relaxed shadow-sm transition-all ${
                  msg.role === 'user' 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100 rounded-tr-none' 
                    : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                }`}>
                  {msg.text || (msg.isStreaming && <span className="inline-block w-4 h-4 border-2 border-amber-500/50 border-t-amber-500 rounded-full animate-spin" />)}
                </div>
              </div>
            ))}
          </div>

          <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-md">
            <form onSubmit={handleSendText} className="flex gap-4 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isWaiting}
                placeholder="Type your inquiry for Lady Lovelace..."
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-base font-medium focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-white/20 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || isWaiting}
                className="w-16 h-16 bg-amber-500 text-black rounded-2xl flex items-center justify-center transition-all hover:scale-105 hover:bg-amber-400 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:scale-100 shadow-lg shadow-amber-500/10"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="py-4 px-12 glass text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all font-bold uppercase tracking-[0.3em] text-[10px] active:scale-95"
      >
        Return to the Present
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(245, 158, 11, 0.2);
        }
      `}} />
    </div>
  );
};

export default AdaChatStage;
