export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  university?: string;
  major?: string;
  avatar?: string;
  isPremium?: boolean;
  role?: 'user' | 'admin';
  aiUsageCount?: number;
  points: number;
  rank: string;
  badges: string[];
  createdAt: any;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description: string;
  type: 'notes' | 'reviewer' | 'summary' | 'exam' | 'practice';
  subject: string;
  university: string;
  uploadedBy: string; // userId
  uploadedByName: string;
  createdAt: any;
  rating: number;
  downloadCount: number;
  content?: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  subject: string;
  university: string;
  memberCount: number;
  recentAvatars?: string[];
  createdBy: string;
  privacy: 'public' | 'invite-only';
  createdAt: any;
}

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  targetUserId: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  attachment?: {
    type: 'image' | 'file';
    url?: string;
    name: string;
    content?: string;
  };
  createdAt: any;
}

export interface GroupResource {
  id: string;
  title: string;
  url?: string;
  type: 'link' | 'file' | 'text';
  content?: string;
  addedBy: string;
  addedByName: string;
  createdAt: any;
}

export interface GroupTask {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string; // userId
  assignedToName?: string;
  dueDate?: any;
  createdBy: string;
  createdAt: any;
}

export interface DirectMessage {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  attachment?: {
    type: 'image' | 'file';
    url?: string;
    name: string;
    content?: string;
  };
  createdAt: any;
}

export interface DMConversation {
  id: string; // id is uid1_uid2 (sorted)
  participants: string[];
  participantDetails: {
    [uid: string]: {
      displayName: string;
      avatar?: string;
    }
  };
  lastMessage?: string;
  lastMessageAt?: any;
  unreadCount?: {
    [uid: string]: number;
  };
}
