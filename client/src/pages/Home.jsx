import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, ArrowRight, Upload, Zap, Github, Star, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

const Home = () => {
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomCode.trim()) {
      navigate(`/room/${roomCode}`);
    }
  };

  const handleCreate = () => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    navigate(`/room/${randomCode}`);
  };

  return (
    <div className="min-h-screen bg-chamber-black text-chamber-white font-body overflow-x-hidden relative flex flex-col">
      {/* Tactical Animated Background */}
      <div className="fixed inset-0 z-0 bg-chamber-black overflow-hidden">
        {/* Base Character Image */}
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{ backgroundImage: "url('/chamber4.webp')" }}
        ></div>
        
        {/* Darkening Gradient for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-chamber-black/95 via-chamber-black/60 to-chamber-black/95"></div>

        {/* High-Tech Glowing Dot Matrix */}
        <div className="absolute inset-[-50%] chamber-dot-matrix opacity-30 pointer-events-none"></div>
        
        {/* Tactical Grid Overlay */}
        <div className="absolute inset-0 bg-tactical-grid opacity-10"></div>
      </div>
      
      {/* Ambient Lighting */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-chamber-gold/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-chamber-navy/40 rounded-full blur-[100px] pointer-events-none z-0"></div>

      <div className="container mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center relative z-10">
        
        {/* Main Title Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 relative w-full max-w-2xl"
        >
          {/* Subtle Grid Behind Title */}
          <div className="absolute inset-0 bg-tactical-grid opacity-20 -z-10"></div>
          
          <div className="inline-flex flex-col items-center">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.2 }}
              className="h-px bg-chamber-gold/50 mb-6"
            />
            
            <h1 className="text-5xl md:text-8xl font-display font-bold uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-chamber-white to-gray-400 holographic-text relative">
              DEAD DROP
              <span className="absolute -inset-1 opacity-20 bg-chamber-glow blur-2xl -z-10 animate-pulse-glow"></span>
            </h1>
            
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 1, delay: 0.4 }}
              className="h-px bg-chamber-gold/50 mt-6 mb-4"
            />

            <p className="mt-2 text-sm md:text-base font-mono uppercase tracking-[0.3em] text-chamber-gold font-light">
              Secure • Ephemeral • Precise
            </p>
          </div>
        </motion.div>

        {/* Action Interface */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl relative">
          
          {/* Join Module */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-panel p-8 relative overflow-hidden group"
          >
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-chamber-gold"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-chamber-gold"></div>

            <div className="flex items-center gap-4 mb-8">
              <div className="text-chamber-gold bg-chamber-gold/10 p-3">
                <Crosshair size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-display uppercase tracking-widest text-chamber-white font-light">Access Node</h2>
            </div>
            
            <form onSubmit={handleJoin} className="flex flex-col gap-6">
              <div className="relative">
                <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Target Coordinate [Room Code]</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="ENTER DESIGNATION"
                    className="tactical-input pl-4"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none opacity-50 text-chamber-gold">
                    <span className="animate-pulse">_</span>
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={!roomCode}
                className="tactical-btn w-full flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
              >
                <span>Initialize</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                <div className="tactical-btn-flare"></div>
              </button>
            </form>
          </motion.div>

          {/* Create Module */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="glass-panel p-8 relative overflow-hidden group"
          > 
            {/* Corner Accents */}
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-chamber-gold"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-chamber-gold"></div>

             {/* Tactical Status Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-chamber-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-chamber-glow"></span>
              </span>
              <span className="text-[10px] font-mono tracking-widest text-chamber-gold uppercase">Ready</span>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="text-chamber-gold bg-chamber-gold/10 p-3">
                <Zap size={24} strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-display uppercase tracking-widest text-chamber-white font-light">Deploy Node</h2>
            </div>
            
            <p className="font-mono text-sm text-gray-400 mb-8 leading-relaxed tracking-wide">
              Generate a secure, encrypted drop zone. Distribute the coordinate code to field operatives for immediate transmission.
            </p>
            
            <button 
              onClick={handleCreate}
              className="tactical-btn w-full flex items-center justify-center gap-3 group mt-auto"
            >
              <span>Deploy System</span>
              <Upload size={18} className="group-hover:-translate-y-1 transition-transform" />
              <div className="tactical-btn-flare"></div>
            </button>
          </motion.div>

        </div>

        {/* Footer Area */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="mt-20 text-center space-y-8 w-full max-w-4xl"
        >
          {/* Warning Banner */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-3 border border-red-500/30 bg-red-500/5 px-4 py-2 relative overflow-hidden">
              <ShieldAlert size={14} className="text-red-400" />
              <p className="font-mono text-[10px] text-red-400 uppercase tracking-widest">
                Protocol: Self-Destruct Active. Data purged after 24H.
              </p>
              <div className="absolute bottom-0 left-0 h-[1px] bg-red-500/50 w-full animate-scan"></div>
            </div>
          </div>

          {/* Credits */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-widest text-gray-500 pt-8 border-t border-chamber-white/10">
            <p>
              Architect: <span className="text-chamber-gold">Ankush Samanta</span>
            </p>
            <span className="hidden md:block w-1 h-1 bg-chamber-gold/50 rotate-45"></span>
            <a 
              href="https://github.com/MrFantastico007/DeadDrop" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-3 hover:text-chamber-white transition-colors"
            >
              <Github size={14} />
              <span>GitHub Repository</span>
              <Star size={12} className="group-hover:text-chamber-gold transition-colors" />
            </a>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Home;
