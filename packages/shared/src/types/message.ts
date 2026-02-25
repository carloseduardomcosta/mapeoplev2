export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  isRead: boolean;
  createdAt: Date;
}
