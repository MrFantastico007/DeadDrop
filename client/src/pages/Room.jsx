import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { ArrowLeft, Send, Paperclip, Copy, Trash2, FileText, Download, Check, WifiOff, Shield, X, ShieldAlert, UserCheck, UserX, Eye, MessageSquare, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Use environment variable for production, fallback to localhost for dev
const ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const getDeviceId = () => {
    let storedId = localStorage.getItem('deaddrop_device_id');
    if (!storedId) {
        storedId = 'user-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        localStorage.setItem('deaddrop_device_id', storedId);
    }
    return storedId;
};

const Room = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const [deviceId] = useState(() => getDeviceId());
    const [userRole, setUserRole] = useState('viewer');
    const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Setup Socket.io connection and listeners
    useEffect(() => {
        const newSocket = io(ENDPOINT, {
            reconnectionAttempts: 5,
            timeout: 10000,
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            setIsConnected(true);
            newSocket.emit('join_room', { roomCode, deviceId });
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
             console.error("Socket Connection Error:", err);
             setIsConnected(false);
        });

        // Admin & Security Listeners
        newSocket.on('access_denied', (data) => {
            if(data.reason === 'blocked') setUserRole('blocked');
        });

        newSocket.on('role_update', (data) => {
            if (data.targetId === deviceId) {
                if (data.action === 'block') setUserRole('blocked');
                if (data.action === 'editor') setUserRole('editor');
                if (data.action === 'converser') setUserRole('converser');
                if (data.action === 'reset') setUserRole('viewer');
            }
        });

        newSocket.on('active_users_update', (users) => {
            setActiveUsers(users);
        });

        newSocket.on('blocked_users_update', (blockedIds) => {
            setBlockedUsers(blockedIds);
        });

        // Load initial message history from the server
        const fetchMessages = async () => {
            try {
                const res = await axios.post(`${ENDPOINT}/api/room/join`, { roomCode, deviceId });
                if (res.data.messages) {
                    setMessages(res.data.messages);
                }
                if (res.data.role) {
                    setUserRole(res.data.role);
                    if (res.data.role === 'admin') {
                        newSocket.emit('join_admin_channel', { deviceId, roomCode });
                    }
                }
            } catch (err) {
                console.error("Failed to join room/fetch messages", err);
            }
        };
        fetchMessages();

        // Real-time event listeners
        newSocket.on('receive_message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        newSocket.on('delete_message', (messageId) => {
            setMessages((prev) => prev.filter(msg => msg._id !== messageId));
        });

        return () => newSocket.close();
    }, [roomCode, deviceId, userRole]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e && e.preventDefault();
        if ((!newMessage.trim() && !file) || isSending || isUploading) return;

        if (file) {
            handleUpload();
            return;
        }

        setIsSending(true);
        try {
            const messageData = { roomCode, type: 'text', content: newMessage, deviceId };
            await axios.post(`${ENDPOINT}/api/message`, messageData);
            setNewMessage('');
        } catch (err) {
            console.error(err);
            alert("Failed to send message. Please check your connection.");
        } finally {
            setIsSending(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const uploadRes = await axios.post(`${ENDPOINT}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const messageData = {
                roomCode,
                type: 'file',
                fileUrl: uploadRes.data.fileUrl,
                publicId: uploadRes.data.publicId,
                content: newMessage.trim() ? newMessage.trim() : file.name,
                deviceId
            };

            await axios.post(`${ENDPOINT}/api/message`, messageData);
            setFile(null);
            setNewMessage('');
        } catch (err) {
            console.error("Upload failed", err);
            alert("Upload failed. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Purge this data permanently?")) return;
        try {
            await axios.delete(`${ENDPOINT}/api/message/${id}`, { headers: { deviceid: deviceId } });
        } catch (err) {
            console.error("Delete failed", err);
            alert("Delete failed. Insufficient privileges.");
        }
    };

    const handleCopy = (content, id) => {
        navigator.clipboard.writeText(content);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(roomCode);
        setCopiedId('room-code');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleRoleChange = async (targetId, action) => {
        try {
            await axios.post(`${ENDPOINT}/api/admin/role`, { roomCode, targetId, action }, { headers: { deviceid: deviceId } });
        } catch (err) {
            console.error(err);
            alert("Action failed.");
        }
    };

    if (userRole === 'blocked') {
        return (
            <div className="min-h-screen bg-chamber-black text-chamber-white font-body overflow-x-hidden relative flex flex-col justify-center items-center">
                <div className="absolute inset-0 bg-tactical-grid opacity-20 z-0"></div>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-panel p-12 text-center max-w-md relative z-10 border-red-500/50"
                >
                    <ShieldAlert size={64} className="mx-auto text-red-500 mb-6" />
                    <h1 className="text-3xl font-display uppercase tracking-[0.2em] mb-4 text-red-500 holographic-text">Access Denied</h1>
                    <p className="font-mono text-sm text-gray-400">
                        Your device has been blacklisted by the system administrator.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] flex flex-col bg-chamber-black text-chamber-white font-body overflow-hidden relative">
            
            {/* Tactical Animated Background */}
            <div className="absolute inset-0 z-0 bg-chamber-black overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-b from-chamber-black/90 via-chamber-black/60 to-chamber-black/90"></div>
                
                {/* High-Tech Glowing Dot Matrix */}
                <div className="absolute inset-[-50%] chamber-dot-matrix opacity-20 pointer-events-none"></div>
                
                {/* Tactical Grid Overlay */}
                <div className="absolute inset-0 bg-tactical-grid opacity-10"></div>
            </div>

            {/* Header */}
            <header className="flex-none p-4 flex items-center justify-between border-b border-chamber-gold/20 bg-chamber-navy/50 backdrop-blur-md z-10 relative">
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-chamber-gold/50 to-transparent"></div>
                
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-chamber-gold hover:text-chamber-white transition-colors p-2">
                        <ArrowLeft size={24} strokeWidth={2} />
                    </button>
                    <button onClick={() => { if (userRole === 'admin') setIsAdminModalOpen(true); }} className={`p-2 transition-colors ${userRole === 'admin' ? '' : 'cursor-not-allowed opacity-50'}`} title={userRole === 'admin' ? 'Manage Room' : 'Admin Only'}>
                        <Shield size={24} className={userRole === 'admin' ? "text-chamber-glow drop-shadow-[0_0_8px_rgba(255,214,107,0.8)]" : "text-gray-500"} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-display uppercase tracking-[0.2em] hidden md:block leading-none text-chamber-white">
                            DEAD DROP
                        </h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-chamber-gold shadow-[0_0_8px_rgba(212,175,55,0.8)]' : 'bg-red-500'}`}></span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">{isConnected ? 'System Online' : 'System Offline'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 ml-auto">
                    <div 
                        onClick={copyRoomCode}
                        className="cursor-pointer border border-chamber-gold/30 bg-chamber-black/50 px-4 py-2 flex items-center gap-3 hover:bg-chamber-gold/10 hover:border-chamber-gold transition-all group"
                    >
                        <span className="font-mono tracking-[0.2em] text-sm md:text-base text-chamber-gold">{roomCode}</span>
                        {copiedId === 'room-code' ? <Check size={16} className="text-chamber-glow" /> : <Copy size={16} className="text-chamber-gold/50 group-hover:text-chamber-gold" />}
                    </div>
                    <div className="flex items-center gap-2 border border-dashed border-gray-600 px-3 py-1 hidden sm:flex bg-chamber-black/50">
                        <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest leading-none">ID</span>
                        <span className="font-mono text-xs text-gray-300">{deviceId}</span>
                    </div>
                </div>
            </header>

            {/* Admin Modal */}
            <AnimatePresence>
                {isAdminModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-chamber-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="glass-panel border-chamber-gold p-6 w-full max-w-lg flex flex-col max-h-[80vh] relative overflow-hidden"
                        >
                            {/* Corner Accents */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-chamber-gold"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-chamber-gold"></div>

                            <div className="flex justify-between items-center mb-6 border-b border-chamber-gold/30 pb-4 relative">
                                <h2 className="text-xl font-display uppercase tracking-[0.2em] flex items-center gap-3 text-chamber-gold">
                                    <Shield size={20} /> Administrator Overlay
                                </h2>
                                <button onClick={() => setIsAdminModalOpen(false)} className="text-gray-400 hover:text-chamber-white transition-colors">
                                    <X size={24} strokeWidth={2} />
                                </button>
                            </div>

                            <div className="overflow-y-auto flex-1 space-y-4 pr-2 custom-scroll mt-4">
                                <p className="text-[10px] font-mono text-chamber-gold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Crosshair size={12}/> Connected Entities
                                </p>
                                
                                {activeUsers.map(u => (
                                    <div key={u.deviceId} className="flex flex-col sm:flex-row sm:items-center justify-between border border-chamber-white/10 p-3 bg-chamber-black/40 hover:bg-chamber-white/5 transition-colors gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="font-mono text-xs sm:text-sm text-gray-300 flex items-center gap-2">
                                                <span className="hidden sm:inline">{u.deviceId}</span>
                                                <span className="sm:hidden">{u.deviceId.substring(0, 10)}...</span>
                                                <button onClick={() => handleCopy(u.deviceId, `copy-${u.deviceId}`)} className="text-gray-500 hover:text-chamber-gold transition-colors">
                                                    {copiedId === `copy-${u.deviceId}` ? <Check size={12} className="text-chamber-glow" /> : <Copy size={12} />}
                                                </button>
                                                {u.deviceId === deviceId && <span className="text-chamber-gold text-[10px]">(Host)</span>}
                                            </div>
                                                <span className={`text-[9px] px-2 py-0.5 border uppercase tracking-widest ${
                                                    u.role === 'admin' ? 'border-chamber-gold text-chamber-gold bg-chamber-gold/10' : 
                                                    u.role === 'editor' ? 'border-green-500 text-green-500 bg-green-500/10' : 
                                                    u.role === 'converser' ? 'border-blue-400 text-blue-400 bg-blue-400/10' : 
                                                    u.role === 'viewer' ? 'border-gray-500 text-gray-400 bg-gray-500/10' : 
                                                    'border-red-500 text-red-500 bg-red-500/10'
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </div>
                                            
                                            {u.deviceId !== deviceId && (
                                                <div className="flex gap-2">
                                                    {u.role !== 'viewer' && (
                                                        <button onClick={() => handleRoleChange(u.deviceId, 'reset')} className="p-1.5 border border-chamber-white/20 text-gray-400 hover:text-white hover:border-white transition-all bg-transparent" title="Restrict to Viewer">
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                    {u.role !== 'converser' && (
                                                        <button onClick={() => handleRoleChange(u.deviceId, 'converser')} className="p-1.5 border border-chamber-white/20 text-gray-400 hover:text-blue-400 hover:border-blue-400 transition-all bg-transparent" title="Promote to Converser">
                                                            <MessageSquare size={14} />
                                                        </button>
                                                    )}
                                                    {u.role !== 'editor' && (
                                                        <button onClick={() => handleRoleChange(u.deviceId, 'editor')} className="p-1.5 border border-chamber-white/20 text-gray-400 hover:text-green-400 hover:border-green-400 transition-all bg-transparent" title="Promote to Editor">
                                                            <UserCheck size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleRoleChange(u.deviceId, 'block')} className="p-1.5 border border-chamber-white/20 text-gray-400 hover:text-red-500 hover:border-red-500 transition-all bg-transparent" title="Terminate Connection">
                                                        <UserX size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {activeUsers.length === 0 && <div className="text-center font-mono text-xs text-gray-500 py-6 border border-dashed border-gray-700">No signals detected</div>}

                                    {/* Blocked Devices Section */}
                                    {blockedUsers.length > 0 && (
                                        <>
                                            <p className="text-[10px] font-mono text-red-500 uppercase tracking-[0.2em] mt-8 mb-4 flex items-center gap-2">
                                                <ShieldAlert size={12}/> Blacklisted Entities
                                            </p>
                                            {blockedUsers.map(badId => (
                                                <div key={badId} className="flex items-center justify-between border border-red-500/30 p-3 bg-red-500/5">
                                                    <div className="flex items-center gap-3 text-red-400/80 font-mono text-sm">
                                                        <ShieldAlert size={16} /> {badId}
                                                    </div>
                                                    <button 
                                                        onClick={() => handleRoleChange(badId, 'reset')} 
                                                        className="text-[10px] font-mono uppercase tracking-widest border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1 transition-all"
                                                    >
                                                        Revoke Ban
                                                    </button>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isConnected && (
                <div className="bg-red-500/10 border-y border-red-500 text-red-500 text-center text-xs font-mono py-2 uppercase tracking-[0.2em] z-20 backdrop-blur-sm">
                    <WifiOff size={14} className="inline mr-2" />
                    Warning: Uplink severed. Attempting to re-establish connection...
                </div>
            )}

            {/* Message List */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 custom-scroll">
                <div className="max-w-4xl mx-auto space-y-6">
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 0.5 }}
                                className="text-center py-32 flex flex-col items-center justify-center gap-4"
                            >
                                <div className="w-16 h-16 border border-chamber-gold/30 rounded-full flex items-center justify-center animate-pulse">
                                    <Crosshair size={24} className="text-chamber-gold/50" />
                                </div>
                                <p className="font-mono text-xs uppercase tracking-[0.3em] text-chamber-gold/50">Drop Zone Secure. Awaiting Data.</p>
                            </motion.div>
                        )}

                        {messages.map((msg) => (
                            <motion.div
                                key={msg._id}
                                layout
                                initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)', transition: { duration: 0.2 } }}
                                className="glass-panel p-5 flex flex-col md:flex-row gap-5 group relative overflow-hidden"
                            >
                                {/* Decorative line */}
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-chamber-gold to-transparent opacity-50"></div>

                                {/* Icon Type Indicator */}
                                <div className={`flex-none w-10 h-10 flex items-center justify-center border border-chamber-gold/30 ${msg.type === 'file' ? 'bg-chamber-gold/10 text-chamber-glow' : 'bg-chamber-navy text-chamber-gold'}`}>
                                    {msg.type === 'file' ? <FileText size={18} strokeWidth={1.5} /> : <div className="font-display text-lg">_</div>}
                                </div>

                                {/* Content Display */}
                                <div className="flex-1 min-w-0">
                                    {msg.type === 'text' ? (
                                        <div className="font-mono text-gray-300 text-sm whitespace-pre-wrap break-words leading-relaxed">
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <span className="font-mono text-chamber-white truncate text-base">{msg.content}</span>
                                            <a 
                                                href={msg.fileUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-chamber-gold hover:text-chamber-glow transition-colors w-max"
                                            >
                                                <Download size={14} /> Acquire Asset
                                            </a>
                                        </div>
                                    )}
                                    <div className="mt-4 flex items-center gap-3">
                                        <div className="h-[1px] w-8 bg-chamber-white/10"></div>
                                        <span className="text-[10px] font-mono text-gray-500 tracking-[0.2em]">
                                            {new Date(msg.createdAt).toLocaleTimeString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Message Actions */}
                                <div className="flex md:flex-col gap-2 ml-auto opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 self-start">
                                    <button 
                                        onClick={() => handleCopy(msg.type === 'text' ? msg.content : msg.fileUrl, msg._id)}
                                        className="p-2 border border-chamber-white/20 text-gray-400 hover:text-chamber-gold hover:border-chamber-gold transition-colors bg-chamber-navy/50"
                                        title="Copy Data"
                                    >
                                        {copiedId === msg._id ? <Check size={14} className="text-chamber-gold" /> : <Copy size={14} />}
                                    </button>
                                    {(userRole === 'admin' || userRole === 'editor') && (
                                        <button 
                                            onClick={() => handleDelete(msg._id)}
                                            className="p-2 border border-chamber-white/20 text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors bg-chamber-navy/50"
                                            title="Purge Data"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input & Upload Area */}
            {userRole !== 'viewer' && (
            <div className="flex-none p-4 md:p-6 bg-chamber-navy/80 border-t border-chamber-gold/20 backdrop-blur-md z-20 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-chamber-gold/30 to-transparent"></div>
                
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence>
                        {file && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="flex items-center justify-between border border-chamber-gold/30 bg-chamber-gold/5 p-3 mb-4"
                            >
                                <span className="flex items-center gap-3 font-mono text-sm text-chamber-gold truncate">
                                    <Paperclip size={16} /> {file.name}
                                </span>
                                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                    <X size={16} />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <form onSubmit={handleSendMessage} className="flex gap-3 md:gap-4">
                         <div className="relative flex-none">
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={(e) => setFile(e.target.files[0])}
                            />
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-full px-4 border border-chamber-gold/30 bg-chamber-black/50 text-chamber-gold hover:bg-chamber-gold/10 hover:border-chamber-gold transition-all flex items-center justify-center group"
                            >
                                <Paperclip size={20} className="group-hover:scale-110 transition-transform" />
                            </button>
                        </div>
                        
                        <div className="flex-1 relative group">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder={file ? `Awaiting execution for ${file.name}` : "Input transmission... (Shift+Enter for multi-line)"}
                                className="tactical-input min-h-[50px] max-h-[150px] resize-none h-full py-3.5"
                                disabled={isUploading || isSending}
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={isUploading || isSending || (!newMessage.trim() && !file)}
                            className="tactical-btn flex-none !px-4 md:!px-8 disabled:opacity-30 disabled:cursor-not-allowed group"
                        >
                            {isUploading || isSending ? (
                                <div className="animate-spin w-5 h-5 border-2 border-chamber-gold border-t-transparent rounded-full" />
                            ) : (
                                <Send size={20} className="group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>
                    </form>
                </div>
            </div>
            )}
        </div>
    );
};

export default Room;
