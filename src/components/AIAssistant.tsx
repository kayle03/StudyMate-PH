import { useState, useEffect } from "react";
import { Sparkles, Send, Copy, RotateCcw, Brain, CheckCircle2, Loader2, ListChecks, Crown, Lock, Star } from "lucide-react";
import { generateSummary, generatePracticeQuestions } from "../lib/gemini";
import { motion, AnimatePresence } from "motion/react";
import { auth, db, handleFirestoreError, OperationType, deductPoints } from "../lib/firebase";
import { doc, onSnapshot, updateDoc, increment } from "firebase/firestore";
import { UserProfile } from "../types";

interface AIAssistantProps {
  onNavigate?: (view: string) => void;
}

export default function AIAssistant({ onNavigate }: AIAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz'>('summary');
  const [result, setResult] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [pointsError, setPointsError] = useState(false);
  const [confirmModal, setConfirmModal] = useState<boolean>(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      }
    }, (err) => {
      if (err.code !== 'permission-denied') {
        handleFirestoreError(err, OperationType.GET, `users/${auth.currentUser?.uid}`);
      }
    });

    return () => unsubscribe();
  }, [auth.currentUser]);

  const aiUsageCount = userProfile?.aiUsageCount || 0;
  const isPremium = userProfile?.isPremium || false;
  const isAuthRestricted = !auth.currentUser || auth.currentUser.isAnonymous;
  const isFreeLimitReached = !isPremium && aiUsageCount >= 3;
  const currentPoints = userProfile?.points || 0;

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    if (isAuthRestricted) return;
    
    // Check if we need to spend points
    if (isFreeLimitReached) {
      if (currentPoints < 50) {
        setPointsError(true);
        return;
      }
      setConfirmModal(true);
      return;
    }

    startAIGeneration(false);
  };

  const startAIGeneration = async (shouldDeductPoints: boolean) => {
    setIsLoading(true);
    setResult(null);
    setPointsError(false);
    setConfirmModal(false);

    try {
      if (shouldDeductPoints && auth.currentUser) {
        await deductPoints(auth.currentUser.uid, 50);
      }

      if (activeTab === 'summary') {
        const summary = await generateSummary(inputText);
        setResult(summary);
      } else {
        const questions = await generatePracticeQuestions(inputText);
        setResult(questions);
      }

      // Increment usage count if not premium AND not spending points (points are for unlimited usage after free limit)
      if (!isPremium && auth.currentUser && !shouldDeductPoints) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          aiUsageCount: increment(1)
        });
      }
    } catch (error: any) {
      if (error.message === "Insufficient points") {
        setPointsError(true);
      }
      setResult("Error processing request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="text-center mb-10">
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-100">
          <Sparkles className="w-3 h-3 mr-2" />
          Powered by Gemini AI
        </div>
        <h1 className="font-serif text-3xl text-gray-900 mb-2">Smart Study Assistant</h1>
        <p className="text-gray-500 max-w-xl mx-auto">Turn your long lecture notes into scannable summaries or practice quizzes in seconds.</p>
        
        {!isPremium && (
          <div className="mt-4 flex flex-col items-center space-y-2">
            <div className="flex items-center space-x-2">
              <div className="bg-gray-100 px-3 py-1 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-tight flex items-center">
                Free Usage: <span className={`ml-1 ${aiUsageCount >= 3 ? 'text-red-500' : 'text-primary'}`}>{Math.min(aiUsageCount, 3)}/3</span>
              </div>
              {aiUsageCount >= 3 && (
                <div className="bg-yellow-50 px-3 py-1 rounded-full text-[10px] font-bold text-yellow-600 uppercase tracking-tight flex items-center border border-yellow-100">
                  50 Points per Use
                </div>
              )}
            </div>
            {(aiUsageCount >= 2 || pointsError) && (
              <button 
                onClick={() => onNavigate?.('pricing')}
                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-tight flex items-center"
              >
                <Crown className="w-3 h-3 mr-1" />
                Ditch the limits - Go Pro for 99 Pesos
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Pane */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          {isAuthRestricted && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Login Required</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                AI Assistant is only available for registered students. Please sign in or create an account to get 3 free generations!
              </p>
              <button 
                onClick={() => auth.signOut()}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:shadow-lg transition-all"
              >
                Go to Sign In
              </button>
            </div>
          )}
          
          {isFreeLimitReached && !isAuthRestricted && currentPoints < 50 && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 text-amber-500">
                <Star className="w-8 h-8 fill-current" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Insufficient Points</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-xs">
                You've used your free tries and don't have enough points (50 req). Join some Study Groups and contribute to earn more points!
              </p>
              <div className="flex flex-col space-y-3 w-full max-w-xs">
                <button 
                  onClick={() => onNavigate?.('community')}
                  className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:shadow-lg transition-all"
                >
                  Join Community
                </button>
                <button 
                  onClick={() => onNavigate?.('pricing')}
                  className="text-primary font-bold text-xs hover:underline"
                >
                  Or upgrade to Pro
                </button>
              </div>
            </div>
          )}

          <div className="flex space-x-1 bg-gray-50 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setActiveTab('summary')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'summary' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Summarize</span>
            </button>
            <button 
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 text-sm font-bold rounded-lg transition-all ${
                activeTab === 'quiz' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>Quiz Gen</span>
            </button>
          </div>

          <textarea 
            placeholder={activeTab === 'summary' ? "Paste your lecture notes or transcript here..." : "Paste the content you want to be tested on..."}
            className="w-full h-80 p-4 bg-transparent border-0 focus:ring-0 text-gray-700 font-sans resize-none text-sm leading-relaxed"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{inputText.length} characters</span>
            <button 
              onClick={handleProcess}
              disabled={isLoading || !inputText.trim()}
              className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all shadow-md active:scale-95"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate {activeTab === 'summary' ? 'Summary' : 'Quizzes'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Pane */}
        <div className="bg-primary rounded-3xl p-6 min-h-[480px] flex flex-col shadow-2xl relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-white/80 text-xs font-bold uppercase tracking-[0.2em]">{activeTab} results</h3>
            {result && (
              <div className="flex space-x-2">
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Copy to clipboard">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors" title="Regenerate">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-grow relative z-10 overflow-y-auto">
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div 
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-white/60 space-y-4"
                >
                  <div className="relative">
                    <div className="w-12 h-12 border-2 border-white/20 rounded-full animate-ping" />
                    <Sparkles className="w-6 h-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="font-serif italic">Analyzing your notes...</p>
                </motion.div>
              ) : result ? (
                <motion.div 
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-white font-sans leading-relaxed text-sm whitespace-pre-wrap"
                >
                  {activeTab === 'summary' ? (
                    <div className="markdown-body">
                      {typeof result === 'string' ? result : JSON.stringify(result)}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {Array.isArray(result) && result.map((item: any, idx: number) => (
                        <div key={idx} className="bg-white/10 p-4 rounded-2xl border border-white/10">
                          <p className="font-bold mb-2 flex items-start">
                            <span className="text-[#8B8B6D] mr-2">Q{idx+1}.</span>
                            {item.question}
                          </p>
                          <p className="text-white/70 italic text-xs pl-7 border-l-2 border-white/10 mt-2">
                            Answer: {item.answer}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/30 text-center space-y-4">
                  <Brain className="w-16 h-16 opacity-20" />
                  <p className="max-w-xs text-sm">Your generated content will appear here. Start by adding notes on the left.</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {result && (
            <div className="mt-8 pt-6 border-t border-white/10 relative z-10 flex items-center justify-between text-white/60 text-[10px] uppercase font-bold tracking-widest">
              <span>Ready for review</span>
              <div className="flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-400" />
                Done
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-500 mx-auto mb-6">
                <Star className="w-8 h-8 fill-current" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">Spend Points?</h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                You have used your 3 free generations. Would you like to spend <b>50 points</b> to generate this {activeTab === 'summary' ? 'summary' : 'quiz'}?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmModal(false)}
                  disabled={isLoading}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => startAIGeneration(true)}
                  disabled={isLoading}
                  className="py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
