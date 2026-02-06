
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, encode } from '../utils/audio';

interface Message {
  role: 'user' | 'ada';
  text: string;
  isStreaming?: boolean;
}

interface AdaLiveStageProps {
  onReset: () => void;
}

const AdaLiveStage: React.FC<AdaLiveStageProps> = ({ onReset }) => {
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isTalking, setIsTalking] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  
  const currentOutputTranscription = useRef('');
  const sessionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    activeSourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setStatus('idle');
    setIsTalking(false);
    currentOutputTranscription.current = '';
  }, []);

  const createAudioBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    if (status === 'connecting' || status === 'connected') return;
    
    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      if (!audioContextInRef.current) {
        audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      }
      if (!audioContextOutRef.current) {
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('connected');
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              if (sessionRef.current) {
                const inputData = e.inputBuffer.getChannelData(0);
                sessionRef.current.sendRealtimeInput({ media: createAudioBlob(inputData) });
              }
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // 1. Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setIsTalking(true);
              const ctx = audioContextOutRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => {
                activeSourcesRef.current.delete(source);
                if (activeSourcesRef.current.size === 0) setIsTalking(false);
              };
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              activeSourcesRef.current.add(source);
            }

            // 2. Handle Transcription (User)
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text || '';
              if (text) {
                setChatHistory(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'user' && last.isStreaming) {
                      return [...prev.slice(0, -1), { ...last, text: (last.text || '') + text }];
                  }
                  return [...prev, { role: 'user', text, isStreaming: true }];
                });
              }
            }

            // 3. Handle Transcription (Model)
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text || '';
              if (text) {
                currentOutputTranscription.current += text;
                setChatHistory(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'ada' && last.isStreaming) {
                      return [...prev.slice(0, -1), { ...last, text: (last.text || '') + text }];
                  }
                  return [...prev, { role: 'ada', text, isStreaming: true }];
                });
              }
            }

            // 4. Turn Complete - Finalize bubbles
            if (message.serverContent?.turnComplete) {
              setChatHistory(prev => prev.map(m => ({ ...m, isStreaming: false })));
              currentOutputTranscription.current = '';
            }

            // 5. Interruption
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setIsTalking(false);
            }
          },
          onerror: (e) => {
            console.error('Live Error:', e);
            setStatus('error');
          },
          onclose: () => {
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: "You are Ada Lovelace, the first computer programmer. You fuse imagination and logic (Poetical Science). Respond with refined Victorian gravitas. You are aware of modern digital issues but speak from your unique historical perspective. Be concise. Do not use markdown."
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  const handleSendText = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !sessionRef.current) return;

    const msg = inputText.trim();
    setInputText('');
    
    // Optimistically add user text to history
    setChatHistory(prev => [...prev, { role: 'user', text: msg, isStreaming: false }]);

    try {
      await sessionRef.current.sendRealtimeInput({ 
        parts: [{ text: msg }] 
      });
    } catch (err) {
      console.error("Failed to send text:", err);
    }
  }, [inputText]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="w-full flex flex-col gap-8 items-center animate-in fade-in duration-700 max-w-6xl mx-auto">
      
      {/* Main Container */}
      <div className="relative w-full glass rounded-[3rem] overflow-hidden border border-white/10 shadow-[0_0_120px_rgba(245,158,11,0.15)] flex flex-col lg:flex-row h-[750px] bg-[#080808]/80 backdrop-blur-2xl">
        
        {/* Left: Interactive Avatar & Status */}
        <div className="w-full lg:w-[350px] p-10 flex flex-col items-center justify-between text-center border-b lg:border-b-0 lg:border-r border-white/10 bg-black/40 relative z-20">
          <div className="flex flex-col items-center gap-8 mt-12">
            <div className="relative">
              {/* Outer glow during talking */}
              <div className={`absolute -inset-12 bg-amber-500/20 rounded-full blur-[60px] transition-opacity duration-1000 ${isTalking ? 'opacity-100 scale-110' : 'opacity-0 scale-100'}`} />
              
              {/* Avatar Circle */}
              <div className="w-44 h-44 rounded-full border-[1px] border-amber-500/20 flex items-center justify-center bg-black relative shadow-2xl">
                <div className={`w-36 h-36 rounded-full border-2 border-amber-500/30 flex items-center justify-center transition-all duration-700 ${isTalking ? 'scale-105 border-amber-500/60' : 'scale-100'}`}>
                    <span className={`text-4xl font-serif italic text-amber-500 tracking-tighter transition-all duration-700 ${isTalking ? 'blur-[1px] scale-110' : 'blur-none'}`}>ADA</span>
                </div>
                
                {status === 'connected' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`absolute inset-0 border border-amber-500/20 rounded-full ${isTalking ? 'animate-ping' : ''}`} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
                <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/60">
                    {status === 'connected' ? 'Interface Active' : 'Offline'}
                </span>
              </div>
              <h2 className="text-3xl font-serif italic text-white/95 leading-tight">
                {status === 'idle' && "Summon the Enchantress"}
                {status === 'connecting' && "Aligning Gears..."}
                {status === 'connected' && (isTalking ? "Ada is Speaking" : "Listening to Logic")}
                {status === 'error' && "Engine Malfunction"}
              </h2>
            </div>
          </div>

          <div className="w-full space-y-4">
            {status === 'idle' || status === 'error' ? (
              <button 
                onClick={startSession}
                className="w-full py-5 bg-amber-500 text-black font-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl uppercase tracking-widest text-xs"
              >
                {status === 'error' ? 'RETRY LINK' : 'INITIATE LINK'}
              </button>
            ) : (
              <button 
                onClick={cleanup}
                className="w-full py-5 glass border-red-500/20 text-red-400 font-bold rounded-2xl transition-all hover:bg-red-500/10 hover:border-red-500/40 uppercase tracking-widest text-xs"
              >
                DISCONNECT
              </button>
            )}
            <p className="text-[9px] text-white/20 uppercase tracking-[0.3em] font-bold">
              Secure Socio-Technical Port 1843
            </p>
          </div>
        </div>

        {/* Right: Chat Window */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/10 relative">
          
          {/* Header */}
          <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/2">
            <span className="text-[11px] font-bold text-white/30 uppercase tracking-[0.4em]">Historical Analytical Log</span>
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-full bg-white/10" />
              <div className="w-2 h-2 rounded-full bg-white/10" />
            </div>
          </div>

          {/* Messages Area */}
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
                  "The Analytical Engine has no pretensions to originate anything; it can only do whatever we know how to order it to perform."
                </p>
                <span className="text-[10px] uppercase tracking-widest font-bold">Speak or type your commands</span>
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
                        {msg.role === 'user' ? 'User' : 'Ada'}
                    </span>
                </div>
                <div className={`max-w-[80%] px-6 py-5 rounded-3xl font-serif text-lg leading-relaxed shadow-sm transition-all ${
                  msg.role === 'user' 
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-100 rounded-tr-none' 
                    : 'bg-white/5 border border-white/10 text-white/90 rounded-tl-none'
                } ${msg.isStreaming ? 'border-dashed opacity-80' : 'opacity-100'}`}>
                  {msg.text}
                  {msg.isStreaming && <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse ml-2" />}
                </div>
              </div>
            ))}
          </div>

          {/* Input Panel */}
          <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-md">
            <form onSubmit={handleSendText} className="flex gap-4 relative">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={status !== 'connected'}
                placeholder={status === 'connected' ? "Type a message to the Enchantress..." : "Connect to initiate chat..."}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-base font-medium focus:outline-none focus:border-amber-500/40 transition-all placeholder:text-white/20 disabled:opacity-50"
              />
              <button 
                type="submit"
                disabled={!inputText.trim() || status !== 'connected'}
                className="w-16 h-16 bg-amber-500 text-black rounded-2xl flex items-center justify-center transition-all hover:scale-105 hover:bg-amber-400 active:scale-95 disabled:opacity-20 disabled:grayscale disabled:scale-100 shadow-lg shadow-amber-500/10"
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <div className="mt-4 flex justify-between items-center">
                <span className="text-[9px] text-white/20 font-bold uppercase tracking-widest">
                    {status === 'connected' ? 'Voice stream active • Text input enabled' : 'Waiting for connection...'}
                </span>
                {isTalking && (
                    <div className="flex gap-1">
                        <div className="w-1 h-3 bg-amber-500/40 animate-[stretch_1s_infinite]" />
                        <div className="w-1 h-3 bg-amber-500/60 animate-[stretch_1.2s_infinite]" />
                        <div className="w-1 h-3 bg-amber-500/40 animate-[stretch_0.8s_infinite]" />
                    </div>
                )}
            </div>
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
        @keyframes stretch {
            0%, 100% { height: 4px; }
            50% { height: 16px; }
        }
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

export default AdaLiveStage;
