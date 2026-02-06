
import React, { useState, useRef, useEffect, useCallback } from 'react';

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

  const handleSendText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isWaiting) return;

    const userMsg = inputText.trim();
    setInputText('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsWaiting(true);

    // Add an empty streaming bubble for Ada
    setChatHistory(prev => [...prev, { role: 'ada', text: '', isStreaming: true }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMsg }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullText += data.text;
                setChatHistory(prev => {
                  const newHistory = [...prev];
                  const lastMsg = newHistory[newHistory.length - 1];
                  if (lastMsg && lastMsg.role === 'ada') {
                    lastMsg.text = fullText;
                  }
                  return newHistory;
                });
              }
            } catch (parseError) {
              // Skip malformed JSON lines
            }
          }
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
    } catch (err: any) {
      console.error("Failed to consult Ada:", err);
      
      let errorMessage = "Forgive me, but the gears of my mind seem to have jammed momentarily. Perhaps our connection is as fragile as a silk thread on a mismanaged loom.";
      
      if (err?.message?.includes('API_KEY') || err?.message?.includes('500')) {
        errorMessage = "I apologize, but my analytical engine lacks its essential key. Please ensure the API_KEY environment variable is properly configured on the server.";
      } else if (err?.message?.includes('API key') || err?.message?.includes('401') || err?.message?.includes('403')) {
        errorMessage = "My connection has been severed—the API key appears invalid or expired. Please verify your credentials.";
      } else if (err?.message?.includes('quota') || err?.message?.includes('rate limit')) {
        errorMessage = "The computational resources have been exhausted. Please try again when the quota resets.";
      } else if (err?.message?.includes('404')) {
        errorMessage = "The consultation endpoint appears to be missing. Please verify the API route is properly deployed.";
      }
      
      setChatHistory(prev => [
        ...prev.slice(0, -1), 
        { role: 'ada', text: errorMessage }
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
