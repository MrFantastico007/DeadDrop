import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, ArrowRight, Upload, Zap } from 'lucide-react';
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
    <div className="min-h-screen bg-neo-white text-neo-black font-body overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="absolute top-20 left-10 w-16 h-16 bg-neo-yellow border-4 border-black rounded-full animate-float opacity-80 z-0"></div>
      <div className="absolute bottom-40 right-20 w-24 h-24 bg-neo-blue border-4 border-black rotate-12 animate-wiggle z-0"></div>
      
      <div className="container mx-auto px-4 h-screen flex flex-col items-center justify-center relative z-10">
        
        {/* Main Title */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300 }}
          className="text-center mb-12"
        >
          <div className="inline-block relative">
            <h1 className="text-6xl md:text-8xl font-display uppercase tracking-widest relative z-10">
              DeadDrop
            </h1>
            <div className="absolute -bottom-2 -right-2 w-full h-full bg-neo-green -z-10"></div>
          </div>
          <p className="mt-4 text-xl font-bold uppercase tracking-wider bg-black text-white inline-block px-4 py-1 rotate-[-2deg]">
            Secure • Ephemeral • Instant
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
          
          {/* Join Room Card */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="neo-card bg-neo-pink/20"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neo-black text-white p-3 rounded-none border-2 border-transparent">
                <Box size={32} />
              </div>
              <h2 className="text-3xl font-display uppercase">Join Room</h2>
            </div>
            
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div className="relative">
                <label className="block text-sm font-bold uppercase mb-2">Room Code</label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ENTER CODE"
                  className="neo-input bg-white uppercase placeholder:text-gray-400"
                />
              </div>
              <button 
                type="submit" 
                disabled={!roomCode}
                className="neo-btn bg-neo-yellow text-black w-full flex items-center justify-center gap-2 hover:bg-neo-yellow/80 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Launch</span>
                <ArrowRight size={20} strokeWidth={3} />
              </button>
            </form>
          </motion.div>

          {/* Create Room Card */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="neo-card bg-neo-green/20 relative overflow-hidden"
          > 
             {/* "New" Badge */}
            <div className="absolute -top-3 -right-3 bg-neo-blue border-2 border-black px-3 py-1 font-bold text-xs uppercase rotate-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              Instant
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="bg-neo-black text-white p-3 rounded-none">
                <Zap size={32} />
              </div>
              <h2 className="text-3xl font-display uppercase">Create Room</h2>
            </div>
            
            <p className="font-bold mb-8 leading-relaxed">
              Start a new secure drop zone. Share the code with peers to begin transferring files immediately.
            </p>
            
            <button 
              onClick={handleCreate}
              className="neo-btn bg-neo-blue text-black w-full flex items-center justify-center gap-2"
            >
              <span>Initiate Drop</span>
              <Upload size={20} strokeWidth={3} />
            </button>
          </motion.div>

        </div>

        {/* Footer Warning */}
        <div className="mt-16 text-center">
          <p className="font-mono text-xs bg-red-500 text-white inline-block px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            WARNING: DATA SELF-DESTRUCTS IN 24H
          </p>
        </div>

      </div>
    </div>
  );
};

export default Home;
