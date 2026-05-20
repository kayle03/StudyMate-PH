import React, { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, BookOpen, Users, Plus, X, Loader2, Link as LinkIcon, FileText, Globe, Trash2, CheckCircle, MessageCircle, Image as ImageIcon, Settings, Shield, Unlock, LayoutGrid, Clock, AlertTriangle, Trophy, Star, Medal, LogOut } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType, awardPoints } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc, increment, runTransaction, arrayRemove, arrayUnion } from "firebase/firestore";
import { StudyGroup, ChatMessage, GroupResource, GroupTask, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface GroupRoomProps {
  group: StudyGroup;
  onClose: () => void;
}

const awardPointsInGroup = async (userId: string, groupId: string, points: number) => {
  try {
    // 1. Update Global User Profile
    await awardPoints(userId, points);
    
    // 2. Sync to Group Member Doc for Leaderboard
    const memberRef = doc(db, "groups", groupId, "members", userId);
    const userRef = doc(db, "users", userId);
    const userSnap = await getDocs(query(collection(db, "users"), limit(1))); // Just to trigger a read if needed, but we use transaction
    
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const memberDoc = await transaction.get(memberRef);
      
      if (userDoc.exists() && memberDoc.exists()) {
        transaction.update(memberRef, {
          points: userDoc.data().points,
          rank: userDoc.data().rank
        });
      }
    });
  } catch (err) {
    console.error("Group point sync error:", err);
  }
};

