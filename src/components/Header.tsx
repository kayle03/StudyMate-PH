import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Users, Compass, Sparkles, LogIn, Menu, LogOut, User as UserIcon, Crown, Star, Medal, Trophy, Shield, Coffee, Code2, Palette, GraduationCap, TrendingUp } from "lucide-react";
import Logo from "./Logo";
import AuthModal from "./AuthModal";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { UserProfile } from "../types";

interface HeaderProps {
  onNavigate: (view: string) => void;
  currentView: string;
  onOpenAuth: () => void;
  userProfile: UserProfile | null;
}

export default function Header({ onNavigate, currentView, onOpenAuth, userProfile }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  useEffect(() => {
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    return () => authUnsubscribe();
  }, []);

  useEffect(() => {
    setIsPremium(userProfile?.isPremium || false);
  }, [userProfile]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const navItems = [
    { id: 'library', label: 'Library', icon: BookOpen },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'ai-tools', label: 'AI Assistant', icon: Sparkles },
    ...(userProfile?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : []),
    { id: 'explore', label: 'Explore Unis', icon: Compass },
    { id: 'pricing', label: 'Premium', icon: Crown },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-primary/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center cursor-pointer" 
            onClick={() => onNavigate('landing')}
            id="logo-container"
          >
            <Logo className="w-9 h-9 mr-2" />
            <span className="font-serif text-2xl font-bold text-primary">StudyMate</span>
            <span className="font-sans text-xs font-bold bg-secondary text-primary-dark px-1.5 py-0.5 rounded ml-1 tracking-tighter">PH</span>
          </div>

          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center space-x-2 text-sm font-semibold transition-all relative py-2 ${
                  currentView === item.id ? 'text-primary' : 'text-gray-400 hover:text-primary/70'
                }`}
                id={`nav-${item.id}`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {currentView === item.id && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-4">
                {userProfile && (
                  <div 
                    onClick={() => onNavigate('profile')}
                    className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-yellow-50 hover:bg-yellow-100/50 rounded-full border border-yellow-100 cursor-pointer transition-colors"
                    title={`Points: ${userProfile.points || 0}. Click to see rewards!`}
                  >
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                    <span className="text-xs font-black text-yellow-700">{userProfile.points || 0}</span>
                    <div className="h-4 w-[1px] bg-yellow-200 mx-1" />
                    <span className="text-[10px] font-black text-yellow-600 uppercase tracking-tight">{userProfile.rank}</span>
                  </div>
                )}
                
                <div className="hidden md:flex items-center space-x-3.5 pr-4 border-r border-gray-100">
                  <div 
                    onClick={() => onNavigate('profile')}
                    className="text-right cursor-pointer group"
                    title="View Academic Portfolio"
                  >
                    <div className="flex items-center justify-end space-x-1.5 mb-0.5">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors leading-none max-w-[100px] truncate">
                        {userProfile?.displayName?.split(' ')[0] || (currentUser.isAnonymous ? "Guest" : currentUser.email?.split('@')[0])}
                      </p>
                      {isPremium && (
                        <div className="bg-primary/10 text-primary p-0.5 rounded shadow-sm">
                          <Crown className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 group-hover:underline transition-all uppercase tracking-wider block">
                      My Profile
                    </span>
                  </div>
                  <div 
                    onClick={() => onNavigate('profile')}
                    className="w-9 h-9 rounded-full border border-primary/20 p-0.5 bg-gray-50 flex items-center justify-center cursor-pointer hover:border-primary transition-all shadow-sm"
                    title="View Academic Portfolio"
                  >
                    {userProfile?.avatar ? (
                      (() => {
                        const IconComp = (() => {
                          switch(userProfile.avatar) {
                            case 'review-hero': return BookOpen;
                            case 'brainy-inventor': return Sparkles;
                            case 'coffee-companion': return Coffee;
                            case 'code-nerd': return Code2;
                            case 'stat-master': return TrendingUp;
                            case 'creative-mind': return Palette;
                            default: return GraduationCap;
                          }
                        })();
                        return <IconComp className="w-4 h-4 text-primary" />;
                      })()
                    ) : currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="User" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={handleSignOut}
                  className="hidden md:flex items-center space-x-1 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={onOpenAuth}
                  className="hidden md:flex items-center space-x-2 text-sm font-semibold text-gray-400 hover:text-primary transition-colors"
                  id="login-btn"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
                <button 
                  onClick={onOpenAuth}
                  className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20 active:scale-95"
                  id="signup-btn"
                >
                  Join the Bayanihan
                </button>
              </div>
            )}
            
            <button 
              className="md:hidden text-gray-500 p-2 hover:bg-gray-100 rounded-xl" 
              id="mobile-menu-btn"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm md:hidden z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed top-0 right-0 bottom-0 w-64 bg-white shadow-xl md:hidden z-50 p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-serif font-bold text-xl text-primary">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-gray-400"><LogIn className="rotate-180" /></button>
              </div>
              
              <div className="space-y-4 mb-auto">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 w-full p-3 rounded-2xl text-left font-bold ${
                      currentView === item.id ? 'bg-primary/10 text-primary' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>

              {currentUser ? (
                <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <span className="text-sm font-bold text-gray-900 truncate max-w-[80px]">
                      {currentUser.displayName?.split(' ')[0] || (currentUser.isAnonymous ? "Guest" : "Student")}
                    </span>
                  </div>
                  <button onClick={handleSignOut} className="text-red-500 p-2"><LogOut className="w-5 h-5" /></button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    onOpenAuth();
                    setIsMenuOpen(false);
                  }}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                  Sign In
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
