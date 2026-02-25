export interface ChatUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedContent: string;
  iv: string;
  isRead: boolean;
  createdAt: string;
  sender?: ChatUser;
  receiver?: ChatUser;
}

export interface ConversationPreview {
  peerId: string;
  peerName: string;
  peerEmail: string;
  peerImage: string | null;
  peerRole: string;
  lastMessage: {
    id: string;
    encryptedContent: string;
    iv: string;
    senderId: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
}
