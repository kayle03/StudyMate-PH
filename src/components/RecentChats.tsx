import React, { useState, useEffect } from "react";
import { MessageCircle, Loader2, User as UserIcon } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, limit } from "firebase/firestore";
import { DMConversation } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface RecentChatsProps {
  onSelectDM: (user: any) => void;
}

export default function RecentChats({ onSelectDM }: RecentChatsProps) {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "dm_conversations"),
      where("participants", "array-contains", auth.currentUser.uid),
      orderBy("lastMessageAt", "desc"),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DMConversation));
      setConversations(docs);
      setLoading(false);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, "dm_conversations");
      }
      setLoading(false);
    });

    return () => unsub();
  }, [auth.currentUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary/30" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return null; // Don't show anything if no chats
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <MessageCircle className="w-5 h-5 mr-3 text-primary" />
          Recent Chats
        </h3>
        <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
          {conversations.length} Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {conversations.map((conv) => {
          const otherUserId = conv.participants.find(id => id !== auth.currentUser?.uid);
          if (!otherUserId) return null;
          const otherUser = conv.participantDetails[otherUserId];
          const unreadCount = conv.unreadCount?.[auth.currentUser?.uid || ""] || 0;

          return (
            <motion.div 
              key={conv.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onSelectDM({ uid: otherUserId, ...otherUser })}
              className="bg-white border border-gray-100 p-4 rounded-[28px] flex items-center space-x-4 cursor-pointer hover:shadow-lg transition-all group relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-50 shadow-sm">
                {otherUser.avatar ? (
                  <img src={otherUser.avatar} alt={otherUser.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
              </div>
              
              <div className="flex-grow min-w-0">
                <p className="font-bold text-gray-900 text-sm truncate group-hover:text-primary transition-colors">
                  {otherUser.displayName}
                </p>
                <p className="text-[11px] text-gray-400 truncate font-medium">
                  {conv.lastMessage || "Started a conversation"}
                </p>
              </div>

              {unreadCount > 0 && (
                <div className="absolute top-2 right-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  {unreadCount}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
