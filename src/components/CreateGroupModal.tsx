import React, { useState } from "react";
import { X, Users, CheckCircle, AlertCircle, Loader2, Book, Globe } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, handleFirestoreError, OperationType, awardPoints } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, setDoc, doc, arrayUnion } from "firebase/firestore";

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateGroupModal({ isOpen, onClose, onSuccess }: CreateGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    description: "",
    privacy: "public" as 'public' | 'invite-only'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError("You must be signed in to create a group.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const groupData = {
        name: formData.name,
        subject: formData.subject,
        description: formData.description,
        createdBy: auth.currentUser.uid,
        createdByName: auth.currentUser.displayName || "Student",
        memberCount: 1,
        recentAvatars: auth.currentUser.photoURL ? [auth.currentUser.photoURL] : [],
        privacy: formData.privacy,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
      };

      const groupRef = await addDoc(collection(db, "groups"), groupData);
      
      // Also add the creator to the members subcollection
      await setDoc(doc(db, "groups", groupRef.id, "members", auth.currentUser.uid), {
        joinedAt: serverTimestamp(),
        userId: auth.currentUser.uid,
        displayName: auth.currentUser.displayName || "Student",
        avatar: auth.currentUser.photoURL || null,
        isCreator: true
      });

      // Award points for starting a community
      awardPoints(auth.currentUser.uid, 20);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        setFormData({
          name: "",
          subject: "",
          description: "",
        });
      }, 2000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, "groups");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 text-gray-900">
            <div>
              <h2 className="text-2xl font-serif font-bold">Start a Bayanihan Group</h2>
              <p className="text-sm text-gray-500">Create a space to study together with your classmates.</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {success ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Group Created!</h3>
                <p className="text-gray-500">Your study group is now live for others to join.</p>
              </motion.div>
            ) : (
              <>
                {error && (
                  <div className="p-4 bg-red-50 rounded-xl flex items-center space-x-3 text-red-600 border border-red-100">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Group Name</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. NU Manila - Chem 16 Study Buddies"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Focus Subject</label>
                  <div className="relative">
                    <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. General Chemistry"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Description</label>
                  <textarea 
                    required
                    rows={4}
                    placeholder="Tell others what you'll be studying and when you're active..."
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-400">Join Priority</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, privacy: 'public' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-1 ${
                        formData.privacy === 'public' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                      <span className="text-sm font-bold">Public</span>
                      <span className="text-[10px] opacity-70">Anyone can join instantly</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, privacy: 'invite-only' })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-1 ${
                        formData.privacy === 'invite-only' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-gray-100 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      <span className="text-sm font-bold">Invite Only</span>
                      <span className="text-[10px] opacity-70">Only invited students</span>
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Users className="w-5 h-5" />
                        <span>Launch Study Group</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
