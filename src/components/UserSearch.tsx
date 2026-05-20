import React, { useState, useEffect } from "react";
import { Search, UserPlus, Loader2, Crown, User as UserIcon, Check, MessageCircle } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, limit, doc, onSnapshot, runTransaction, serverTimestamp, increment, setDoc } from "firebase/firestore";
import { UserProfile, StudyGroup } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface UserSearchProps {
  memberGroups: StudyGroup[];
  onMessageUser?: (user: UserProfile) => void;
}

export default function UserSearch({ memberGroups, onMessageUser }: UserSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState<{ isOpen: boolean; targetUser: UserProfile | null }>({ isOpen: false, targetUser: null });
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Check if current user is premium
    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsPremium(docSnap.data().isPremium || false);
      }
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
      }
    });

    return () => {
      unsubUser();
    };
  }, [auth.currentUser]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async (queryTerm = "") => {
    setLoading(true);
    try {
      let q;
      if (queryTerm) {
        q = query(
          collection(db, "users"),
          where("displayName", ">=", queryTerm),
          where("displayName", "<=", queryTerm + "\uf8ff"),
          limit(20)
        );
      } else {
        q = query(
          collection(db, "users"),
          limit(20)
        );
      }
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs
        .map(d => d.data() as UserProfile)
        .filter(u => u.uid !== auth.currentUser?.uid); // Don't show self
      
      setResults(docs);
    } catch (err) {
      console.error("Search error:", err);
      handleFirestoreError(err, OperationType.LIST, "users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents(searchTerm);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(searchTerm);
  };

  const handleInviteToGroup = async (group: StudyGroup) => {
    if (!showInviteModal.targetUser || !auth.currentUser) return;
    
    setInviting(group.id);
    try {
      const targetUser = showInviteModal.targetUser;
      const inviteId = `${group.id}_${auth.currentUser.uid}`;
      const inviteRef = doc(db, "users", targetUser.uid, "invites", inviteId);

      // Check if user is already a member
      const memberRef = doc(db, "groups", group.id, "members", targetUser.uid);
      // We can't easily check members of a group we don't own unless we query, 
      // but here we are owners (since we are inviting to our group).
      
      await setDoc(inviteRef, {
        groupId: group.id,
        groupName: group.name,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || "Student",
        targetUserId: targetUser.uid,
        createdAt: serverTimestamp()
      });
      
      setShowInviteModal({ isOpen: false, targetUser: null });
      alert(`Invitation sent to ${targetUser.displayName}! They can accept it in their Invitations tab.`);
    } catch (err: any) {
      if (err.message.includes('insufficient permissions')) {
        alert("You must be a Pro member to send invitations.");
      } else {
        alert("Failed to send invitation. They might already have a pending invite from you.");
      }
    } finally {
      setInviting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <Search className="w-5 h-5 mr-3 text-primary" />
          Find Other Students
        </h2>
        
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name (e.g. 'Cedric')"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/20 text-gray-900 placeholder:text-gray-400 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {results.map((user, i) => (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white border border-gray-50 p-4 rounded-3xl flex items-center justify-between hover:shadow-md transition-all"
            >
              <div 
                className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('view-profile', { detail: { userId: user.uid } }));
                }}
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden relative">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                  {user.isPremium && (
                    <div className="absolute -top-1 -right-1 bg-primary p-1 rounded-lg border-2 border-white shadow-sm scale-75">
                      <Crown className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-bold text-gray-900">{user.displayName}</h4>
                    {user.isPremium && <Crown className="w-3 h-3 text-primary" />}
                  </div>
                  <p className="text-xs text-gray-500">{user.university || "Iskolar"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onMessageUser && (
                  <button 
                    onClick={() => onMessageUser(user)}
                    className="bg-blue-50 text-blue-500 p-2.5 rounded-xl hover:bg-blue-100 transition-all group"
                    title="Message Student"
                  >
                    <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}
                {isPremium ? (
                  <button 
                    onClick={() => setShowInviteModal({ isOpen: true, targetUser: user })}
                    className="bg-primary/10 text-primary p-2.5 rounded-xl hover:bg-primary/20 transition-all group"
                    title="Add to Group"
                  >
                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <button 
                    className="bg-gray-50 text-gray-400 p-2.5 rounded-xl cursor-not-allowed opacity-50"
                    title="Upgrade to invite users"
                  >
                    <UserPlus className="w-5 h-5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {searchTerm && results.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-400 font-medium">No students found with that name.</p>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
          >
            <h3 className="text-2xl font-black text-gray-900 mb-2">Invite Student</h3>
            <p className="text-gray-500 mb-6">Which group should <span className="font-bold text-primary">{showInviteModal.targetUser?.displayName}</span> join?</p>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {memberGroups.length > 0 ? (
                memberGroups.map(group => (
                  <button 
                    key={group.id}
                    onClick={() => handleInviteToGroup(group)}
                    disabled={inviting === group.id}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-primary/5 rounded-2xl transition-all border-2 border-transparent hover:border-primary/20 text-left group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-xl text-primary shadow-sm">
                        <UserPlus className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{group.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">{group.memberCount} members</p>
                      </div>
                    </div>
                    {inviting === group.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <Check className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400">You aren't a member of any groups yet.</p>
                </div>
              )}
            </div>

            <button 
              onClick={() => setShowInviteModal({ isOpen: false, targetUser: null })}
              className="mt-8 w-full py-4 text-gray-400 font-bold hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
