import React, { useState, useEffect } from "react";
import { Check, Sparkles, Zap, Shield, Crown, Star, Loader2, CreditCard } from "lucide-react";
import { motion } from "motion/react";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { doc, updateDoc, onSnapshot } from "firebase/firestore";

interface PricingProps {
  onBack?: () => void;
}

const Pricing: React.FC<PricingProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsPremium(docSnap.data().isPremium || false);
      }
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpgrade = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        isPremium: true
      });
      setSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDowngrade = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        isPremium: false
      });
      // Refresh or show feedback
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Sparkles, text: "Unlimited AI reviewer generation" },
    { icon: Zap, text: "Faster processing for large PDF files" },
    { icon: Shield, text: "Private Study Circles (Invite only)" },
    { icon: Crown, text: "Iskolar Pro badge on your profile" },
    { icon: Star, text: "Early access to upcoming features" },
  ];

  if (success) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"
        >
          <Crown className="w-10 h-10 text-green-600" />
        </motion.div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Iskolar Pro!</h2>
        <p className="text-gray-600 mb-8 max-w-sm">
          Your account has been upgraded. You now have full access to all premium features.
        </p>
        <button 
          onClick={onBack}
          className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:shadow-lg transition-all"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
          Level Up Your Studies
        </h1>
        <p className="text-gray-600 text-lg">
          Join 2,000+ top students using Iskolar Pro to ace their exams.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* Free Plan */}
        <div className={`bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm ${isPremium ? 'opacity-100' : 'opacity-60'}`}>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Iskolar Free</h3>
          <div className="flex items-baseline mb-6">
            <span className="text-4xl font-black text-gray-900">₱0</span>
            <span className="text-gray-500 ml-2">/month</span>
          </div>
          
          <ul className="space-y-4 mb-8">
            <li className="flex items-center text-gray-600">
              <Check className="w-5 h-5 text-green-500 mr-3" />
              <span>3 Free AI generations</span>
            </li>
            <li className="flex items-center text-gray-600">
              <Check className="w-5 h-5 text-green-500 mr-3" />
              <span>Use points for more (50 pts)</span>
            </li>
            <li className="flex items-center text-gray-600">
              <Check className="w-5 h-5 text-green-500 mr-3" />
              <span>Public study groups</span>
            </li>
          </ul>
          
          {isPremium ? (
            <button 
              onClick={handleDowngrade}
              disabled={loading}
              className="w-full py-3 rounded-2xl font-bold text-red-500 border-2 border-red-100 hover:bg-red-50 transition-colors"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Downgrade to Free"}
            </button>
          ) : (
            <button className="w-full py-3 rounded-2xl font-bold text-gray-400 border-2 border-gray-100 cursor-not-allowed">
              Current Plan
            </button>
          )}
        </div>

        {/* Pro Plan */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative bg-white p-8 rounded-3xl border-4 border-primary shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
            {isPremium ? "Active Plan" : "Best Value"}
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">Iskolar Pro</h3>
          <div className="flex items-baseline mb-1">
            <span className="text-4xl font-black text-primary">₱99</span>
            <span className="text-gray-500 ml-2">/month</span>
          </div>
          <p className="text-[10px] text-primary font-bold uppercase mb-6 tracking-wide italic">Only 99 Pesos for unlimited access!</p>
          
          <ul className="space-y-4 mb-8">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center text-gray-700">
                <div className="bg-primary/10 p-1 rounded-lg mr-3">
                  <feature.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </li>
            ))}
          </ul>
          
          {isPremium ? (
            <div className="flex flex-col space-y-3">
              <div className="w-full bg-green-50 text-green-600 py-4 rounded-2xl font-bold flex items-center justify-center space-x-2 border-2 border-green-200">
                <Crown className="w-5 h-5" />
                <span>You are a Pro Member</span>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Upgrade via GCash / Maya</span>
                </>
              )}
            </button>
          )}
          
          <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-tighter">
            {isPremium ? "SUBSRIPTION ACTIVE • MANAGE IN SETTINGS" : "SECURE CHECKOUT • CANCEL ANYTIME"}
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Pricing;
