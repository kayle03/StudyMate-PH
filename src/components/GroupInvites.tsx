import React, { useState, useEffect } from "react";
import { Mail, Check, X, Loader2, Users, Calendar, AlertTriangle } from "lucide-react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, onSnapshot, doc, runTransaction, serverTimestamp, increment, deleteDoc } from "firebase/firestore";
import { GroupInvite } from "../types";
import { motion, AnimatePresence } from "motion/react";

export default function GroupInvites() {
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [declineModal, setDeclineModal] = useState<GroupInvite | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const invitesRef = collection(db, "users", auth.currentUser.uid, "invites");
    const unsubscribe = onSnapshot(invitesRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GroupInvite));
      setInvites(docs);
      setLoading(false);
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.LIST, `users/${auth.currentUser?.uid}/invites`);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAccept = async (invite: GroupInvite) => {
    if (!auth.currentUser) return;
    setProcessing(invite.id);

    try {
      const memberRef = doc(db, "groups", invite.groupId, "members", auth.currentUser.uid);
      const groupRef = doc(db, "groups", invite.groupId);
      const inviteRef = doc(db, "users", auth.currentUser.uid, "invites", invite.id);

      await runTransaction(db, async (transaction) => {
        // Add to group members
        transaction.set(memberRef, {
          userId: auth.currentUser?.uid,
          displayName: auth.currentUser?.displayName || "Student",
          avatar: auth.currentUser?.photoURL || null,
          joinedAt: serverTimestamp(),
          invitedBy: invite.senderId
        });

        // Update group member count
        transaction.update(groupRef, {
          memberCount: increment(1),
          lastActive: serverTimestamp()
        });

        // Delete the invite
        transaction.delete(inviteRef);
      });
    } catch (err) {
      alert("Failed to join group. You might already be a member.");
      // If fails, we should still delete the invite if it's already used
      try {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "invites", invite.id));
      } catch (e) {}
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async (invite: GroupInvite) => {
    if (!auth.currentUser) return;
    
    setProcessing(invite.id);

    try {
      const inviteRef = doc(db, "users", auth.currentUser.uid, "invites", invite.id);
      await deleteDoc(inviteRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/invites/${invite.id}`);
    } finally {
      setProcessing(null);
      setDeclineModal(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Checking for invitations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
          <Mail className="w-5 h-5 mr-3 text-primary" />
          Pending Invitations
        </h2>
        <p className="text-sm text-gray-500 mb-6">Invitations from PRO members to join their study groups.</p>

        {invites.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
            <Mail className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No pending invitations.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {invites.map((invite) => (
                <motion.div 
                  key={invite.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-gray-50 border border-gray-100 p-5 rounded-[24px] flex flex-col justify-between hover:border-primary/20 transition-all group"
                >
                  <div className="mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded-md tracking-wider">
                        Study Group Invite
                      </span>
                    </div>
                    <h4 className="font-bold text-lg text-gray-900 group-hover:text-primary transition-colors">{invite.groupName}</h4>
                    <div className="flex items-center text-xs text-gray-500 mt-2 space-x-4">
                      <div className="flex items-center">
                        <Users className="w-3 h-3 mr-1" />
                        From {invite.senderName}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {invite.createdAt?.toDate ? invite.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleAccept(invite)}
                      disabled={processing !== null}
                      className="flex-grow flex items-center justify-center space-x-2 bg-primary text-white py-2.5 rounded-xl text-sm font-bold hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      {processing === invite.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => setDeclineModal(invite)}
                      disabled={processing !== null}
                      className="px-4 flex items-center justify-center bg-white text-gray-400 border border-gray-200 py-2.5 rounded-xl text-sm font-bold hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all active:scale-95 disabled:opacity-50"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {declineModal && (
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
              
              <h3 className="text-xl font-black text-gray-900 mb-2">Decline Invite?</h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                Are you sure you want to decline the invitation to join <b>{declineModal.groupName}</b>?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setDeclineModal(null)}
                  disabled={processing !== null}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDecline(declineModal)}
                  disabled={processing !== null}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
