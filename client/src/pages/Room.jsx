import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { ArrowLeft, Send, Paperclip, Copy, Trash2, FileText, Download, Check, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Use environment variable for production, fallback to localhost for dev
const ENDPOINT = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Room = () => {
    const { roomCode } = useParams();
    const navigate = useNavigate();
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
            newSocket.emit('join_room', roomCode);
        });

        newSocket.on('disconnect', () => {
            setIsConnected(false);
        });

        newSocket.on('connect_error', (err) => {
             console.error("Socket Connection Error:", err);
             setIsConnected(false);
        });

        // Load initial message history from the server
        const fetchMessages = async () => {
            try {
                const res = await axios.post(`${ENDPOINT}/api/room/join`, { roomCode });
                if (res.data.messages) {
                    setMessages(res.data.messages);
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
    }, [roomCode]);

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
            const messageData = { roomCode, type: 'text', content: newMessage };
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
                content: file.name
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
        if (!window.confirm("Delete this message/file permanently?")) return;
        try {
            await axios.delete(`${ENDPOINT}/api/message/${id}`);
        } catch (err) {
            console.error("Delete failed", err);
            alert("Delete failed.");
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

    return (
        <div className="h-screen flex flex-col bg-neo-white text-neo-black font-body overflow-hidden">
            
            {/* Header */}
            <header className="flex-none p-4 flex items-center justify-between border-b-4 border-black bg-white z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="hover:bg-neo-yellow border-2 border-transparent hover:border-black p-2 rounded-none transition-all">
                        <ArrowLeft size={24} strokeWidth={3} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-display uppercase tracking-wider hidden md:block leading-none">DEAD DROP</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-xs font-bold uppercase tracking-widest">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                    </div>
                </div>

                <div 
                    onClick={copyRoomCode}
                    className="cursor-pointer neo-card py-2 px-4 flex items-center gap-2 hover:bg-neo-blue active:translate-y-1 active:shadow-none transition-all"
                >
                    <span className="font-bold font-mono tracking-widest text-lg">{roomCode}</span>
                    {copiedId === 'room-code' ? <Check size={16} /> : <Copy size={16} />}
                </div>
            </header>

            {!isConnected && (
                <div className="bg-red-500 text-white text-center text-xs font-bold py-1 px-4 border-b-4 border-black">
                    <WifiOff size={12} className="inline mr-2" />
                    CONNECTION LOST - ATTEMPTING TO RECONNECT...
                </div>
            )}

            {/* Message List */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]">
                <div className="max-w-4xl mx-auto space-y-6">
                    <AnimatePresence mode="popLayout">
                        {messages.length === 0 && (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 0.5 }}
                                className="text-center py-20 font-display text-4xl text-gray-400 uppercase"
                            >
                                Drop Zone Empty
                            </motion.div>
                        )}

                        {messages.map((msg) => (
                            <motion.div
                                key={msg._id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                className="neo-card flex flex-col md:flex-row gap-4 group relative"
                            >
                                {/* Icon Type Indicator */}
                                <div className={`flex-none w-12 h-12 flex items-center justify-center border-2 border-black ${msg.type === 'file' ? 'bg-neo-blue' : 'bg-neo-yellow'}`}>
                                    {msg.type === 'file' ? <FileText size={24} strokeWidth={2.5} /> : <div className="font-display text-xl">T</div>}
                                </div>

                                {/* Content Display */}
                                <div className="flex-1 min-w-0 pr-12">
                                    {msg.type === 'text' ? (
                                        <div className="font-mono whitespace-pre-wrap break-words leading-relaxed">
                                            {msg.content}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            <span className="font-bold truncate text-lg">{msg.content}</span>
                                            <a 
                                                href={msg.fileUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-2 text-sm font-bold underline hover:text-neo-blue"
                                            >
                                                <Download size={14} /> Download File
                                            </a>
                                        </div>
                                    )}
                                    <div className="mt-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>

                                {/* Message Actions */}
                                <div className="flex md:flex-col gap-2 md:absolute md:top-4 md:right-4">
                                    <button 
                                        onClick={() => handleCopy(msg.type === 'text' ? msg.content : msg.fileUrl, msg._id)}
                                        className="p-2 border-2 border-black hover:bg-neo-green hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white"
                                        title="Copy"
                                    >
                                        {copiedId === msg._id ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(msg._id)}
                                        className="p-2 border-2 border-black hover:bg-neo-pink hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all bg-white"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input & Upload Area */}
            <div className="flex-none p-4 md:p-6 bg-white border-t-4 border-black z-20">
                <div className="max-w-4xl mx-auto">
                    {file && (
                        <div className="flex items-center justify-between bg-neo-off-white border-2 border-black p-3 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <span className="flex items-center gap-2 font-bold truncate">
                                <Paperclip size={18} /> {file.name}
                            </span>
                            <button onClick={() => setFile(null)} className="hover:text-red-600 border-2 border-transparent hover:border-black p-1">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    )}
                    
                    <form onSubmit={handleSendMessage} className="flex gap-4">
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
                                className="h-full px-4 border-2 border-black bg-neo-off-white hover:bg-neo-blue hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none"
                            >
                                <Paperclip size={24} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            placeholder={file ? `Click Send to upload ${file.name}` : "Type a message... (Shift+Enter for new line)"}
                            className="flex-1 neo-input min-h-[60px] max-h-[150px] resize-none"
                            disabled={isUploading || isSending}
                        />
                        
                        <button 
                            type="submit" 
                            disabled={isUploading || isSending || (!newMessage.trim() && !file)}
                            className="bg-neo-green text-black neo-btn disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                        >
                            {isUploading || isSending ? <div className="animate-spin w-6 h-6 border-4 border-black border-t-transparent rounded-full " /> : <Send size={24} strokeWidth={2.5} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Room;
