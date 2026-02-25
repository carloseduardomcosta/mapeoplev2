'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import NavBar from '@/components/NavBar';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useSocketContext } from '@/components/SocketProvider';
import { fetchWithAuth } from '@/lib/fetchWithAuth';
import { encryptMessage, decryptMessage } from '@/lib/crypto';
import { ChatMessage, ConversationPreview, ChatUser } from '@/types/chat';
import { CurrentUser } from '@/types/resident';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  VOLUNTARIO: 'Voluntário',
};

export default function ChatPage() {
  const { socket, isConnected, onlineUsers } = useSocketContext();
  const [me, setMe] = useState<CurrentUser | null>(null);
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use a ref for selectedPeerId inside socket callbacks to avoid stale closures
  const selectedPeerIdRef = useRef<string | null>(null);

  // ─── Fetch current user ───────────────────────────────────────────────────
  useEffect(() => {
    fetchWithAuth('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => setMe(user))
      .catch(() => {});
  }, []);

  // ─── Fetch conversations ──────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/messages/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // ─── Fetch active users for new chat ──────────────────────────────────────
  useEffect(() => {
    if (showNewChat) {
      fetchWithAuth('/api/messages/users')
        .then((res) => (res.ok ? res.json() : []))
        .then(setActiveUsers)
        .catch(() => {});
    }
  }, [showNewChat]);

  // ─── Fetch messages for selected conversation ─────────────────────────────
  const fetchMessages = useCallback(async (peerId: string) => {
    setLoadingMessages(true);
    try {
      const res = await fetchWithAuth(`/api/messages/conversation?peerId=${peerId}&limit=50`);
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
        // Mark as read
        fetchWithAuth(`/api/messages/read/${peerId}`, { method: 'PATCH' }).catch(() => {});
      }
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPeerId) {
      fetchMessages(selectedPeerId);
    }
  }, [selectedPeerId, fetchMessages]);

  // ─── Decrypt messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!me || messages.length === 0) return;

    const decrypt = async () => {
      const newDecrypted = new Map(decryptedMessages);
      for (const msg of messages) {
        if (!newDecrypted.has(msg.id)) {
          const plaintext = await decryptMessage(
            msg.encryptedContent,
            msg.iv,
            msg.senderId,
            msg.receiverId,
            me.id, // pass myId so decryptMessage knows which side I am
          );
          newDecrypted.set(msg.id, plaintext);
        }
      }
      setDecryptedMessages(newDecrypted);
    };

    decrypt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, me]);

  // ─── Scroll to bottom on new messages ─────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [decryptedMessages]);

  // ─── Socket.io: listen for new messages ───────────────────────────────────
  useEffect(() => {
    if (!socket || !me) return;

    const handleNewMessage = (msg: ChatMessage) => {
      // Use ref to avoid stale closure — selectedPeerId may have changed since listener was registered
      const currentPeerId = selectedPeerIdRef.current;
      console.log('[Chat] Received message via socket:', msg.id, '| currentPeer:', currentPeerId);

      // If this message is for the current conversation, add it immediately
      if (
        currentPeerId &&
        (msg.senderId === currentPeerId || msg.receiverId === currentPeerId)
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Mark as read if from peer
        if (msg.senderId === currentPeerId) {
          fetchWithAuth(`/api/messages/read/${currentPeerId}`, { method: 'PATCH' }).catch(() => {});
        }
      }

      // Always refresh conversations list (updates unread count)
      fetchConversations();
    };

    const handleTyping = (data: { userId: string; name: string }) => {
      if (data.userId === selectedPeerIdRef.current) {
        setTypingUser(data.name);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
      }
    };

    const handleStopTyping = (data: { userId: string }) => {
      if (data.userId === selectedPeerIdRef.current) {
        setTypingUser(null);
      }
    };

    const handleRead = (data: { readBy: string }) => {
      if (data.readBy === selectedPeerIdRef.current) {
        setMessages((prev) =>
          prev.map((m) =>
            m.senderId === me.id && !m.isRead ? { ...m, isRead: true } : m,
          ),
        );
      }
    };

    socket.on('chat:message', handleNewMessage);
    socket.on('chat:typing', handleTyping);
    socket.on('chat:stop-typing', handleStopTyping);
    socket.on('chat:read', handleRead);

    return () => {
      socket.off('chat:message', handleNewMessage);
      socket.off('chat:typing', handleTyping);
      socket.off('chat:stop-typing', handleStopTyping);
      socket.off('chat:read', handleRead);
    };
  }, [socket, me, selectedPeerId, fetchConversations]);

  // ─── Send message ─────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedPeerId || !me || sending) return;

    const textToSend = newMessage.trim();
    setSending(true);
    // Optimistically clear the input
    setNewMessage('');

    try {
      const { encryptedContent, iv } = await encryptMessage(
        textToSend,
        me.id,
        selectedPeerId,
      );

      const res = await fetchWithAuth('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedPeerId,
          encryptedContent,
          iv,
        }),
      });

      if (res.ok) {
        const saved: ChatMessage = await res.json();
        socket?.emit('chat:stop-typing', { receiverId: selectedPeerId });

        // Add message locally immediately (optimistic update)
        // The socket event from the server will be deduplicated by the ID check
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev;
          return [...prev, saved];
        });
        // Decrypt the sent message immediately using the plaintext we already have
        setDecryptedMessages((prev) => {
          const next = new Map(prev);
          next.set(saved.id, textToSend);
          return next;
        });
        fetchConversations();
      } else {
        // Restore message on failure
        setNewMessage(textToSend);
      }
    } catch (err) {
      console.error('[Chat] Failed to send message:', err);
      setNewMessage(textToSend);
    } finally {
      setSending(false);
    }
  }

  // ─── Typing indicator ────────────────────────────────────────────────────
  function handleInputChange(value: string) {
    setNewMessage(value);
    if (socket && selectedPeerId) {
      if (value.trim()) {
        socket.emit('chat:typing', { receiverId: selectedPeerId });
      } else {
        socket.emit('chat:stop-typing', { receiverId: selectedPeerId });
      }
    }
  }

  // ─── Select a peer ────────────────────────────────────────────────────────
  function selectPeer(peerId: string) {
    setSelectedPeerId(peerId);
    selectedPeerIdRef.current = peerId;
    setShowNewChat(false);
    setMessages([]);
    setDecryptedMessages(new Map());
    setTypingUser(null);
  }

  // ─── Helper: check if user is online ──────────────────────────────────────
  function isOnline(userId: string): boolean {
    const online = onlineUsers.some((u) => u.id === userId);
    console.log(`[Chat] isOnline(${userId}): ${online} | onlineUsers: [${onlineUsers.map((u) => u.id).join(', ')}]`);
    return online;
  }

  // ─── Get selected peer info ───────────────────────────────────────────────
  const selectedConvo = conversations.find((c) => c.peerId === selectedPeerId);
  const selectedPeerName = selectedConvo?.peerName ?? activeUsers.find((u) => u.id === selectedPeerId)?.name ?? '';
  const selectedPeerImage = selectedConvo?.peerImage ?? activeUsers.find((u) => u.id === selectedPeerId)?.image ?? null;

  return (
    <AuthenticatedLayout>
      <div className="h-screen bg-gradient-to-br from-slate-900 to-blue-900 flex flex-col">
        <NavBar />

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar — Conversations */}
          <div className="w-80 border-r border-white/10 flex flex-col bg-slate-900/50 shrink-0">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-semibold">Conversas</h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="p-1.5 rounded-lg text-blue-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Nova conversa"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>

            {/* New chat: user list */}
            {showNewChat && (
              <div className="border-b border-white/10">
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-blue-300 text-xs font-medium">Nova conversa</span>
                  <button
                    onClick={() => setShowNewChat(false)}
                    className="text-blue-400 hover:text-white text-xs"
                  >
                    Fechar
                  </button>
                </div>
                <ul className="max-h-48 overflow-y-auto">
                  {activeUsers.map((user) => (
                    <li key={user.id}>
                      <button
                        onClick={() => selectPeer(user.id)}
                        className="w-full px-4 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="relative">
                          {user.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={user.image} alt={user.name}
                              className="w-8 h-8 rounded-full border border-white/20" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-white/20 flex items-center justify-center text-white text-xs font-bold">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isOnline(user.id) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-slate-900 rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate">{user.name}</p>
                          <p className="text-blue-400/60 text-xs">{ROLE_LABELS[user.role ?? ''] ?? ''}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conversations list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : conversations.length === 0 && !showNewChat ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <svg className="w-10 h-10 text-blue-400/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-blue-300/60 text-sm">Nenhuma conversa</p>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-xs font-medium"
                  >
                    Iniciar nova conversa
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {conversations.map((convo) => (
                    <li key={convo.peerId}>
                      <button
                        onClick={() => selectPeer(convo.peerId)}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                          selectedPeerId === convo.peerId
                            ? 'bg-blue-500/20 border-l-2 border-blue-400'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {convo.peerImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={convo.peerImage} alt={convo.peerName}
                              className="w-10 h-10 rounded-full border border-white/20" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-500/30 border border-white/20 flex items-center justify-center text-white text-sm font-bold">
                              {convo.peerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isOnline(convo.peerId) && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-slate-900 rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-white text-sm font-medium truncate">{convo.peerName}</p>
                            <span className="text-blue-400/50 text-xs shrink-0 ml-2">
                              {new Date(convo.lastMessage.createdAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <p className="text-blue-300/60 text-xs truncate">
                              {convo.lastMessage.senderId === me?.id ? 'Você: ' : ''}
                              Mensagem criptografada
                            </p>
                            {convo.unreadCount > 0 && (
                              <span className="ml-2 w-5 h-5 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                                {convo.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Main area — Messages */}
          <div className="flex-1 flex flex-col">
            {!selectedPeerId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <svg className="w-16 h-16 text-blue-400/20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-blue-200 font-medium">Selecione uma conversa</p>
                <p className="text-blue-400/60 text-sm mt-1">
                  Escolha uma conversa na lista ou inicie uma nova
                </p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-6 py-3 border-b border-white/10 flex items-center gap-3 bg-slate-900/30">
                  <div className="relative">
                    {selectedPeerImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedPeerImage} alt={selectedPeerName}
                        className="w-9 h-9 rounded-full border border-white/20" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-blue-500/30 border border-white/20 flex items-center justify-center text-white text-sm font-bold">
                        {selectedPeerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isOnline(selectedPeerId) && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-slate-900 rounded-full" />
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{selectedPeerName}</p>
                    <p className="text-blue-400/60 text-xs">
                      {typingUser
                        ? 'Digitando...'
                        : isOnline(selectedPeerId)
                        ? 'Online'
                        : 'Offline'}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <svg className="w-10 h-10 text-blue-400/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <p className="text-blue-300/60 text-sm">Nenhuma mensagem ainda</p>
                      <p className="text-blue-400/40 text-xs mt-1">Envie a primeira mensagem!</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMine = msg.senderId === me?.id;
                      const plaintext = decryptedMessages.get(msg.id) ?? '...';

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                              isMine
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-white/10 text-blue-100 rounded-bl-md'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{plaintext}</p>
                            <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : ''}`}>
                              <span className={`text-xs ${isMine ? 'text-blue-200/60' : 'text-blue-400/40'}`}>
                                {new Date(msg.createdAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isMine && (
                                <span className="text-xs">
                                  {msg.isRead ? (
                                    <svg className="w-3.5 h-3.5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5 text-blue-300/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Typing indicator */}
                  {typingUser && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 rounded-2xl rounded-bl-md px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message input */}
                <form
                  onSubmit={handleSend}
                  className="px-6 py-4 border-t border-white/10 flex items-center gap-3 bg-slate-900/30"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Digite uma mensagem..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-blue-300/50 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="p-2.5 bg-blue-500 hover:bg-blue-400 disabled:bg-blue-500/30 text-white rounded-xl transition-colors"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
