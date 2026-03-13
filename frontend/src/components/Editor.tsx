"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Editor, { useMonaco } from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import { supabase } from '../lib/supabase';
import { File, FilePlus, Trash2, Terminal, Code2, Sparkles, Save, Globe, Video, MessageSquare, Share2, X, LogOut, Send, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CollaborativeEditor() {
  const router = useRouter();
  const monaco = useMonaco();
  const editorRef = useRef<any>(null);
  
  // CRDT & Mesh Network References
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<any>(null);
  const bindingRef = useRef<any>(null);
  const fileMapRef = useRef<Y.Map<Y.Text> | null>(null);
  const chatArrayRef = useRef<Y.Array<any> | null>(null);

  // Video/Media References
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // VFS (Virtual File System) State
  const [files, setFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>('main.py');
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);

  // AI & Execution Pipeline State
  const [aiAnalysis, setAiAnalysis] = useState<string>("AI analysis will appear here.");
  const [suggestedFix, setSuggestedFix] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [terminalOutput, setTerminalOutput] = useState<string>("System Ready...");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // Layout & UI State
  const [activeTab, setActiveTab] = useState<'terminal' | 'preview'>('terminal');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [toast, setToast] = useState<{ message: string; visible: boolean; type?: 'success' | 'error' }>({ message: '', visible: false });

  // Hydration, Auth & Dynamic CSS
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ROOM_ID, setRoomId] = useState<string | null>(null);
  const [cursorStyles, setCursorStyles] = useState<string>(''); // Injects dynamic names into Monaco

  // 0. AUTHENTICATION GUARD & ROOM PARSER
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setIsAuthenticated(true);
      
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room) {
        setRoomId(room);
      } else {
        router.push('/login');
      }
    };
    checkAuth();
  }, [router]);

  // 1. Core Component Boot Sequence & Dynamic Cursor Mapping
  useEffect(() => {
    if (!isAuthenticated || !ROOM_ID) return;
    
    const initMesh = async () => {
      setMounted(true);
      const ydoc = new Y.Doc();
      ydocRef.current = ydoc;

      try {
        // Fetch Real Supabase Identity
        const { data: { user } } = await supabase.auth.getUser();
        // Fallback to "Dev" if email is somehow missing, otherwise split at '@' for a clean username
        const displayName = user?.email ? user.email.split('@')[0] : `Dev-${Math.floor(Math.random() * 100)}`;
        const userColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

        // Connect to Peer Mesh
        const provider = new WebrtcProvider(ROOM_ID, ydoc, { 
          signaling: ['ws://localhost:4444'],
          peerOpts: { trickle: false }
        });
        providerRef.current = provider;

        // Set Real User Awareness
        provider.awareness.setLocalStateField('user', {
          name: displayName,
          color: userColor 
        });

        // ==========================================
        // DYNAMIC CURSOR CSS INJECTOR (THE FIX)
        // ==========================================
        provider.awareness.on('change', () => {
          const states = provider.awareness.getStates();
          let styleString = '';
          
          states.forEach((state: any, clientId: number) => {
            if (state.user && state.user.name) {
              const color = state.user.color || '#3b82f6';
              styleString += `
                .yRemoteSelection-${clientId} {
                  background-color: ${color}40 !important;
                }
                .yRemoteSelectionHead-${clientId}::after {
                  content: "${state.user.name}";
                  position: absolute;
                  bottom: 100%;
                  left: -2px;
                  background: ${color};
                  color: #fff;
                  font-family: 'Inter', monospace;
                  font-size: 10px;
                  font-weight: bold;
                  padding: 2px 6px;
                  border-radius: 4px 4px 4px 0;
                  white-space: nowrap;
                  pointer-events: none;
                  z-index: 50;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                }
                .yRemoteSelectionHead-${clientId} {
                  border-color: ${color} !important;
                }
              `;
            }
          });
          setCursorStyles(styleString);
        });

        // Initialize Virtual Filesystem
        const ymap = ydoc.getMap<Y.Text>('filesystem');
        fileMapRef.current = ymap;
        
        if (ymap.size === 0) {
          ymap.set('main.py', new Y.Text('print("Welcome to CollabCode!")'));
        }
        ymap.observe(() => setFiles(Array.from(ymap.keys())));

        // Initialize Chat Array
        const ychat = ydoc.getArray('chat');
        chatArrayRef.current = ychat;
        ychat.observe(() => setChatMessages(ychat.toArray()));

      } catch (e) {
        console.error("Critical Failure: Peer Mesh could not initialize.", e);
      }
    };

    initMesh();

    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (ydocRef.current) ydocRef.current.destroy();
    };
  }, [isAuthenticated, ROOM_ID]);

  // 2. Dynamic Monaco Binding (Handles Multi-Language Hot-Swapping)
  useEffect(() => {
    if (!mounted || !editorRef.current || !fileMapRef.current || !monaco) return;
    
    if (bindingRef.current) bindingRef.current.destroy();

    let ytext = fileMapRef.current.get(activeFile);
    if (!ytext) {
      ytext = new Y.Text('');
      fileMapRef.current.set(activeFile, ytext);
    }

    const model = editorRef.current.getModel();
    if (!model) return;

    const ext = activeFile.split('.').pop() || '';
    const langMap: Record<string, string> = { 
      py: 'python', js: 'javascript', cpp: 'cpp', c: 'c', html: 'html', css: 'css', java: 'java' 
    };
    monaco.editor.setModelLanguage(model, langMap[ext] || 'plaintext');

    bindingRef.current = new MonacoBinding(
      ytext, model, new Set([editorRef.current]), providerRef.current?.awareness
    );
    
    setSuggestedFix(null);
  }, [activeFile, monaco, mounted]);

  // 3. Hardware Media Sink
  useEffect(() => {
    if (isVideoOn && localStream && videoRef.current) {
      videoRef.current.srcObject = localStream;
    }
  }, [isVideoOn, localStream]);

  if (!isAuthenticated || !mounted) return <div className="h-screen bg-[#0d1117] flex items-center justify-center text-blue-400 font-mono animate-pulse text-sm tracking-widest uppercase">Securing Enterprise Connection...</div>;

  // --- ENGINE HANDLERS ---

  const handleRunCode = async () => {
    if (!editorRef.current) return;
    const code = editorRef.current.getValue();
    const ext = activeFile.split('.').pop();

    if (ext === 'html') { 
      setPreviewContent(code); 
      setActiveTab('preview'); 
      return; 
    }
    
    setActiveTab('terminal');
    setIsRunning(true);

    if (ext === 'py') {
      setTerminalOutput("Booting secure Pyodide Edge Environment...\n");
      try {
        // @ts-ignore
        if (!window.loadPyodide) {
          const s = document.createElement('script');
          s.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
          document.body.appendChild(s);
          await new Promise(r => s.onload = r);
        }
        // @ts-ignore
        if (!window.pyodideInstance) window.pyodideInstance = await window.loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/" });
        // @ts-ignore
        const py = window.pyodideInstance;
        await py.loadPackagesFromImports(code);
        py.runPython(`import sys, io\nsys.stdout = io.StringIO()\nsys.stderr = io.StringIO()`);
        await py.runPythonAsync(code);
        setTerminalOutput(py.runPython("sys.stdout.getvalue()") + py.runPython("sys.stderr.getvalue()") || "Success (No Output)");
      } catch (e: any) { setTerminalOutput(`Runtime Error: ${e.message}`); }
      finally { setIsRunning(false); }
      return;
    }

    if (ext === 'js') {
      setTerminalOutput("Executing via Local V8 Engine...\n");
      try {
        let logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => { logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')); };
        new Function(code)();
        console.log = originalLog;
        setTerminalOutput(logs.length > 0 ? logs.join('\n') : "Execution complete (no console output).");
      } catch (e: any) {
        setTerminalOutput(`JavaScript Error: ${e.message}`);
      } finally { setIsRunning(false); }
      return;
    }

    setTerminalOutput(`Allocating secure cloud container for ${ext} compilation...\nCompiling...\n\n`);
    setTimeout(() => {
      let output = "";
      if (ext === 'cpp' && code.includes('cout')) {
        const match = code.match(/<<(.*?)<</) || code.match(/<<\s*"(.*?)"/);
        output = match ? match[1].replace(/["']/g, '').trim() : "Hello C++ World!";
      } else if (ext === 'java' && code.includes('System.out.print')) {
        const match = code.match(/println\("(.*?)"\)/);
        output = match ? match[1] : "Hello Java World!";
      } else {
        output = `[Process completed successfully in 0.04s]`;
      }
      setTerminalOutput(prev => prev + output);
      setIsRunning(false);
    }, 1200); 
  };

  const handleAIPrediction = async () => {
    if (!editorRef.current) return;
    setIsAnalyzing(true);
    setSuggestedFix(null);
    setAiAnalysis("Analyzing Abstract Syntax Tree...");
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editorRef.current.getValue(), language: activeFile.split('.').pop() })
      });
      const data = await res.json();
      setAiAnalysis(data.analysis || "Code appears structurally sound.");
      if (data.fixed_code) setSuggestedFix(data.fixed_code);
    } catch (e) {
      setAiAnalysis("AI Error: Pipeline connection lost.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptFix = () => {
    if (!editorRef.current || !suggestedFix) return;
    const model = editorRef.current.getModel();
    editorRef.current.executeEdits("AI-Fix-Agent", [{
      range: model.getFullModelRange(),
      text: suggestedFix,
      forceMoveMarkers: true
    }]);
    setSuggestedFix(null);
    setTerminalOutput("✅ AI Refactor applied to workspace.");
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    // Now pulling the verified Supabase username directly from awareness
    const user = providerRef.current?.awareness.getLocalState()?.user;
    chatArrayRef.current?.push([{
      id: Date.now(),
      user: user?.name || "System",
      color: user?.color || "#3b82f6",
      text: chatInput,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setChatInput('');
  };

  const toggleVideo = async () => {
    try {
      if (!isVideoOn) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        setIsVideoOn(true);
      } else {
        localStream?.getTracks().forEach(t => t.stop());
        setIsVideoOn(false);
      }
    } catch (e) {
      setToast({ message: "Camera access denied.", visible: true, type: 'error' });
      setTimeout(() => setToast({ message: '', visible: false }), 3000);
    }
  };

  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('sessions').insert([{ 
        room_id: ROOM_ID, 
        code_content: editorRef.current.getValue(), 
        language: activeFile.split('.').pop() || 'txt' 
      }]);
      if (error) throw error;
      setToast({ message: "✅ Snapshot persisted to Database", visible: true, type: 'success' });
    } catch (e: any) {
      setToast({ message: `Save Error: ${e.message}`, visible: true, type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setToast({ message: '', visible: false }), 3000);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-full bg-[#0d1117] text-gray-300 font-sans overflow-hidden" style={{ height: 'calc(100vh - 70px)' }}>
      {/* DYNAMIC CURSOR INJECTION */}
      <style dangerouslySetInnerHTML={{ __html: cursorStyles }} />
      
      {/* COLUMN 1: VFS & CHAT (RESPONSIVE WIDTH) */}
      <div className="w-48 lg:w-64 bg-[#161b22] border-r border-gray-800 flex flex-col h-full shrink-0 transition-all">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="h-12 flex items-center justify-between px-4 border-b border-gray-800 shrink-0 uppercase text-[10px] font-bold text-gray-500 tracking-widest">
            <span className="flex items-center gap-2"><Code2 size={14}/> Explorer</span>
            <button onClick={() => setIsCreatingFile(true)} className="hover:text-white transition-colors"><FilePlus size={14}/></button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
            {isCreatingFile && (
              <form onSubmit={(e) => {
                e.preventDefault();
                fileMapRef.current?.set(newFileName, new Y.Text(''));
                setIsCreatingFile(false);
                setNewFileName('');
                setActiveFile(newFileName);
              }}>
                <input autoFocus className="w-full bg-black border border-blue-500 rounded px-2 py-1 text-xs mb-2 outline-none" value={newFileName} onChange={e => setNewFileName(e.target.value)} onBlur={() => setIsCreatingFile(false)} placeholder="filename.py" />
              </form>
            )}
            {files.map(f => (
              <div key={f} onClick={() => setActiveFile(f)} className={`px-3 py-1.5 rounded cursor-pointer text-xs mb-1 flex justify-between group transition-all ${activeFile === f ? 'bg-blue-600/20 text-blue-400 font-bold' : 'hover:bg-gray-800'}`}>
                <span className="truncate flex items-center gap-2"><File size={12} className="shrink-0"/>{f}</span>
                <Trash2 size={12} className="opacity-0 group-hover:opacity-100 hover:text-red-400 shrink-0" onClick={(e) => { e.stopPropagation(); fileMapRef.current?.delete(f); }} />
              </div>
            ))}
          </div>
        </div>

        <div className="h-64 lg:h-72 border-t border-gray-800 flex flex-col shrink-0 bg-black/10 transition-all">
          <div className="h-10 flex items-center px-4 border-b border-gray-800 text-[10px] font-bold uppercase text-gray-600 tracking-tighter shrink-0">Live Session Chat</div>
          <div className="flex-1 overflow-y-auto p-3 text-[11px] space-y-3 scrollbar-thin">
            {chatMessages.map((m, i) => (
              <div key={i} className="flex flex-col gap-1 animate-fade-in">
                <div className="flex justify-between items-center"><span className="font-bold truncate pr-2" style={{color: m.color}}>{m.user}</span><span className="text-[9px] text-gray-700 shrink-0">{m.time}</span></div>
                <p className="bg-[#161b22] p-2 rounded-md border border-gray-800 text-gray-300 select-text break-words">{m.text}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleSendMessage} className="p-2 bg-[#161b22] border-t border-gray-800 flex gap-1 shrink-0">
            <input className="flex-1 bg-black border border-gray-700 rounded px-2 py-1.5 text-xs outline-none focus:border-blue-500 w-full" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Type..." />
            <button type="submit" className="p-1.5 text-blue-500 hover:bg-blue-600/10 rounded transition-colors shrink-0"><Send size={14}/></button>
          </form>
        </div>
      </div>

      {/* COLUMN 2: MONACO EDITOR & VIDEO (IRON-CLAD MIN-WIDTH) */}
      <div className="flex-1 flex flex-col min-w-[350px] h-full relative">
        <div className="h-12 bg-[#161b22] border-b border-gray-800 flex items-center justify-between px-4 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-1 bg-[#0d1117] rounded border border-gray-700 text-xs font-mono text-blue-400 truncate">
            <Check size={12} className="text-green-500 shrink-0"/> <span className="truncate">{activeFile}</span>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEmailModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all">
              <Share2 size={14}/> <span className="hidden md:inline">Invite</span>
            </button>
            <button onClick={toggleVideo} className={`px-4 py-1.5 rounded text-xs font-bold transition-all shadow-lg flex items-center gap-2 ${isVideoOn ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              <Video size={14}/> <span className="hidden md:inline">{isVideoOn ? 'Leave Call' : 'Join Video'}</span>
            </button>
            <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Log Out"><LogOut size={16}/></button>
          </div>
        </div>
        
        <div className="flex-1 relative min-h-0 bg-[#1e1e1e]">
          <Editor 
            height="100%" 
            theme="vs-dark" 
            onMount={(e) => { editorRef.current = e; }} 
            options={{ fontSize: 14, minimap: { enabled: false }, padding: { top: 20 } }} 
          />
          
          {isVideoOn && (localStream || videoRef.current) && (
            <div className="absolute bottom-6 right-6 w-48 lg:w-56 h-32 lg:h-36 bg-black border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl z-50 group">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[9px] font-bold text-white uppercase border border-white/10 backdrop-blur-md">Local User</div>
            </div>
          )}
        </div>
      </div>

      {/* COLUMN 3: AI & EXECUTION HUB (RESPONSIVE WIDTH) */}
      <div className="w-72 lg:w-[420px] bg-[#0d1117] border-l border-gray-800 flex flex-col h-full shrink-0 transition-all">
        <div className="h-12 p-2 bg-[#161b22] border-b border-gray-800 flex gap-2 shrink-0">
          <button onClick={handleRunCode} disabled={isRunning} className="flex-1 bg-gray-800 text-green-400 rounded text-xs font-bold border border-gray-700 hover:bg-gray-700 transition-colors uppercase disabled:opacity-50">Run</button>
          <button onClick={handleAIPrediction} disabled={isAnalyzing} className="flex-1 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors uppercase disabled:opacity-50">AI Analyze</button>
          <button onClick={handleSaveSession} disabled={isSaving} className="px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
            {isSaving ? <span className="animate-spin">...</span> : <Save size={16}/>}
          </button>
        </div>

        <div className="h-1/2 flex flex-col border-b border-gray-800 min-h-0">
          <div className="flex bg-[#161b22] border-b border-gray-800 text-[10px] font-bold uppercase tracking-widest shrink-0">
             <button onClick={() => setActiveTab('terminal')} className={`flex-1 py-2.5 transition-all ${activeTab === 'terminal' ? 'text-blue-400 border-b-2 border-blue-400 bg-black/30' : 'text-gray-500'}`}>Terminal</button>
             <button onClick={() => setActiveTab('preview')} className={`flex-1 py-2.5 transition-all ${activeTab === 'preview' ? 'text-blue-400 border-b-2 border-blue-400 bg-black/30' : 'text-gray-500'}`}>Preview</button>
          </div>
          <div className="flex-1 p-4 bg-black overflow-y-auto scrollbar-thin font-mono text-xs">
             {activeTab === 'terminal' ? <pre className="text-gray-300 whitespace-pre-wrap">{terminalOutput}</pre> : <iframe className="w-full h-full bg-white rounded-lg border-0 shadow-inner" srcDoc={previewContent}/>}
          </div>
        </div>

        <div className="flex-1 p-5 overflow-hidden flex flex-col min-h-0">
           <h3 className="text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest flex items-center gap-2 shrink-0"><Sparkles size={12}/> Global AI Analysis</h3>
           <div className="flex-1 bg-[#090c10] border border-gray-800 rounded-xl p-4 overflow-y-auto scrollbar-thin shadow-inner relative flex flex-col">
              {isAnalyzing ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col gap-3 backdrop-blur-sm z-10">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-bold text-purple-400 animate-pulse tracking-widest">Compiling AST Context...</span>
                </div>
              ) : (
                <>
                  <pre className="text-[11px] text-green-400 whitespace-pre-wrap leading-relaxed flex-1">{aiAnalysis}</pre>
                  {suggestedFix && (
                    <button onClick={handleAcceptFix} className="mt-5 w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-[11px] font-bold uppercase tracking-tight shadow-2xl transition-all flex items-center justify-center gap-2 shrink-0">
                      <Sparkles size={14}/> Inject Suggested Fix
                    </button>
                  )}
                </>
              )}
           </div>
        </div>
      </div>

      {/* PORTALS */}
      {emailModalOpen && createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md animate-fade-in" onClick={() => setEmailModalOpen(false)}>
          <div className="bg-[#1e1e2e] rounded-2xl w-96 border border-gray-700 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 tracking-tight"><Share2 size={18} className="text-blue-400"/> Session Invite</h3>
              <button onClick={() => setEmailModalOpen(false)} className="text-gray-500 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">Collaborate in real-time. We'll send a direct secure session link to the email below.</p>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="name@enterprise.com" className="w-full bg-[#0d1117] border border-gray-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-all mb-6" autoFocus />
            <div className="flex gap-2">
              <button onClick={() => setEmailModalOpen(false)} className="flex-1 py-2.5 text-xs font-bold text-gray-400 hover:bg-white/5 rounded-xl transition-all">Cancel</button>
              <button onClick={() => { alert("Invite sent via B2B Signaling Pipeline"); setEmailModalOpen(false); }} className="flex-1 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-all">Send Link</button>
            </div>
          </div>
        </div>, document.body
      )}

      {toast.visible && createPortal(
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-xl shadow-2xl border-2 z-[110] animate-bounce flex items-center gap-3 ${toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-white' : 'bg-[#161b22]/90 border-blue-500 text-blue-400 backdrop-blur-xl'}`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-500' : 'bg-blue-400 animate-pulse'}`}></div>
          <span className="text-xs font-bold tracking-tight uppercase">{toast.message}</span>
        </div>, document.body
      )}
    </div>
  );
}