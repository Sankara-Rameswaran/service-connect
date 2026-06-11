import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../api/axios';
import { getSocket } from '../services/socket';

// ── Conversation sidebar item ────────────────────────────────────────────────
function ConversationItem({ conv, active, onClick, currentUserId }) {
  const other = conv.participants?.find((p) => p._id !== currentUserId) || conv.participants?.[0];
  const availColor = { ONLINE: 'bg-green-400', BUSY: 'bg-yellow-400', OFFLINE: 'bg-gray-400' };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
        active ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className="relative shrink-0">
        <div className="w-11 h-11 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 overflow-hidden">
          {other?.avatar
            ? <img src={other.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
            : other?.name?.charAt(0)?.toUpperCase()}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${availColor[other?.availability] || 'bg-gray-400'} rounded-full border-2 border-white dark:border-gray-900`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{other?.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {conv.lastMessage?.content || (conv.lastMessage?.type ? `[${conv.lastMessage.type}]` : 'No messages yet')}
        </p>
      </div>
    </button>
  );
}

// ── Single chat message bubble ───────────────────────────────────────────────
function Message({ msg, isMe }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else { audioRef.current.play(); setPlaying(true); }
  };

  if (msg.isDeleted) return null;

  return (
    <div className={`flex items-end gap-2 mb-3 ${isMe ? 'flex-row-reverse' : ''}`}>
      {!isMe && (
        <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300 shrink-0 mb-1 overflow-hidden">
          {msg.sender?.avatar
            ? <img src={msg.sender.avatar} className="w-full h-full object-cover" alt="" />
            : msg.sender?.name?.charAt(0)?.toUpperCase()}
        </div>
      )}
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm ${
          isMe
            ? 'rounded-br-sm bg-primary-600 text-white'
            : 'rounded-bl-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-700'
        }`}>
          {msg.type === 'TEXT' && <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
          {msg.type === 'IMAGE' && msg.mediaUrl && (
            <img src={msg.mediaUrl} alt="shared" className="rounded-xl max-w-full cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => window.open(msg.mediaUrl, '_blank')} />
          )}
          {msg.type === 'VOICE' && msg.mediaUrl && (
            <div className="flex items-center gap-2 min-w-[140px]">
              <button onClick={toggleAudio}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  isMe ? 'bg-primary-500 hover:bg-primary-400' : 'bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/30'
                }`}>
                {playing ? '⏸' : '▶'}
              </button>
              <div className="flex gap-0.5 items-center h-6 flex-1">
                {[...Array(14)].map((_, i) => (
                  <div key={i}
                    className={`w-0.5 rounded-full ${isMe ? 'bg-primary-300' : 'bg-primary-400'}`}
                    style={{ height: `${(Math.sin(i * 0.8) + 1) * 8 + 4}px` }} />
                ))}
              </div>
              <span className="text-xs opacity-60">🎵</span>
              <audio ref={audioRef} src={msg.mediaUrl} onEnded={() => setPlaying(false)} className="hidden" />
            </div>
          )}
          {msg.type === 'LOCATION' && msg.location && (
            <a
              href={`https://maps.google.com?q=${msg.location.lat},${msg.location.lng}`}
              target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 hover:underline ${isMe ? 'text-white' : 'text-primary-600 dark:text-primary-400'}`}
            >
              <span>📍</span>
              <span className="text-sm">{msg.location.address || 'View on map'}</span>
            </a>
          )}
        </div>
        <span className="text-xs text-gray-400 mt-1 px-1 flex items-center gap-1">
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMe && <span className={msg.readBy?.length > 1 ? 'text-blue-400' : ''}>{msg.readBy?.length > 1 ? '✓✓' : '✓'}</span>}
        </span>
      </div>
    </div>
  );
}

// ── Main Chat Page ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useSelector((s) => s.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const socket = getSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // ── Load all conversations, then auto-open target if passed via state ──────
  useEffect(() => {
    const loadConversations = async () => {
      setLoadingConvs(true);
      try {
        const { data } = await api.get('/conversations');
        const convs = data.data?.conversations || [];
        setConversations(convs);

        const targetId = location.state?.openConversationId;
        if (targetId) {
          // Try to find in already-loaded list
          let target = convs.find((c) => c._id === targetId);
          if (!target) {
            // Not in list yet (brand-new conversation) — fetch it directly
            try {
              const { data: convData } = await api.get('/conversations');
              const freshConvs = convData.data?.conversations || [];
              setConversations(freshConvs);
              target = freshConvs.find((c) => c._id === targetId);
            } catch {}
          }
          if (target) {
            setActiveConv(target);
          }
          // Clear the nav state so refreshing doesn't re-trigger
          navigate(location.pathname, { replace: true, state: {} });
        }
      } catch {
        toast.error('Failed to load conversations');
      } finally {
        setLoadingConvs(false);
      }
    };
    loadConversations();
  }, []); // run once on mount

  // ── Load messages when active conversation changes ────────────────────────
  useEffect(() => {
    if (!activeConv) return;
    setLoadingMsgs(true);
    setMessages([]);

    socket?.emit('join_conversation', activeConv._id);

    api.get(`/conversations/${activeConv._id}/messages?limit=50`)
      .then(({ data }) => {
        setMessages(data.data || []);
        setTimeout(scrollToBottom, 80);
      })
      .finally(() => setLoadingMsgs(false));

    const handleNewMessage = ({ message, conversationId }) => {
      if (conversationId === activeConv._id) {
        setMessages((prev) => [...prev, message]);
        setTimeout(scrollToBottom, 50);
        // update lastMessage in sidebar
        setConversations((prev) => prev.map((c) =>
          c._id === conversationId ? { ...c, lastMessage: message, lastMessageAt: message.createdAt } : c
        ));
      }
    };

    const handleTyping = ({ userId, name }) => {
      if (userId !== user._id) setTypingUser(name);
    };
    const handleStopTyping = () => setTypingUser(null);

    socket?.on('new_message', handleNewMessage);
    socket?.on('user_typing', handleTyping);
    socket?.on('user_stop_typing', handleStopTyping);

    return () => {
      socket?.emit('leave_conversation', activeConv._id);
      socket?.off('new_message', handleNewMessage);
      socket?.off('user_typing', handleTyping);
      socket?.off('user_stop_typing', handleStopTyping);
    };
  }, [activeConv?._id]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = async (type = 'TEXT', content = text, file = null) => {
    if (!activeConv) return;
    if (type === 'TEXT' && !content.trim()) return;
    setSending(true);
    setText('');
    socket?.emit('stop_typing', { conversationId: activeConv._id });
    try {
      let body, headers = {};
      if (file) {
        body = new FormData();
        body.append('type', type);
        body.append('media', file);
        if (content) body.append('content', content);
        headers['Content-Type'] = 'multipart/form-data';
      } else {
        body = { type, content };
      }
      const { data } = await api.post(`/conversations/${activeConv._id}/messages`, body, { headers });
      // Add own message immediately (socket loop-back may not fire)
      const msg = data.data?.message;
      if (msg) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
    } catch { toast.error('Failed to send message'); }
    finally { setSending(false); }
  };

  const handleFileShare = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await sendMessage('IMAGE', '', file);
    e.target.value = '';
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) { toast.error('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      await api.post(`/conversations/${activeConv._id}/messages`, {
        type: 'LOCATION', location: { lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` },
      });
    }, () => toast.error('Location access denied'));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        await sendMessage('VOICE', '', file);
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch { toast.error('Microphone access denied'); }
  };

  const stopRecording = () => {
    if (mediaRecorder) { mediaRecorder.stop(); setMediaRecorder(null); }
    setRecording(false);
  };

  let typingTimer = null;
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); return; }
    socket?.emit('typing', { conversationId: activeConv?._id });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket?.emit('stop_typing', { conversationId: activeConv?._id }), 1500);
  };

  const otherParticipant = (conv) =>
    conv?.participants?.find((p) => p._id !== user?._id) || conv?.participants?.[0];

  const availColor = { ONLINE: 'text-green-500', BUSY: 'text-yellow-500', OFFLINE: 'text-gray-400' };

  return (
    <div className="flex gap-0 h-[calc(100vh-7rem)] rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm animate-fade-in">

      {/* ── Conversations Sidebar ── */}
      <div className={`${activeConv ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-72 border-r border-gray-100 dark:border-gray-800 shrink-0`}>
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="font-bold text-gray-900 dark:text-white text-lg">Messages</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingConvs ? (
            [...Array(4)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center space-y-3">
              <div className="text-5xl">💬</div>
              <p className="font-medium text-gray-700 dark:text-gray-300 text-sm">No conversations yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Visit a service page and click<br />
                <strong>"Message Provider"</strong> to start chatting
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <ConversationItem
                key={c._id}
                conv={c}
                active={activeConv?._id === c._id}
                onClick={() => setActiveConv(c)}
                currentUserId={user?._id}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat Area ── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-white dark:bg-gray-900">
            <button onClick={() => setActiveConv(null)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 mr-1">
              ←
            </button>
            {(() => {
              const other = otherParticipant(activeConv);
              return (
                <>
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center font-bold text-primary-700 dark:text-primary-300 overflow-hidden shrink-0">
                    {other?.avatar
                      ? <img src={other.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                      : other?.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white leading-tight">{other?.name}</p>
                    <p className={`text-xs font-medium ${availColor[other?.availability] || 'text-gray-400'}`}>
                      {typingUser ? `${typingUser} is typing...` : (other?.availability || 'Offline')}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-950">
            {loadingMsgs ? (
              <div className="space-y-3 pt-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className={`flex ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                    <div className={`skeleton h-10 rounded-2xl ${i % 2 === 0 ? 'w-48' : 'w-36'}`} />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                <div className="text-5xl">👋</div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Start the conversation!</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Say hello to {otherParticipant(activeConv)?.name?.split(' ')[0]}
                </p>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <Message
                    key={m._id}
                    msg={m}
                    isMe={m.sender?._id === user?._id || m.sender === user?._id}
                  />
                ))}
              </>
            )}
            {typingUser && (
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
                {typingUser} is typing...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex items-end gap-2">
              {/* Media buttons */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Share image"
                >
                  📷
                </button>
                <button
                  onClick={handleShareLocation}
                  className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-gray-700 transition-colors"
                  title="Share location"
                >
                  📍
                </button>
              </div>

              {/* Text input */}
              <textarea
                className="input flex-1 resize-none min-h-[42px] max-h-32 py-2.5 text-sm leading-relaxed"
                placeholder={`Message ${otherParticipant(activeConv)?.name?.split(' ')[0] || ''}...`}
                rows={1}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
              />

              {/* Voice record (hold) */}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className={`p-2.5 rounded-xl transition-all shrink-0 ${
                  recording
                    ? 'bg-red-500 text-white scale-110 animate-pulse shadow-lg'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'
                }`}
                title="Hold to record voice"
              >
                🎤
              </button>

              {/* Send */}
              <button
                onClick={() => sendMessage()}
                disabled={!text.trim() || sending}
                className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shrink-0"
              >
                {sending ? '…' : '➤'}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileShare} />
            {recording && (
              <p className="text-xs text-red-500 text-center mt-1.5 animate-pulse font-medium">🔴 Recording… release to send</p>
            )}
          </div>
        </div>
      ) : (
        /* Empty state when no conversation selected */
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="text-center space-y-4 max-w-xs">
            <div className="text-7xl">💬</div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Your Messages</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
              Select a conversation from the left, or start a new one by visiting a
              <strong className="text-primary-600 dark:text-primary-400"> service page</strong> and clicking
              <strong className="text-primary-600 dark:text-primary-400"> "Message Provider"</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
