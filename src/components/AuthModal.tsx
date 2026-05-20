import React, { useState } from "react";
import { X, Mail, Lock, User, Loader2, AlertCircle, Sparkles, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  signInAnonymously,
  updateProfile,
  User as FirebaseUser
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: ""
  });

  const syncUserProfile = async (user: FirebaseUser, additionalData: any = {}) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || additionalData.displayName || "Student",
          avatar: user.photoURL || "",
          university: "",
          major: "",
          createdAt: serverTimestamp(),
          isAnonymous: user.isAnonymous,
          isPremium: user.email?.toLowerCase() === 'cedric@gmail.com', // Special case for the requested premium account
          aiUsageCount: 0,
          points: 0,
          rank: "Beginner",
          badges: []
        });
      } else if (user.email?.toLowerCase() === 'cedric@gmail.com') {
        // Ensure this specific account becomes premium if it already exists
        await updateDoc(userRef, { isPremium: true });
      }
    } catch (err) {
      console.error("Error syncing profile to Firestore:", err);
      // We don't block auth for profile sync errors but we log them
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        await syncUserProfile(userCredential.user);
      } else {
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        if (formData.displayName) {
          await updateProfile(userCredential.user, { displayName: formData.displayName });
        }
        await syncUserProfile(userCredential.user, { displayName: formData.displayName });
      }
      onClose();
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/operation-not-allowed') {
        msg = "Email/Password sign-in is not enabled in Firebase Console. Please ask the developer to enable it or use Google/Guest Login.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password is too weak. Use at least 6 characters.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "This email is already registered. Subukan mong mag-log in.";
      } else if (err.code === 'auth/invalid-credential') {
        msg = "Maling email o password. Pakisuri at subukan muli.";
      }
      setError(msg || "Authentication failed. Please check your credentials.");
      console.error("Auth Error:", err.code, err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(result.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      await syncUserProfile(result.user, { displayName: "Guest Student" });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
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
          className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-4 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-serif font-bold text-gray-900">
              {isLogin ? "Welcome Back" : "Join the Bayanihan"}
            </h2>
            <p className="text-sm text-gray-500 mt-1 italic">
              {isLogin ? "Continue your learning journey." : "Use any email format to create your student ID."}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="px-8 pb-8 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 rounded-xl flex items-center space-x-3 text-red-600 border border-red-100 italic text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Full Name (e.g. Bulldog Dev)"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                    value={formData.displayName}
                    onChange={e => setFormData({...formData, displayName: e.target.value})}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  required
                  type="email" 
                  placeholder="student@study.ph (No verification needed)"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  required
                  type="password" 
                  placeholder="Password"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/10 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isLogin ? "Sign In" : "Sign Up"}</span>
                </>
              )}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold text-gray-400">
                <span className="bg-white px-4">Or use</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={handleGoogleSignIn}
                className="flex items-center justify-center space-x-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                <span>Google</span>
              </button>
              <button 
                type="button"
                onClick={handleGuestSignIn}
                className="flex items-center justify-center space-x-2 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-sm font-bold text-gray-700"
              >
                <Sparkles className="w-4 h-4 text-secondary" />
                <span>Guest</span>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-4">
              {isLogin ? "Bagong Iskolar?" : "May account na?"}{" "}
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary font-bold hover:underline"
              >
                {isLogin ? "Sumali na rito" : "Mag-log in" }
              </button>
            </p>
          </form>
          
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