export default function GroupRoom({ group: initialGroup, onClose }: GroupRoomProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'resources' | 'members' | 'tasks' | 'settings'>('chat');
  const [group, setGroup] = useState<StudyGroup>(initialGroup);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resources, setResources] = useState<GroupResource[]>([]);
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", priority: 'medium' as const });
  const [newResource, setNewResource] = useState({ title: "", url: "", type: 'link' as const, fileContent: null as string | null });
  const [fileLoading, setFileLoading] = useState(false);
  const [lastReadAt, setLastReadAt] = useState<any>(null);
  const [chatAttachment, setChatAttachment] = useState<{ type: 'image' | 'file', name: string, content: string } | null>(null);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'kick' | 'leave' | 'delete' | 'resource' | 'task';
    targetId?: string;
    targetName?: string;
    targetAvatar?: string | null;
  } | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const handleChatFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("File is too large! Maximum size for chat is 800KB.");
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert("Please upload documents and files in the 'Resources' tab. Only photos are allowed in the chat room.");
      return;
    }

    setIsUploadingChatFile(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setChatAttachment({
        type: 'image',
        name: file.name,
        content: reader.result as string
      });
      setIsUploadingChatFile(false);
      if (chatFileInputRef.current) chatFileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Update lastReadAt when in chat tab
  useEffect(() => {
    if (activeTab === 'chat' && auth.currentUser && messages.length > 0) {
      const memberRef = doc(db, "groups", group.id, "members", auth.currentUser.uid);
      updateDoc(memberRef, { lastReadAt: serverTimestamp() }).catch(err => {
        // Silently fail if update fails (e.g. permission)
      });
    }
  }, [activeTab, messages.length, group.id]);

  // Fetch current user's member info for lastReadAt
  useEffect(() => {
    if (!auth.currentUser) return;
    const memberRef = doc(db, "groups", group.id, "members", auth.currentUser.uid);
    const unsub = onSnapshot(memberRef, (snapshot) => {
      if (snapshot.exists()) {
        setLastReadAt(snapshot.data().lastReadAt);
      }
    });
    return () => unsub();
  }, [group.id]);

  // Group doc listener to sync privacy etc.
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "groups", initialGroup.id), (snapshot) => {
      if (snapshot.exists()) {
        setGroup({ id: snapshot.id, ...snapshot.data() } as StudyGroup);
      }
    });
    return () => unsub();
  }, [initialGroup.id]);

  const handleUpdatePrivacy = async (privacy: 'public' | 'invite-only') => {
    if (!auth.currentUser || auth.currentUser.uid !== group.createdBy) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "groups", group.id), {
        privacy,
        lastActive: serverTimestamp()
      });
      alert(`Privacy policy updated to ${privacy}.`);
    } catch (err: any) {
      console.error("Update privacy error:", err);
      handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}`);
      alert("Failed to update privacy: " + (err.message || "Permission Denied"));
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      const groupRef = doc(db, "groups", group.id);
      const memberRef = doc(db, "groups", group.id, "members", auth.currentUser.uid);

      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupRef);
        const memberSnap = await transaction.get(memberRef);
        
        if (!groupSnap.exists()) throw new Error("Group doesn't exist.");
        if (!memberSnap.exists()) throw new Error("You are not a member of this group.");

        const groupData = groupSnap.data();
        const memberData = memberSnap.data();
        
        const currentAvatars = groupData.recentAvatars || [];
        const userAvatar = memberData.avatar;

        transaction.delete(memberRef);

        transaction.update(groupRef, {
          memberCount: Math.max(0, (groupData.memberCount || 1) - 1),
          lastActive: serverTimestamp(),
          recentAvatars: userAvatar ? currentAvatars.filter((a: any) => a !== userAvatar) : currentAvatars
        });
      });
      alert("You have left the study group.");
      onClose();
    } catch (err: any) {
      console.error("Leave error:", err);
      const errorMsg = err.message || "Unknown Error";
      alert("Failed to leave group: " + errorMsg);
      handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}/members/${auth.currentUser?.uid}`);
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!auth.currentUser || auth.currentUser.uid !== group.createdBy) {
      alert("Only the group creator can delete this group.");
      return;
    }
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, "groups", group.id));
      alert("Study group has been deleted successfully.");
      onClose();
    } catch (err: any) {
      console.error("Delete Group error:", err);
      const errorMsg = err.message || "Unknown error occurred";
      alert("Error during delete: " + errorMsg);
      handleFirestoreError(err, OperationType.DELETE, `groups/${group.id}`);
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  // Scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  useEffect(() => {
    if (!auth.currentUser) return;

    setInitialDataLoaded(false);

    // Chat listener
    const chatsRef = collection(db, "groups", group.id, "chats");
    const chatQuery = query(chatsRef, orderBy("createdAt", "asc"), limit(100));
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(docs);
      setInitialDataLoaded(true);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `groups/${group.id}/chats`);
      }
      setInitialDataLoaded(true);
    });

    // Resources listener
    const resourcesRef = collection(db, "groups", group.id, "resources");
    const resourcesQuery = query(resourcesRef, orderBy("createdAt", "desc"));
    const unsubResources = onSnapshot(resourcesQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupResource));
      setResources(docs);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `groups/${group.id}/resources`);
      }
    });

    // Members listener
    const membersRef = collection(db, "groups", group.id, "members");
    const unsubMembers = onSnapshot(membersRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(docs);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `groups/${group.id}/members`);
      }
    });

    // Tasks listener
    const tasksRef = collection(db, "groups", group.id, "tasks");
    const tasksQuery = query(tasksRef, orderBy("createdAt", "desc"));
    const unsubTasks = onSnapshot(tasksQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupTask));
      setTasks(docs);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `groups/${group.id}/tasks`);
      }
    });

    return () => {
      unsubChat();
      unsubResources();
      unsubMembers();
      unsubTasks();
    };
  }, [group.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !chatAttachment) || !auth.currentUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      const msgText = newMessage.trim();
      const currentAttachment = chatAttachment;
      setNewMessage("");
      setChatAttachment(null);

      const messageData: any = {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || "Student",
        senderAvatar: auth.currentUser.photoURL || null,
        createdAt: serverTimestamp()
      };

      if (msgText) {
        messageData.text = msgText;
      }

      if (currentAttachment) {
        messageData.attachment = currentAttachment;
      }

      await addDoc(collection(db, "groups", group.id, "chats"), messageData);
      
      // Update group activity
      await updateDoc(doc(db, "groups", group.id), {
        lastActive: serverTimestamp()
      });

      // Award points for participation
      awardPointsInGroup(auth.currentUser.uid, group.id, 2);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/chats`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleKickMember = async (memberId: string, memberName: string, avatar: string | null) => {
    setLoading(true);
    try {
      const groupRef = doc(db, "groups", group.id);
      const memberRef = doc(db, "groups", group.id, "members", memberId);

      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupRef);
        if (!groupSnap.exists()) throw new Error("Group doesn't exist.");

        const memberSnap = await transaction.get(memberRef);
        if (!memberSnap.exists()) throw new Error("Member not found in this group.");

        const groupData = groupSnap.data();
        const currentCount = groupData.memberCount || 1;
        const currentAvatars = groupData.recentAvatars || [];

        transaction.delete(memberRef);
        
        transaction.update(groupRef, {
          memberCount: Math.max(0, currentCount - 1),
          lastActive: serverTimestamp(),
          recentAvatars: avatar ? currentAvatars.filter((a: any) => a !== avatar) : currentAvatars
        });
      });

      alert(`${memberName} has been successfully removed.`);
    } catch (err: any) {
      console.error("Kick Group ERROR:", err);
      const errorMsg = err.message || "Unknown error";
      alert("Error removing member: " + errorMsg);
      handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}/members/${memberId}`);
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("File is too large! Maximum size is 800KB due to database limits.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileLoading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setNewResource({
        ...newResource,
        fileContent: reader.result as string,
        title: newResource.title || file.name,
        type: 'file'
      });
      setFileLoading(false);
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setFileLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResource.title.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "groups", group.id, "resources"), {
        title: newResource.title.trim(),
        url: newResource.url.trim(),
        type: newResource.type,
        content: newResource.fileContent,
        addedBy: auth.currentUser.uid,
        addedByName: auth.currentUser.displayName || "Student",
        createdAt: serverTimestamp()
      });
      setNewResource({ title: "", url: "", type: 'link', fileContent: null });
      setIsAddingResource(false);
      
      // Award points for sharing
      awardPointsInGroup(auth.currentUser.uid, group.id, 10);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/resources`);
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "groups", group.id, "resources", resourceId));
      alert("Resource removed from group.");
    } catch (err: any) {
      console.error("Delete resource error:", err);
      handleFirestoreError(err, OperationType.DELETE, `groups/${group.id}/resources/${resourceId}`);
      alert("Failed to delete resource: " + (err.message || "Permission Denied"));
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "groups", group.id, "tasks"), {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        priority: newTask.priority,
        status: 'todo',
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      setNewTask({ title: "", description: "", priority: 'medium' });
      setIsAddingTask(false);
      awardPointsInGroup(auth.currentUser.uid, group.id, 5);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `groups/${group.id}/tasks`);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "groups", group.id, "tasks", taskId), {
        status: newStatus
      });
      if (newStatus === 'done' && auth.currentUser) {
        awardPointsInGroup(auth.currentUser.uid, group.id, 15);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}/tasks/${taskId}`);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, "groups", group.id, "tasks", taskId));
      alert("Task removed.");
    } catch (err: any) {
      console.error("Delete task error:", err);
      handleFirestoreError(err, OperationType.DELETE, `groups/${group.id}/tasks/${taskId}`);
      alert("Failed to delete task: " + (err.message || "Permission Denied"));
    } finally {
      setLoading(false);
      setConfirmModal(null);
    }
  };

  const handleAssignTask = async (taskId: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "groups", group.id, "tasks", taskId), {
        assignedTo: auth.currentUser.uid,
        assignedToName: auth.currentUser.displayName || "Student"
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `groups/${group.id}/tasks/${taskId}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[150] flex flex-col md:flex-row h-screen">
      {/* Sidebar - Mobile: Tab Bar, Desktop: Left Column */}
      <div className="w-full md:w-80 bg-gray-50 border-r border-gray-100 flex flex-col">
        <div className="p-6">
          <button 
            onClick={onClose}
            className="flex items-center space-x-2 text-gray-400 hover:text-primary transition-colors mb-6 group"
          >
            <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span className="font-bold text-sm">Close Room</span>
          </button>
          
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 leading-tight mb-2">{group.name}</h2>
            <div className="flex items-center text-xs text-gray-400 font-bold uppercase tracking-widest">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              {group.subject}
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'chat', label: 'ChatRoom', icon: MessageSquare },
              { id: 'resources', label: 'Resources', icon: BookOpen },
              { id: 'tasks', label: 'Task Board', icon: LayoutGrid },
              { id: 'members', label: 'Classmates', icon: Users },
              ...(group.createdBy === auth.currentUser?.uid ? [{ id: 'settings', label: 'Settings', icon: Settings }] : []),
            ].map(tab => {
              const unreadCount = tab.id === 'chat' && lastReadAt && activeTab !== 'chat'
                ? messages.filter(m => {
                    if (!m.createdAt) return false;
                    const msgTime = m.createdAt.toMillis ? m.createdAt.toMillis() : 0;
                    const readTime = lastReadAt.toMillis ? lastReadAt.toMillis() : 0;
                    return msgTime > readTime && m.senderId !== auth.currentUser?.uid;
                  }).length
                : 0;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all relative ${
                    activeTab === tab.id 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                      : 'text-gray-500 hover:bg-white hover:shadow-sm'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white px-2 py-0.5 rounded-lg text-[10px] animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                  {tab.id === 'chat' && messages.length > 0 && unreadCount === 0 && (
                    <span className="ml-auto bg-gray-200 text-gray-500 px-2 py-0.5 rounded-lg text-[10px]">
                      {messages.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 hidden md:block">
          <div className="bg-primary/5 p-4 rounded-[24px] border border-primary/10">
            <p className="text-[10px] font-black uppercase text-primary mb-2">Study Group Info</p>
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              Collaborate, share notes, and help each other ace your exams!
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col h-full overflow-hidden bg-white">
        {activeTab === 'chat' && (
          <>
            <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 text-primary">
                    <MessageSquare className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Welcome to {group.name} Chat!</h3>
                  <p className="text-sm text-gray-400">This is the beginning of your conversation.</p>
                </div>

                {messages.map((msg, i) => {
                  const isMe = msg.senderId === auth.currentUser?.uid;
                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}>
                        {!isMe && (
                          <div className={`w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 ${isMe ? 'ml-2' : 'mr-2'}`}>
                            {msg.senderAvatar ? (
                              <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                                {msg.senderName.charAt(0)}
                              </div>
                            )}
                          </div>
                        )}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && <span className="text-[10px] font-bold text-gray-400 mb-1 ml-1">{msg.senderName}</span>}
                          <div className={`overflow-hidden rounded-[20px] shadow-sm ${
                            isMe ? 'bg-primary text-white rounded-br-none shadow-md' : 'bg-gray-100 text-gray-800 rounded-bl-none'
                          }`}>
                            {msg.attachment && (
                              <div className="mb-0.5">
                                {msg.attachment.type === 'image' && (
                                  <img 
                                    src={msg.attachment.content} 
                                    alt="Shared" 
                                    className="max-w-full h-auto object-cover max-h-60"
                                  />
                                )}
                              </div>
                            )}
                            {msg.text && (
                              <div className="px-4 py-3 text-sm leading-relaxed">
                                {msg.text}
                              </div>
                            )}
                          </div>
                          <span className="text-[8px] text-gray-300 font-bold mt-1 px-1 uppercase tracking-wider">
                            {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-white">
              <AnimatePresence>
                {chatAttachment && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="max-w-3xl mx-auto mb-3 bg-gray-50 rounded-2xl p-3 flex items-center justify-between border border-gray-100"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img src={chatAttachment.content} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{chatAttachment.name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Image Attachment</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setChatAttachment(null)}
                      className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center space-x-3">
                <input 
                  type="file"
                  ref={chatFileInputRef}
                  onChange={handleChatFileChange}
                  className="hidden"
                  accept="image/*"
                />
                <button 
                  type="button"
                  onClick={() => chatFileInputRef.current?.click()}
                  className="p-4 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                  title="Share Photo"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={chatAttachment ? "Add a caption..." : "Type your message..."}
                  className="flex-grow bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-primary/30 transition-all font-medium"
                />
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !chatAttachment) || sendingMessage || isUploadingChatFile}
                  className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                >
                  {sendingMessage || isUploadingChatFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </>
        )}

        {activeTab === 'resources' && (
          <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight">Shared Resources</h3>
                  <p className="text-sm text-gray-500 font-medium">Class notes, reviewers, and helpful links.</p>
                </div>
                <button 
                  onClick={() => setIsAddingResource(true)}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Resource</span>
                </button>
              </div>

              {resources.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200">
                  <BookOpen className="w-16 h-16 text-gray-200 mx-auto mb-6" />
                  <p className="text-gray-400 font-bold">No resources shared yet.</p>
                  <button 
                    onClick={() => setIsAddingResource(true)}
                    className="mt-4 text-primary font-bold text-sm hover:underline"
                  >
                    Share the first one!
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map(res => (
                    <motion.div 
                      key={res.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white border border-gray-100 p-6 rounded-[28px] hover:border-primary/20 transition-all shadow-sm flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-2xl ${
                          res.type === 'link' ? 'bg-blue-50 text-blue-500' : 'bg-orange-50 text-orange-500'
                        }`}>
                          {res.type === 'link' ? <Globe className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        {(res.addedBy === auth.currentUser?.uid || group.createdBy === auth.currentUser?.uid) && (
                          <button 
                            onClick={() => setConfirmModal({
                              type: 'resource',
                              targetId: res.id,
                              targetName: res.title
                            })}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">{res.title}</h4>
                      <p className="text-[10px] text-gray-400 font-black uppercase mb-4 tracking-wider">
                        BY {res.addedByName}
                      </p>
                      
                      {res.url ? (
                        <a 
                          href={res.url.startsWith('http') ? res.url : `https://${res.url}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-auto flex items-center justify-between bg-gray-50 hover:bg-gray-100 p-3 rounded-xl transition-all"
                        >
                          <span className="text-xs font-bold text-gray-600 truncate mr-2">{res.url}</span>
                          <LinkIcon className="w-3.5 h-3.5 text-primary" />
                        </a>
                      ) : res.content ? (
                        <a 
                          href={res.content} 
                          download={res.title}
                          className="mt-auto flex items-center justify-between bg-primary/5 hover:bg-primary/10 p-3 rounded-xl transition-all"
                        >
                          <span className="text-xs font-bold text-primary truncate mr-2">Download File</span>
                          <Plus className="w-3.5 h-3.5 text-primary rotate-45" />
                        </a>
                      ) : null}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Resource Modal Overlay */}
            <AnimatePresence>
              {isAddingResource && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-gray-900">Add Resource</h3>
                      <button onClick={() => setIsAddingResource(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleAddResource} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Title</label>
                        <input 
                          required
                          type="text"
                          value={newResource.title}
                          onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                          placeholder="e.g. Unit 1 Review Notes"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/30"
                        />
                      </div>

                      {newResource.type === 'link' ? (
                        <div>
                          <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">URL / Link</label>
                          <input 
                            type="text"
                            value={newResource.url}
                            onChange={(e) => setNewResource({...newResource, url: e.target.value})}
                            placeholder="google.drive.com/..."
                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/30"
                          />
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Upload File (Max 800KB)</label>
                          <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                          >
                            <input 
                              type="file"
                              ref={fileInputRef}
                              onChange={handleFileChange}
                              className="hidden"
                            />
                            {fileLoading ? (
                              <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            ) : newResource.fileContent ? (
                              <div className="text-center">
                                <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                                <span className="text-xs font-bold text-gray-600">File Selected</span>
                              </div>
                            ) : (
                              <div className="text-center">
                                <Plus className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                                <span className="text-xs font-bold text-gray-400">Click to select file</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Resource Type</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: 'link', label: 'Link', icon: Globe },
                            { id: 'file', label: 'Document', icon: FileText },
                          ].map(t => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setNewResource({...newResource, type: t.id as any, url: t.id === 'file' ? '' : newResource.url, fileContent: t.id === 'link' ? null : newResource.fileContent})}
                              className={`flex items-center justify-center space-x-2 p-3 rounded-xl border-2 transition-all font-bold text-xs ${
                                newResource.type === t.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              <t.icon className="w-4 h-4" />
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={fileLoading || (newResource.type === 'file' && !newResource.fileContent) || (newResource.type === 'link' && !newResource.url)}
                        className="w-full bg-primary text-white py-4 rounded-[20px] font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 mt-4 disabled:opacity-50"
                      >
                        Share Resource
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'members' && (
          <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight">Classmates</h3>
                  <p className="text-sm text-gray-500 font-medium">{members.length} {members.length === 1 ? 'student' : 'students'} in this group.</p>
                </div>
                <div className="flex items-center space-x-2 bg-yellow-50 px-4 py-2 rounded-2xl border border-yellow-100">
                  <Trophy className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs font-black text-yellow-700 uppercase tracking-wider">Top Contributors</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...members].sort((a,b) => (b.points || 0) - (a.points || 0)).map((member, index) => {
                  const isCreator = member.userId === group.createdBy || member.id === group.createdBy;
                  return (
                  <div key={member.id} className="bg-white border border-gray-100 p-4 rounded-[24px] flex items-center space-x-3 hover:shadow-md transition-all relative">
                    {index < 3 && (
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-white font-black shadow-lg">
                        {index + 1}
                      </div>
                    )}
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity min-w-0 flex-grow"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('view-profile', { detail: { userId: member.userId || member.id } }));
                        if (onClose) onClose();
                      }}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 shadow-sm relative">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <Users className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="font-bold text-gray-900 text-sm leading-tight truncate text-left">{member.displayName}</p>
                        <div className="flex items-center mt-1 space-x-2">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                            isCreator ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCreator ? 'Owner' : member.rank || 'Student'}
                          </span>
                          {(member.points || 0) > 0 && (
                            <span className="text-[8px] font-black text-yellow-600 flex items-center">
                              <Star className="w-2 h-2 mr-0.5 fill-current" />
                              {member.points}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center ml-auto">
                      {(member.userId !== auth.currentUser?.uid && member.id !== auth.currentUser?.uid) && (
                        <button 
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('open-dm', { detail: { ...member, uid: member.userId || member.id } }));
                          }}
                          className="p-2 text-primary hover:bg-primary/5 rounded-xl transition-all"
                          title="Message classmate"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      )}
                      
                      {group.createdBy === auth.currentUser?.uid && (member.userId !== auth.currentUser?.uid && member.id !== auth.currentUser?.uid) && (
                        <button 
                          onClick={() => {
                            setConfirmModal({
                              type: 'kick',
                              targetId: member.id,
                              targetName: member.displayName,
                              targetAvatar: member.avatar || null
                            });
                          }}
                          className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all ml-1 border border-transparent hover:border-red-100"
                          title="Kick Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );})}
              </div>
              
              {group.createdBy !== auth.currentUser?.uid && (
                <div className="mt-8 pt-8 border-t border-gray-100">
                   <button 
                     onClick={() => setConfirmModal({ type: 'leave' })}
                     disabled={loading}
                     className="w-full py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center space-x-2 border border-gray-100"
                   >
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                     <span>Leave This Group</span>
                   </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-3xl font-black text-gray-900 leading-tight">Study Tasks</h3>
                  <p className="text-sm text-gray-500 font-medium">Keep track of your study goals and deadlines.</p>
                </div>
                <button 
                  onClick={() => setIsAddingTask(true)}
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Task</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {['todo', 'in-progress', 'done'].map((status) => (
                  <div key={status} className="flex flex-col space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-6 rounded-full ${
                          status === 'todo' ? 'bg-gray-300' : status === 'in-progress' ? 'bg-blue-400' : 'bg-green-500'
                        }`} />
                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">
                          {status.replace('-', ' ')}
                        </h4>
                      </div>
                      <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg">
                        {tasks.filter(t => t.status === status).length}
                      </span>
                    </div>

                    <div className="flex flex-col space-y-4 min-h-[300px] p-2 bg-gray-50/50 rounded-[32px]">
                      {tasks.filter(t => t.status === status).length === 0 && (
                        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center bg-white/50 border border-dashed border-gray-200 rounded-[24px]">
                          <Clock className="w-8 h-8 text-gray-200 mb-2" />
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Empty Column</p>
                        </div>
                      )}
                      
                      {tasks.filter(t => t.status === status).map((task) => (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white border border-gray-100 p-5 rounded-[24px] shadow-sm hover:shadow-md transition-all group"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                              task.priority === 'high' ? 'bg-red-50 text-red-500' : 
                              task.priority === 'medium' ? 'bg-orange-50 text-orange-500' : 'bg-blue-50 text-blue-500'
                            }`}>
                              {task.priority} Priority
                            </span>
                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                              {(group.createdBy === auth.currentUser?.uid || task.createdBy === auth.currentUser?.uid) && (
                                <button 
                                  onClick={() => setConfirmModal({
                                    type: 'task',
                                    targetId: task.id,
                                    targetName: task.title
                                  })}
                                  className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <h5 className="font-bold text-gray-900 text-sm mb-1">{task.title}</h5>
                          {task.description && <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">{task.description}</p>}
                          
                          <div className="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                            <div className="flex -space-x-1">
                              {task.assignedTo ? (
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-[8px] font-black text-primary border-2 border-white" title={`Assigned to ${task.assignedToName}`}>
                                  {task.assignedToName?.charAt(0)}
                                </div>
                              ) : (
                                <button 
                                  onClick={() => handleAssignTask(task.id)}
                                  className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-[8px] font-black text-gray-300 border-2 border-dashed border-gray-100 hover:border-primary/30 hover:text-primary transition-all"
                                  title="Assign to me"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex space-x-1">
                              {status !== 'todo' && (
                                <button 
                                  onClick={() => handleUpdateTaskStatus(task.id, status === 'done' ? 'in-progress' : 'todo')}
                                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-400 rounded-lg transition-colors"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {status !== 'done' && (
                                <button 
                                  onClick={() => handleUpdateTaskStatus(task.id, status === 'todo' ? 'in-progress' : 'done')}
                                  className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Task Modal */}
            <AnimatePresence>
              {isAddingTask && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-gray-900">Create Task</h3>
                      <button onClick={() => setIsAddingTask(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    
                    <form onSubmit={handleAddTask} className="space-y-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Task Title</label>
                        <input 
                          required
                          type="text"
                          value={newTask.title}
                          onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                          placeholder="e.g. Read Chapter 5"
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Description (Optional)</label>
                        <textarea 
                          value={newTask.description}
                          onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                          placeholder="Briefly describe what needs to be done..."
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/30 h-24 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['low', 'medium', 'high'] as const).map(p => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setNewTask({...newTask, priority: p})}
                              className={`py-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wide ${
                                newTask.priority === p ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 text-gray-400 hover:bg-gray-50'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white py-4 rounded-[20px] font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-95 mt-4"
                      >
                        Create Task
                      </button>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-xl mx-auto">
              <div className="mb-10">
                <h3 className="text-3xl font-black text-gray-900 leading-tight mb-2">Group Settings</h3>
                <p className="text-gray-500 font-medium">Manage how students join your study group.</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
                <div className="flex items-center space-x-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">Privacy & Permissions</h4>
                    <p className="text-sm text-gray-400">Control group visibility and access.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 space-x-4">
                    <div className="pt-1">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 border border-gray-100">
                        {group.privacy === 'public' ? <Unlock className="w-5 h-5 text-green-500" /> : <Settings className="w-5 h-5 text-orange-500" />}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <p className="font-bold text-gray-900">Current Join Policy: <span className="capitalize text-primary">{group.privacy || 'public'}</span></p>
                      <p className="text-xs text-gray-500 mt-1">
                        {group.privacy === 'public' 
                          ? 'Anyone can find and join this group freely.' 
                          : 'Students can only join if they receive an invite.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <button
                      onClick={() => handleUpdatePrivacy('public')}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 ${
                        group.privacy === 'public' || !group.privacy
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <Globe className="w-6 h-6" />
                      <span className="font-bold">Set Public</span>
                      <span className="text-[10px] opacity-70">Allow any student to join</span>
                    </button>
                    <button
                      onClick={() => handleUpdatePrivacy('invite-only')}
                      className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 ${
                        group.privacy === 'invite-only' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <Shield className="w-6 h-6" />
                      <span className="font-bold">Invite Only</span>
                      <span className="text-[10px] opacity-70">Hide join button from public</span>
                    </button>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-red-50">
                   <h4 className="text-red-500 font-bold mb-2">Danger Zone</h4>
                   <p className="text-xs text-gray-400 mb-6">Permanently delete this group and all associated data. This action cannot be undone.</p>
                   <button 
                     onClick={() => setConfirmModal({ type: 'delete' })}
                     disabled={loading}
                     className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-bold border border-red-100 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center space-x-2 shadow-sm"
                   >
                     {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                     <span>Delete Study Group</span>
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Universal Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">
                {confirmModal.type === 'kick' && 'Kick Member?'}
                {confirmModal.type === 'leave' && 'Leave Group?'}
                {confirmModal.type === 'delete' && 'Delete Group?'}
                {confirmModal.type === 'resource' && 'Remove Resource?'}
                {confirmModal.type === 'task' && 'Delete Task?'}
              </h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                {confirmModal.type === 'kick' && `Are you sure you want to remove ${confirmModal.targetName} from this study group?`}
                {confirmModal.type === 'leave' && 'Are you sure you want to leave this group? You will lose access to all shared materials and chats.'}
                {confirmModal.type === 'delete' && 'WARNING: This will permanently delete the group, all shared resources, messages, and student records forever.'}
                {confirmModal.type === 'resource' && `Are you sure you want to remove the resource "${confirmModal.targetName}"?`}
                {confirmModal.type === 'task' && `Are you sure you want to delete the task "${confirmModal.targetName}"?`}
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  disabled={loading}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (confirmModal.type === 'kick') handleKickMember(confirmModal.targetId!, confirmModal.targetName!, confirmModal.targetAvatar!);
                    if (confirmModal.type === 'leave') handleLeaveGroup();
                    if (confirmModal.type === 'delete') handleDeleteGroup();
                    if (confirmModal.type === 'resource') handleDeleteResource(confirmModal.targetId!);
                    if (confirmModal.type === 'task') handleDeleteTask(confirmModal.targetId!);
                  }}
                  disabled={loading}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
