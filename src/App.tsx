/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Landing from './components/Landing';
import Library from './components/Library';
import AIAssistant from './components/AIAssistant';
import Community from './components/Community';
import AuthModal from './components/AuthModal';
import Pricing from './components/Pricing';
import AdminDashboard from './components/AdminDashboard';
import UserProfileComponent from './components/UserProfileComponent';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile } from './types';

export default function App() {
  const [currentView, setCurrentViewState] = useState('landing');
  const [previousView, setPreviousView] = useState('landing');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const setCurrentView = (view: string) => {
    setPreviousView(currentView === 'profile' ? previousView : currentView);
    setSelectedProfileId(null);
    setCurrentViewState(view);
  };

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handleViewProfileEvent = (e: any) => {
      const { userId } = e.detail;
      if (userId) {
        setSelectedProfileId(userId);
        setPreviousView(currentView);
        setCurrentViewState('profile');
      }
    };

    window.addEventListener('view-profile', handleViewProfileEvent as EventListener);
    return () => {
      window.removeEventListener('view-profile', handleViewProfileEvent as EventListener);
    };
  }, [currentView]);

  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (profileUnsubscribe) {
        profileUnsubscribe();
        profileUnsubscribe = null;
      }

      if (user) {
        profileUnsubscribe = onSnapshot(doc(db, "users", user.uid), (snap) => {
          if (snap.exists()) {
            const data = snap.data() as UserProfile;
            setUserProfile(data);
            
            // Auto-promote specific user to admin for dev testing
            if (data.email === 'kyleespin4@gmail.com' && data.role !== 'admin') {
              updateDoc(doc(db, "users", data.uid), { role: 'admin' });
            }

            if (data.role === 'admin' && currentView === 'landing') {
              setCurrentView('admin');
            }
          }
        });
      } else {
        setUserProfile(null);
        if (currentView === 'admin') {
          setCurrentView('landing');
        }
      }
    });

    return () => {
      authUnsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'landing':
        return <Landing onGetStarted={() => setCurrentView('library')} />;
      case 'library':
        return <Library onOpenAuth={() => setIsAuthOpen(true)} />;
      case 'community':
        return <Community onOpenAuth={() => setIsAuthOpen(true)} />;
      case 'ai-tools':
        return <AIAssistant onNavigate={setCurrentView} />;
      case 'pricing':
        return <Pricing onBack={() => setCurrentView('library')} />;
      case 'profile':
        return (
          <UserProfileComponent 
            userProfile={userProfile} 
            targetUserId={selectedProfileId} 
            onBack={() => setCurrentView(previousView || 'community')} 
            onOpenAuth={() => setIsAuthOpen(true)} 
          />
        );
      case 'admin':
        return userProfile?.role === 'admin' ? <AdminDashboard /> : <Landing onGetStarted={() => setCurrentView('library')} />;
      case 'explore':
        return (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <h1 className="font-serif text-4xl mb-4 text-gray-900">Explore Universities</h1>
            <p className="text-gray-500 mb-10">Select your campus to see tailored resources.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {['UP Diliman', 'ADMU', 'DLSU Manila', 'UST Manila', 'National University', 'Mapúa', 'PUP', 'FEU', 'UE', 'San Carlos'].map(uni => (
                <div key={uni} className="p-8 border border-gray-100 rounded-3xl hover:border-[#5A5A40] hover:shadow-xl transition-all cursor-pointer group bg-white">
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-[#5A5A40]">{uni}</h3>
                  <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">Select campus</p>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return <Landing onGetStarted={() => setCurrentView('library')} />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-light font-sans selection:bg-primary selection:text-white">
      <Header 
        onNavigate={setCurrentView} 
        currentView={currentView} 
        onOpenAuth={() => setIsAuthOpen(true)}
        userProfile={userProfile}
      />
      
      <main className="relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <Footer />
    </div>
  );
}

