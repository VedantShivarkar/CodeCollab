"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Code2, Mail, Lock, ArrowRight, UserPlus, LogIn, Users, PlusCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // App State
  const [step, setStep] = useState<'auth' | 'room'>('auth');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setStep('room');
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Proceed to room selection on successful signup
        setStep('room');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Proceed to room selection on successful login
        setStep('room');
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    // Generate a secure, random room ID
    const newRoomId = `room-${Math.random().toString(36).substring(2, 10)}`;
    router.push(`/?room=${newRoomId}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) {
      setErrorMsg('Please enter a valid Room ID.');
      return;
    }
    router.push(`/?room=${joinRoomId.trim()}`);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setStep('auth');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="h-screen w-screen bg-[#0d1117] flex items-center justify-center font-sans">
      <div className="w-full max-w-md p-8 bg-[#161b22] border border-gray-800 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-blue-600 rounded-xl mb-4 shadow-[0_0_25px_rgba(37,99,235,0.4)]">
            <Code2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">CollabCode</h1>
          <p className="text-gray-500 text-sm font-mono mt-1">
            {step === 'auth' ? 'Enterprise Authentication' : 'Workspace Routing'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* STAGE 1: AUTHENTICATION */}
        {step === 'auth' && (
          <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-600" size={18} />
                <input 
                  type="email" required 
                  className="w-full bg-[#0d1117] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                  placeholder="name@enterprise.com" value={email} onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-600" size={18} />
                <input 
                  type="password" required minLength={6}
                  className="w-full bg-[#0d1117] border border-gray-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 shadow-lg"
            >
              {loading ? 'Processing...' : authMode === 'signin' ? <><LogIn size={18}/> Secure Sign In</> : <><UserPlus size={18}/> Create Account</>}
            </button>

            <div className="text-center mt-6 pt-4 border-t border-gray-800">
              <button 
                type="button"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setErrorMsg(''); }}
                className="text-xs text-gray-400 hover:text-blue-400 transition-colors"
              >
                {authMode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
          </form>
        )}

        {/* STAGE 2: ROOM MANAGEMENT */}
        {step === 'room' && (
          <div className="space-y-6 animate-fade-in">
            <div className="p-4 bg-[#0d1117] border border-emerald-500/30 rounded-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2"><PlusCircle size={16} className="text-emerald-500"/> Start Fresh</h3>
              <p className="text-xs text-gray-400 mb-4">Initialize a new secure peer-to-peer workspace.</p>
              <button 
                onClick={handleCreateRoom}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg"
              >
                Create New Room
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-[10px] uppercase font-bold text-gray-600 tracking-widest">OR</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            <form onSubmit={handleJoinRoom} className="p-4 bg-[#0d1117] border border-blue-500/30 rounded-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2"><Users size={16} className="text-blue-500"/> Join Team</h3>
              <p className="text-xs text-gray-400 mb-4">Enter an existing Session ID to connect.</p>
              <input 
                type="text" required 
                className="w-full bg-black border border-gray-700 rounded-lg py-2.5 px-3 text-sm text-white focus:border-blue-500 outline-none transition-all mb-3 font-mono"
                placeholder="room-xxxxxxxx" value={joinRoomId} onChange={e => setJoinRoomId(e.target.value)}
              />
              <button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Connect <ArrowRight size={16}/>
              </button>
            </form>

            <div className="text-center pt-2">
              <button onClick={handleSignOut} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                Sign Out
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}