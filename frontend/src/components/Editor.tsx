"use client";

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';
import { supabase } from '../lib/supabase'; // Injecting the DB client

export default function CollaborativeEditor() {
  const editorRef = useRef<any>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebrtcProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  // State Management
  const [aiAnalysis, setAiAnalysis] = useState<string>("AI analysis will appear here.");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [terminalOutput, setTerminalOutput] = useState<string>("Ready to execute local Wasm...");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Hardcoding a room ID for the hackathon MVP demo
  const DEMO_ROOM_ID = "collabcode-main-room";

  useEffect(() => {
    // Cleanup function for React 18 Strict Mode
    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (ydocRef.current) ydocRef.current.destroy();
    };
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    
    const provider = new WebrtcProvider(DEMO_ROOM_ID, ydoc, {
      signaling: ['ws://localhost:4444']
    });
    providerRef.current = provider;

    const ytext = ydoc.getText('monaco');

    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      provider.awareness
    );
    bindingRef.current = binding;

    provider.awareness.setLocalStateField('user', {
      name: `User-${Math.floor(Math.random() * 1000)}`,
      color: '#' + Math.floor(Math.random()*16777215).toString(16) 
    });
  };

  // FEATURE: AI AST Analysis
  const handleAIPrediction = async () => {
    if (!editorRef.current) return;
    const currentCode = editorRef.current.getValue();
    setIsAnalyzing(true);
    setAiAnalysis("Analyzing Abstract Syntax Tree...");

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, language: 'python' }),
      });
      const data = await res.json();
      if (res.ok) setAiAnalysis(data.reply);
      else setAiAnalysis(`Engine Error: ${data.error}`);
    } catch (error) {
      setAiAnalysis("Network failure: Could not reach the AI signaling server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // FEATURE: Zero-Latency Wasm Execution
  const handleRunWasm = async () => {
    if (!editorRef.current) return;
    const currentCode = editorRef.current.getValue();
    setIsRunning(true);
    setTerminalOutput("Booting secure Pyodide (Wasm) environment locally...\n");

    try {
      // @ts-ignore
      if (!window.loadPyodide) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js";
        document.body.appendChild(script);
        await new Promise((resolve) => { script.onload = resolve; });
      }
      // @ts-ignore
      if (!window.pyodideInstance) {
        // @ts-ignore
        window.pyodideInstance = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.0/full/"
        });
      }
      // @ts-ignore
      const pyodide = window.pyodideInstance;

      pyodide.runPython(`
import sys
import io
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);

      await pyodide.runPythonAsync(currentCode);
      const stdout = pyodide.runPython("sys.stdout.getvalue()");
      const stderr = pyodide.runPython("sys.stderr.getvalue()");

      setTerminalOutput((stdout + stderr) || "Execution complete. No output returned.");
    } catch (err: any) {
      setTerminalOutput(`Runtime Exception:\n${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // FEATURE: B2B Viral Invite
  const handleInvite = async () => {
    const email = prompt("Enter a developer's email to invite them to this session:");
    if (!email) return;
    
    alert(`Dispatching secure invite to ${email}...`);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, sessionUrl: window.location.href })
      });
      if (res.ok) alert("Invite successfully deployed!");
      else alert("Backend Error sending invite.");
    } catch (err) {
      alert("Network Error: Notification server unreachable.");
    }
  };

  // FEATURE: Enterprise Database Persistence
  const handleSaveSession = async () => {
    if (!editorRef.current) return;
    const currentCode = editorRef.current.getValue();
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert([
          { room_id: DEMO_ROOM_ID, code_content: currentCode, language: 'python' }
        ]);

      if (error) throw error;
      
      alert("✅ Enterprise Snapshot Saved to PostgreSQL!");
    } catch (err: any) {
      console.error("Supabase Save Error:", err);
      alert(`Database Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0d1117] text-gray-300 font-sans overflow-hidden">
      
      {/* LEFT COLUMN: THE CODE EDITOR */}
      <div className="flex-[2] flex flex-col border-r border-gray-800 h-screen">
        <div className="bg-[#161b22] p-4 flex justify-between items-center border-b border-gray-800 h-[60px] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <h2 className="ml-2 text-sm font-semibold tracking-wide text-gray-400 uppercase">CollabCode // Editor</h2>
          </div>
          <span className="text-xs px-2 py-1 bg-green-900 text-green-400 rounded-md shadow-[0_0_10px_rgba(34,197,94,0.2)]">Room: Connected (Local Sync)</span>
        </div>
        
        <div className="w-full" style={{ height: 'calc(100vh - 60px)' }}>
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            defaultLanguage="python"
            defaultValue={'print("Welcome to CollabCode!")\n\n# Code is synced via WebRTC.\n# Click Save to persist to PostgreSQL.'}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              wordWrap: "on",
              padding: { top: 16 }
            }}
          />
        </div>
      </div>

      {/* RIGHT COLUMN: AI & TERMINAL */}
      <div className="flex-[1.5] flex flex-col bg-[#0d1117] h-screen">
        
        {/* Controls */}
        <div className="p-4 bg-[#161b22] border-b border-gray-800 flex gap-2 h-[60px] shrink-0">
          <button 
            onClick={handleRunWasm}
            disabled={isRunning}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-green-400 py-2 rounded-md text-sm font-bold transition-all border border-gray-700 disabled:opacity-50"
          >
            {isRunning ? "Running..." : "▶ Run (Wasm)"}
          </button>
          <button 
            onClick={handleAIPrediction}
            disabled={isAnalyzing}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:opacity-50"
          >
            {isAnalyzing ? "✨ Analyzing..." : "✨ Predict"}
          </button>
          <button 
            onClick={handleSaveSession}
            disabled={isSaving}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "💾 Save"}
          </button>
          <button 
            onClick={handleInvite}
            className="flex-none px-4 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            ✉️
          </button>
        </div>

        {/* AI Analysis Panel */}
        <div className="flex-[2] p-4 border-b border-gray-800 flex flex-col overflow-hidden">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 shrink-0">AI Code Analysis</h3>
          <div className="flex-1 overflow-y-auto bg-[#090c10] border border-gray-800 rounded-lg p-4 font-mono text-sm shadow-inner scrollbar-thin">
            {isAnalyzing ? (
              <span className="text-purple-400 animate-pulse">Scanning Abstract Syntax Tree...</span>
            ) : (
              <pre className="text-green-400 whitespace-pre-wrap break-words">{aiAnalysis}</pre>
            )}
          </div>
        </div>

        {/* Local Wasm Terminal Output */}
        <div className="flex-[1.5] p-4 flex flex-col overflow-hidden bg-black">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 shrink-0">Terminal Output (Local)</h3>
          <div className="flex-1 overflow-y-auto rounded-lg font-mono text-sm text-gray-300">
            <pre className="whitespace-pre-wrap break-words">{terminalOutput}</pre>
          </div>
        </div>

      </div>
    </div>
  );
}