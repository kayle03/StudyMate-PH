import React, { useState, useEffect, useRef } from "react";
import { Send, X, Loader2, MessageCircle, Image as ImageIcon, Paperclip, File, Download, Trash2 } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, addDoc, serverTimestamp, doc, setDoc, updateDoc, increment, deleteDoc } from "firebase/firestore";
import { DirectMessage, DMConversation, UserProfile } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface DMChatProps {
  otherUser: UserProfile | { uid: string, displayName: string, avatar?: string };
  onClose: () => void;
}

export default function DMChat({ otherUser, onClose }: DMChatProps) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attachment, setAttachment] = useState<{ type: 'image' | 'file', name: string, content: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 800 * 1024) {
      alert("File is too large! Maximum size for chat is 800KB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      setAttachment({
        type,
        name: file.name,
        content: reader.result as string
      });
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  // Generate a consistent ID for the conversation between two users
  const conversationId = [auth.currentUser?.uid, otherUser.uid].sort().join("_");

  useEffect(() => {
    if (!auth.currentUser) return;

    // Ensure conversation doc exists
    const convRef = doc(db, "dm_conversations", conversationId);
    setDoc(convRef, {
      participants: [auth.currentUser.uid, otherUser.uid],
      participantDetails: {
        [auth.currentUser.uid]: {
          displayName: auth.currentUser.displayName || "Student",
          avatar: auth.currentUser.photoURL || null
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName,
          avatar: otherUser.avatar || null
        }
      }
    }, { merge: true }).catch(() => {});

    // Mark as read when opening
    updateDoc(convRef, {
      [`unreadCount.${auth.currentUser.uid}`]: 0
    }).catch(() => {});

    // Chat listener
    const messagesRef = collection(db, "dm_conversations", conversationId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DirectMessage));
      setMessages(docs);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `dm_conversations/${conversationId}/messages`);
    });

    return () => unsub();
  }, [conversationId, otherUser.uid]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !attachment) || !auth.currentUser || sendingMessage) return;

    setSendingMessage(true);
    try {
      const msgText = newMessage.trim();
      const currentAttachment = attachment;
      setNewMessage("");
      setAttachment(null);

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

      await addDoc(collection(db, "dm_conversations", conversationId, "messages"), messageData);

      // Update conversation metadata
      await updateDoc(doc(db, "dm_conversations", conversationId), {
        lastMessage: currentAttachment ? `📎 Shared a ${currentAttachment.type}` : msgText,
        lastMessageAt: serverTimestamp(),
        [`unreadCount.${otherUser.uid}`]: increment(1)
      });

    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `dm_conversations/${conversationId}/messages`);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!auth.currentUser) return;
    try {
      await deleteDoc(doc(db, "dm_conversations", conversationId, "messages", messageId));
    } catch (err) {
      console.error("Delete DM error:", err);
      handleFirestoreError(err, OperationType.DELETE, `dm_conversations/${conversationId}/messages/${messageId}`);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 md:right-8 z-[200] w-[calc(100vw-2rem)] md:w-96">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[500px]"
      >
        <div className="bg-primary p-4 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 overflow-hidden">
              {otherUser.avatar ? (
                <img src={otherUser.avatar} alt={otherUser.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">
                  {otherUser.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{otherUser.displayName}</p>
              <p className="text-[10px] text-white/70 font-bold uppercase tracking-wider">Direct Message</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50/50 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary/30 mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-400">Say hi to {otherUser.displayName}!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === auth.currentUser?.uid;
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                  <div className={`max-w-[85%] group relative overflow-hidden rounded-[20px] shadow-sm ${
                    isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    {isMe && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="absolute top-1 right-1 p-1 bg-black/20 hover:bg-black/40 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {msg.attachment && (
                      <div className="mb-0.5">
                        {msg.attachment.type === 'image' ? (
                          <img 
                            src={msg.attachment.content} 
                            alt="Shared" 
                            className="max-w-full h-auto object-cover max-h-60"
                          />
                        ) : (
                          <div className={`p-3 border-b ${isMe ? 'border-white/10 bg-white/5' : 'border-gray-50 bg-gray-50/50'} flex items-center space-x-3`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                              <File className="w-4 h-4" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <p className={`text-[10px] font-bold truncate ${isMe ? 'text-white' : 'text-gray-700'}`}>{msg.attachment.name}</p>
                              <p className={`text-[8px] uppercase tracking-widest font-black ${isMe ? 'text-white/60' : 'text-gray-400'}`}>File Attachment</p>
                            </div>
                            <a 
                              href={msg.attachment.content} 
                              download={msg.attachment.name}
                              className={`p-1.5 rounded-lg transition-colors ${isMe ? 'hover:bg-white/20' : 'hover:bg-primary/10'}`}
                            >
                              <Download className={`w-3.5 h-3.5 ${isMe ? 'text-white' : 'text-primary'}`} />
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    {msg.text && (
                      <div className="px-4 py-2.5 text-sm">
                        {msg.text}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          <AnimatePresence>
            {attachment && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 bg-gray-50 rounded-2xl p-3 flex items-center justify-between border border-gray-100"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {attachment.type === 'image' ? (
                      <img src={attachment.content} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <File className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-700 truncate">{attachment.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{attachment.type}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAttachment(null)}
                  className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <div className="flex space-x-1">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                title="Attach Photo or Document"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={attachment ? "Add a caption..." : "Type a message..."}
              className="flex-grow bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-primary/30 transition-all"
            />
            <button 
              type="submit"
              disabled={(!newMessage.trim() && !attachment) || sendingMessage || isUploading}
              className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {sendingMessage || isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
