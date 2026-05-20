import { useState, useEffect } from "react";
import { Users, Search, ArrowRight, Loader2, Plus, Users2, UserSearch as FindIcon, Crown, Mail, Shield, Lock, Trash2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, handleFirestoreError, OperationType, awardPoints } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, doc, runTransaction, increment, serverTimestamp, setDoc, getDoc, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { StudyGroup } from "../types";
import CreateGroupModal from "./CreateGroupModal";
import UserSearch from "./UserSearch";
import GroupInvites from "./GroupInvites";
import GroupRoom from "./GroupRoom";
import DMChat from "./DMChat";
import RecentChats from "./RecentChats";

interface CommunityProps {
  onOpenAuth?: () => void;
}

export default function Community({ onOpenAuth }: CommunityProps) {
  const [activeTab, setActiveTab] = useState<'groups' | 'students' | 'invites'>('groups');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [inviteCount, setInviteCount] = useState(0);
  const [activeRoomGroup, setActiveRoomGroup] = useState<StudyGroup | null>(null);
  const [activeDM, setActiveDM] = useState<any | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState<string | null>(null);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<StudyGroup | null>(null);

  useEffect(() => {
    const handleOpenDM = (e: any) => {
      const user = e.detail;
      const formattedUser = {
        uid: user.userId || user.uid,
        displayName: user.displayName,
        avatar: user.avatar
      };
      setActiveDM(formattedUser);
    };

    window.addEventListener('open-dm', handleOpenDM);
    return () => window.removeEventListener('open-dm', handleOpenDM);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) {
      setInviteCount(0);
      return;
    }
    const invitesRef = collection(db, "users", auth.currentUser.uid, "invites");
    const unsub = onSnapshot(invitesRef, (snapshot) => {
      setInviteCount(snapshot.size);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/invites`);
      }
    });
    return () => unsub();
  }, [auth.currentUser]);

  useEffect(() => {
    if (!auth.currentUser) {
      setUserMemberships(new Set());
      return;
    }
    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsPremium(docSnap.data().isPremium || false);
      }
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
      }
    });
    return () => unsub();
  }, [auth.currentUser]);

  const handleCreateGroupClick = () => {
    if (!auth.currentUser) {
      onOpenAuth?.();
    } else {
      setIsModalOpen(true);
    }
  };

  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [confirmLeaveGroup, setConfirmLeaveGroup] = useState<StudyGroup | null>(null);
  const [userMemberships, setUserMemberships] = useState<Set<string>>(new Set());
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<{ isOpen: boolean; group: StudyGroup | null; members: any[] }>({ isOpen: false, group: null, members: [] });
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Fetch members for the selected group
  useEffect(() => {
    if (!selectedGroupMembers.group || !selectedGroupMembers.isOpen) return;

    setLoadingMembers(true);
    const membersRef = collection(db, "groups", selectedGroupMembers.group.id, "members");
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const membersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSelectedGroupMembers(prev => ({ ...prev, members: membersList }));
      setLoadingMembers(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `groups/${selectedGroupMembers.group?.id}/members`);
      setLoadingMembers(false);
    });

    return () => unsubscribe();
  }, [selectedGroupMembers.group?.id, selectedGroupMembers.isOpen]);

  useEffect(() => {
    if (!auth.currentUser) {
      setUserMemberships(new Set());
      return;
    }

    // Since we don't have a collection group query or a global memberships list easily accessible without many reads,
    // we can listen to the groups list and for each group, check if the current user is a member.
    // However, a more efficient way for this scope is to just check the membership for the groups currently in view.
    const unsubscribeFns: (() => void)[] = [];

    groups.forEach(group => {
      const memberRef = doc(db, "groups", group.id, "members", auth.currentUser!.uid);
      const unsub = onSnapshot(memberRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserMemberships(prev => new Set(prev).add(group.id));
        } else {
          setUserMemberships(prev => {
            const next = new Set(prev);
            next.delete(group.id);
            return next;
          });
        }
      }, (err) => {
        // Silently ignore permission errors in this local check listener
        // as it might flicker during auth state transitions
        if (err.code !== 'permission-denied') {
          console.error("Membership sync error:", err);
        }
      });
      unsubscribeFns.push(unsub);
    });

    return () => unsubscribeFns.forEach(fn => fn());
  }, [groups, auth.currentUser]);

  const handleJoinGroup = async (groupId: string) => {
    console.log("handleJoinGroup triggered for:", groupId);
    if (!auth.currentUser) {
      console.log("No user, opening auth");
      onOpenAuth?.();
      return;
    }

    setJoiningGroupId(groupId);
    try {
      console.log("Starting join transaction for user:", auth.currentUser.uid);
      const groupRef = doc(db, "groups", groupId);
      const memberRef = doc(db, "groups", groupId, "members", auth.currentUser.uid);

      await runTransaction(db, async (transaction) => {
        const groupSnap = await transaction.get(groupRef);
        if (!groupSnap.exists()) throw new Error("Group doesn't exist");
        
        const memberSnap = await transaction.get(memberRef);
        if (memberSnap.exists()) {
          throw new Error("You are already a member of this group.");
        }

        const groupData = groupSnap.data();
        const currentCount = groupData.memberCount || 0;
        const currentAvatars = groupData.recentAvatars || [];
        const userAvatar = auth.currentUser?.photoURL;
        
        let newAvatars = [...currentAvatars];
        if (userAvatar && !newAvatars.includes(userAvatar)) {
          newAvatars = [userAvatar, ...newAvatars].slice(0, 10);
        }

        transaction.set(memberRef, {
          joinedAt: serverTimestamp(),
          userId: auth.currentUser?.uid,
          displayName: auth.currentUser?.displayName || "Student",
          avatar: auth.currentUser?.photoURL || null
        });

        transaction.update(groupRef, {
          memberCount: currentCount + 1,
          recentAvatars: newAvatars,
          lastActive: serverTimestamp()
        });
      });
      
      console.log("Join transaction successful!");
      alert("Success! You have joined the group.");
      
      // Award points for joining community
      if (auth.currentUser) {
        awardPoints(auth.currentUser.uid, 5);
      }
    } catch (err: any) {
      console.error("Join error:", err);
      if (err.message !== "You are already a member of this group.") {
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/members`);
      } else {
        alert(err.message);
      }
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!auth.currentUser) return;

    setJoiningGroupId(groupId);
    try {
      const groupRef = doc(db, "groups", groupId);
      const memberRef = doc(db, "groups", groupId, "members", auth.currentUser.uid);

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
      alert("You have successfully left the study group.");
    } catch (err: any) {
      console.error("Leave error:", err);
      if (err.message !== "You are not a member of this group.") {
        alert("Leave failed: " + (err.message || "Permission Denied"));
        handleFirestoreError(err, OperationType.UPDATE, `groups/${groupId}/members`);
      } else {
        alert(err.message);
      }
    } finally {
      setJoiningGroupId(null);
      setConfirmLeaveGroup(null);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!auth.currentUser) return;
    setIsDeletingGroup(groupId);
    try {
      await deleteDoc(doc(db, "groups", groupId));
      alert("Study group has been deleted successfully.");
    } catch (err: any) {
      console.error("Delete Group error:", err);
      alert("Error deleting group: " + (err.message || "Permission Denied"));
      handleFirestoreError(err, OperationType.DELETE, `groups/${groupId}`);
    } finally {
      setIsDeletingGroup(null);
      setConfirmDeleteGroup(null);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "groups"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudyGroup[];
      setGroups(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "groups");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-gray-900 mb-2">Iskolar Community</h1>
          <p className="text-gray-500 font-sans">Find study buddies and join the conversation.</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <div className="flex bg-gray-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('groups')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'groups' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Users className="w-4 h-4" />
              <span>Groups</span>
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'students' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <FindIcon className="w-4 h-4" />
              <span>Find Students</span>
            </button>
            <button 
              onClick={() => setActiveTab('invites')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${activeTab === 'invites' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Mail className="w-4 h-4" />
              <span>Invites</span>
              {inviteCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-sm scale-90">
                  {inviteCount}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={handleCreateGroupClick}
            className="bg-primary text-white px-6 py-2.5 rounded-2xl text-sm font-bold hover:bg-primary-dark transition-colors flex items-center space-x-2 shadow-lg shadow-primary/10 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Group</span>
          </button>
        </div>
      </div>

      {activeTab === 'students' ? (
        <div className="space-y-12">
          {auth.currentUser && (
            <RecentChats onSelectDM={setActiveDM} />
          )}
          <UserSearch 
            memberGroups={groups.filter(g => userMemberships.has(g.id))} 
            onMessageUser={(user) => setActiveDM(user)}
          />
        </div>
      ) : activeTab === 'invites' ? (
        <GroupInvites />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Connecting to community groups...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {groups.map((group, i) => (
              <motion.div 
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl transition-all border-b-4 border-b-primary/10 flex flex-col"
              >
                <div 
                  className="flex justify-between items-start mb-4 cursor-pointer"
                  onClick={() => {
                    if (userMemberships.has(group.id)) {
                      setActiveRoomGroup(group);
                    } else {
                      setSelectedGroupMembers({ isOpen: true, group, members: [] });
                    }
                  }}
                >
                  <div className="p-3 bg-primary/5 rounded-2xl text-primary flex items-center justify-center">
                    {group.privacy === 'invite-only' ? <Shield className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span>Live</span>
                  </span>
                </div>
                
                <h3 
                  className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-primary transition-colors cursor-pointer"
                  onClick={() => {
                    if (userMemberships.has(group.id)) {
                      setActiveRoomGroup(group);
                    } else {
                      setSelectedGroupMembers({ isOpen: true, group, members: [] });
                    }
                  }}
                >
                  {group.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2 font-medium">{group.subject}</p>
                <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed flex-grow">
                  {group.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex -space-x-2">
                      {group.recentAvatars && group.recentAvatars.length > 0 ? (
                        group.recentAvatars.slice(0, 4).map((avatar, idx) => (
                          <div key={idx} className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 overflow-hidden shadow-sm">
                            <img 
                              src={avatar} 
                              alt="member" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
                              }}
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center">
                          <Users2 className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-400">
                      {group.memberCount || 0} {group.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  </div>
                  
                  {userMemberships.has(group.id) ? (
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={() => setActiveRoomGroup(group)}
                        className="bg-primary text-white px-3 py-2 rounded-xl transition-all font-bold text-xs active:scale-95 shadow-sm hover:shadow-md"
                      >
                        Enter
                      </button>
                      <button 
                        onClick={() => setConfirmLeaveGroup(group)}
                        disabled={joiningGroupId === group.id}
                        className="text-red-400 hover:text-red-600 p-2 transition-all disabled:opacity-50"
                        title="Leave Group"
                      >
                        {joiningGroupId === group.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4 rotate-45" />
                        )}
                      </button>
                      {auth.currentUser?.uid === group.createdBy && (
                        <button 
                          onClick={() => setConfirmDeleteGroup(group)}
                          disabled={isDeletingGroup === group.id}
                          className="text-gray-300 hover:text-red-500 p-2 transition-all disabled:opacity-50"
                          title="Delete Group"
                        >
                          {isDeletingGroup === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      {group.privacy === 'invite-only' ? (
                        <div className="flex items-center space-x-1.5 bg-gray-100 text-gray-400 px-4 py-2 rounded-xl font-bold text-xs cursor-default" title="This group is invite-only">
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleJoinGroup(group.id)}
                          disabled={joiningGroupId === group.id}
                          className="flex items-center space-x-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 rounded-xl transition-all font-bold text-xs active:scale-95 disabled:opacity-50"
                        >
                          {joiningGroupId === group.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Users2 className="w-3 h-3" />
                              <span>Join</span>
                            </>
                          )}
                        </button>
                      )}
                      
                      {auth.currentUser?.uid === group.createdBy && (
                        <button 
                          onClick={() => setConfirmDeleteGroup(group)}
                          disabled={isDeletingGroup === group.id}
                          className="text-gray-300 hover:text-red-500 p-2 transition-all disabled:opacity-50 ml-1"
                          title="Delete Group"
                        >
                          {isDeletingGroup === group.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {groups.length === 0 && (
            <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Users2 className="w-16 h-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">No active groups yet</h3>
              <p className="text-gray-500 max-w-sm mx-auto mb-8">
                StudyMate is better together. Be the spark and start the first study group for your course!
              </p>
              <button 
                onClick={handleCreateGroupClick}
                className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-primary-dark transition-all"
              >
                Create Your Group
              </button>
            </div>
          )}
        </>
      )}

      <CreateGroupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {}} 
      />

      {/* Member List Modal */}
      <AnimatePresence>
        {selectedGroupMembers.isOpen && selectedGroupMembers.group && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedGroupMembers.group.name}</h3>
                  <p className="text-sm text-gray-500 font-medium">{selectedGroupMembers.group.subject}</p>
                </div>
                <button 
                  onClick={() => setSelectedGroupMembers({ isOpen: false, group: null, members: [] })}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <Plus className="w-6 h-6 rotate-45 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
                    <p className="text-gray-500 text-sm font-medium">Fetching group members...</p>
                  </div>
                ) : selectedGroupMembers.members.length > 0 ? (
                  selectedGroupMembers.members.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                      <div 
                        className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('view-profile', { detail: { userId: member.userId || member.id } }));
                          setSelectedGroupMembers({ isOpen: false, group: null, members: [] });
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gray-200 overflow-hidden">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <FindIcon className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{member.displayName}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black">Member</p>
                        </div>
                      </div>
                      {member.userId === selectedGroupMembers.group?.createdBy && (
                        <div className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-md">
                          Owner
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400 font-medium">No members found.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-gray-100">
                <button 
                  onClick={() => setSelectedGroupMembers({ isOpen: false, group: null, members: [] })}
                  className="w-full py-4 text-primary font-bold hover:text-primary-dark transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeRoomGroup && (
          <GroupRoom group={activeRoomGroup} onClose={() => setActiveRoomGroup(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeDM && (
          <DMChat otherUser={activeDM} onClose={() => setActiveDM(null)} />
        )}
      </AnimatePresence>

      {/* Universal Confirmation Modal for Leaver */}
      <AnimatePresence>
        {confirmLeaveGroup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <Crown className="w-8 h-8 rotate-180" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">Leave Group?</h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                Are you sure you want to leave <b>{confirmLeaveGroup.name}</b>?
                You will lose access to all shared materials and chats.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmLeaveGroup(null)}
                  disabled={joiningGroupId === confirmLeaveGroup.id}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleLeaveGroup(confirmLeaveGroup.id)}
                  disabled={joiningGroupId === confirmLeaveGroup.id}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {joiningGroupId === confirmLeaveGroup.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Leave Group'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Deletion in Community */}
      <AnimatePresence>
        {confirmDeleteGroup && (
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
              
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete Group?</h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                Are you sure you want to permanently delete <b>{confirmDeleteGroup.name}</b>?
                This action cannot be undone and all data will be lost.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmDeleteGroup(null)}
                  disabled={isDeletingGroup === confirmDeleteGroup.id}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteGroup(confirmDeleteGroup.id)}
                  disabled={isDeletingGroup === confirmDeleteGroup.id}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeletingGroup === confirmDeleteGroup.id ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete Group'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="mt-12 bg-orange-50 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between border border-orange-100">
        <div className="mb-6 md:mb-0">
          <h2 className="text-2xl font-bold text-orange-900 mb-2">Can't find your subject?</h2>
          <p className="text-orange-700 font-medium">Start a new Bayanihan group and invite your classmates.</p>
        </div>
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="bg-white text-orange-600 px-6 py-3 rounded-full font-bold shadow-sm hover:shadow-md transition-shadow">
            Browse All Subjects
          </button>
          <button className="bg-orange-600 text-white px-6 py-3 rounded-full font-bold shadow-sm hover:bg-orange-700 transition-colors">
            Start New Group
          </button>
        </div>
      </div>
    </div>
  );
}
