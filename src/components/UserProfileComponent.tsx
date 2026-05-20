import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  User as UserIcon, 
  BookOpen, 
  GraduationCap, 
  MapPin, 
  Sparkles, 
  Crown, 
  Trophy, 
  Star, 
  Medal, 
  Award, 
  Calendar, 
  Mail, 
  Check, 
  Save, 
  Coffee, 
  Code2, 
  Palette, 
  Terminal, 
  TrendingUp,
  Flame,
  UserCheck,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { UserProfile } from "../types";

interface UserProfileComponentProps {
  userProfile: UserProfile | null;
  onOpenAuth?: () => void;
  targetUserId?: string | null;
  onBack?: () => void;
}

// Preset avatars loaded from lucide with aesthetic background colors and descriptions
const PRESET_AVATARS = [
  { id: "review-hero", name: "Review Hero", icon: BookOpen, color: "bg-blue-50 text-blue-600 border-blue-200" },
  { id: "brainy-inventor", name: "Brainy Inventor", icon: Sparkles, color: "bg-yellow-50 text-yellow-600 border-yellow-200" },
  { id: "coffee-companion", name: "Coffee Companion", icon: Coffee, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "code-nerd", name: "Code Nerd", icon: Code2, color: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  { id: "stat-master", name: "Stat Master", icon: TrendingUp, color: "bg-purple-50 text-purple-600 border-purple-200" },
  { id: "creative-mind", name: "Creative Mind", icon: Palette, color: "bg-pink-50 text-pink-600 border-pink-200" },
  { id: "bayanihan-leader", name: "Bayanihan Scholar", icon: GraduationCap, color: "bg-rose-50 text-rose-600 border-rose-200" },
];

const PH_UNIVERSITIES = [
  "University of the Philippines Diliman",
  "University of the Philippines Manila",
  "Ateneo de Manila University",
  "De La Salle University Manila",
  "University of Santo Tomas",
  "National University",
  "Mapúa University",
  "Polytechnic University of the Philippines",
  "Far Eastern University",
  "University of the East",
  "University of San Carlos",
  "Other / Custom"
];

// Aesthetic badge library corresponding to user badges
const BADGES_LIBRARY = [
  { id: "Bayanihan Starter", label: "Bayanihan Starter", desc: "Joined StudyMate PH community", icon: UserCheck, color: "text-[#5A5A40] bg-[#5A5A40]/10" },
  { id: "Bronze Contributor", label: "Bronze Scholar", desc: "Shared review notes and hit 100+ points", icon: Medal, color: "text-amber-600 bg-amber-50" },
  { id: "Silver Contributor", label: "Silver Achiever", desc: "Highly praised resource provider with 500+ points", icon: Award, color: "text-slate-400 bg-slate-50 border-slate-200" },
  { id: "Gold Legend", label: "Gold Legend", desc: "Academic pillar with 1,000+ points", icon: Trophy, color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  { id: "AI Companion", label: "AI Pioneer", desc: "Used AI Assistant successfully to study smarter", icon: Terminal, color: "text-teal-600 bg-teal-50" },
  { id: "Premium Scholar", label: "VIP Scholar", desc: "Subscribed to Premium StudyMate benefits", icon: Crown, color: "text-indigo-600 bg-indigo-50" }
];

export default function UserProfileComponent({ userProfile, onOpenAuth, targetUserId, onBack }: UserProfileComponentProps) {
  const [displayName, setDisplayName] = useState("");
  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [major, setMajor] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMess, setErrorMess] = useState("");

  const user = auth.currentUser;
  const isOwnProfile = !targetUserId || targetUserId === user?.uid;

  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Load either current user's or requested user's profile
  useEffect(() => {
    if (!isOwnProfile && targetUserId) {
      setLoadingProfile(true);
      setErrorMess("");
      const fetchProfile = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", targetUserId));
          if (userDoc.exists()) {
            setViewedProfile(userDoc.data() as UserProfile);
          } else {
            setErrorMess("The requested student profile could not be found.");
          }
        } catch (err: any) {
          console.error("Error loading profile:", err);
          setErrorMess("Failed to load student profile due to permission limits.");
        } finally {
          setLoadingProfile(false);
        }
      };
      fetchProfile();
    } else {
      setViewedProfile(userProfile);
      setLoadingProfile(false);
    }
  }, [targetUserId, userProfile, isOwnProfile]);

  // Initialize fields on mount or profile change
  useEffect(() => {
    if (userProfile && isOwnProfile) {
      setDisplayName(userProfile.displayName || "");
      setSelectedAvatar(userProfile.avatar || "bayanihan-leader");
      setMajor(userProfile.major || "");
      
      const uni = userProfile.university || "";
      if (uni && PH_UNIVERSITIES.includes(uni)) {
        setUniversity(uni);
        setCustomUniversity("");
      } else if (uni) {
        setUniversity("Other / Custom");
        setCustomUniversity(uni);
      } else {
        setUniversity("");
        setCustomUniversity("");
      }
    }
  }, [userProfile, isOwnProfile]);

  if (loadingProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100 shadow-xl max-w-sm mx-auto">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="text-gray-500 font-bold">Loading student portfolio...</p>
        </div>
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-xl max-w-md mx-auto">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserIcon className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-serif text-3xl font-bold text-gray-900 mb-3">Academic Portfolio</h2>
          <p className="text-gray-500 mb-8 leading-relaxed">Please sign in to view your achievements, badges, academic statistics, and explore other scholar portfolios.</p>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/25"
            >
              Sign In Now
            </button>
          )}
        </div>
      </div>
    );
  }

  // Get active avatar component
  const getAvatarComponent = (avatarId: string) => {
    const avatar = PRESET_AVATARS.find(a => a.id === avatarId) || PRESET_AVATARS[0];
    const IconComp = avatar.icon;
    return (
      <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center ${avatar.color}`}>
        <IconComp className="w-8 h-8" />
      </div>
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMess("");
    setSaveSuccess(false);

    try {
      const finalUniversity = university === "Other / Custom" ? customUniversity : university;
      
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim() || user.email?.split("@")[0] || "Scholar",
        university: finalUniversity.trim(),
        major: major.trim(),
        avatar: selectedAvatar
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setErrorMess("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Determine points range for current rank
  const getPointsProgress = () => {
    const pts = viewedProfile.points || 0;
    let rankMin = 0;
    let rankMax = 50;
    let nextRank = "Student";

    if (pts >= 1000) {
      rankMin = 1000;
      rankMax = 2500;
      nextRank = "Dean's List Legend";
    } else if (pts >= 500) {
      rankMin = 500;
      rankMax = 1000;
      nextRank = "Master";
    } else if (pts >= 200) {
      rankMin = 200;
      rankMax = 500;
      nextRank = "Scholar";
    } else if (pts >= 50) {
      rankMin = 50;
      rankMax = 200;
      nextRank = "Achiever";
    }

    const range = rankMax - rankMin;
    const progress = Math.min(100, Math.max(0, ((pts - rankMin) / range) * 100));

    return {
      progress,
      pointsNeeded: Math.max(0, rankMax - pts),
      nextRank
    };
  };

  const { progress, pointsNeeded, nextRank } = getPointsProgress();

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="mb-6 flex items-center space-x-2 text-xs font-bold text-gray-400 hover:text-primary transition-all uppercase tracking-wider bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      <div className="mb-10 text-center md:text-left">
        <span className="text-[11px] font-black uppercase tracking-widest text-primary/70 bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">
          {isOwnProfile ? "Philippine Bayanihan Academic Hub" : "Scholar Student Portfolio"}
        </span>
        <h1 className="font-serif text-4xl font-bold text-gray-900 mt-4 tracking-tight">
          {isOwnProfile ? "Your Academic Profile" : `${viewedProfile.displayName || "Student"}'s Profile`}
        </h1>
        <p className="text-gray-500 mt-2 max-w-2xl text-sm leading-relaxed">
          {isOwnProfile 
            ? "Manage your student identity on StudyMate PH, customize your interactive avatar, check study milestones, and showcase your earned academic badges."
            : "Explore achievements, study badges, academic progress, and student identity details of your peer collaborator."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Gamification stats status & badges */}
        <div className="lg:col-span-1 space-y-6">
          {/* Identity Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            {/* Premium tag top right */}
            {viewedProfile.isPremium && (
              <div className="absolute top-5 right-5 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-full p-1.5 shadow-sm" title="Premium Scholar">
                <Crown className="w-4 h-4" />
              </div>
            )}

            <div className="mb-4">
              {getAvatarComponent(viewedProfile.avatar || "bayanihan-leader")}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-1">{viewedProfile.displayName || "Scholar"}</h2>
            <p className="text-xs text-gray-400 font-bold tracking-wider uppercase mb-5">{viewedProfile.university || "No University Set"}</p>

            {/* Core point status pill */}
            <div className="w-full bg-gradient-to-br from-[#5A5A40]/5 to-[#5A5A40]/10 border border-primary/10 rounded-2xl p-4 flex justify-between items-center text-left mb-6">
              <div>
                <span className="text-[10px] uppercase font-black text-primary/60 tracking-wider">Rank Status</span>
                <p className="font-serif text-lg font-bold text-primary capitalize">{viewedProfile.rank || "Student"}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-black text-primary/60 tracking-wider">Study Points</span>
                <p className="font-mono text-lg font-black text-primary-dark">{viewedProfile.points || 0} pts</p>
              </div>
            </div>

            {/* Rank progression slider bar */}
            <div className="w-full text-left space-y-1 mb-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-400 font-semibold">Progress to {nextRank}</span>
                <span className="font-mono font-bold text-gray-700">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2.5 bg-gray-50 border border-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {pointsNeeded > 0 ? (
                <p className="text-[10px] text-gray-400 text-right font-medium">Earn {pointsNeeded} clean study points to level up!</p>
              ) : (
                <p className="text-[10px] text-green-500 text-right font-medium">Ultimate Rank Achieved!</p>
              )}
            </div>
          </div>

          {/* Academic Achievements / Badges Panel */}
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <h3 className="font-serif text-lg font-bold text-gray-900 mb-5 flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
              Achievements Bar
            </h3>
            
            <div className="space-y-4">
              {/* Star list of active earned badges */}
              {BADGES_LIBRARY.map((badge) => {
                const hasBadge = viewedProfile.badges?.includes(badge.id) || 
                  (badge.id === "Premium Scholar" && viewedProfile.isPremium) ||
                  (badge.id === "Bayanihan Starter"); // default badge

                return (
                  <div 
                    key={badge.id}
                    className={`flex items-start space-x-3.5 p-3 rounded-2xl border transition-all ${
                      hasBadge 
                        ? "bg-white border-gray-100 shadow-sm"
                        : "bg-gray-50/50 border-dashed border-gray-200 opacity-60"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                      hasBadge ? badge.color : "bg-gray-100 text-gray-300 border-gray-200"
                    }`}>
                      <badge.icon className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center space-x-1">
                        <p className={`text-sm font-bold ${hasBadge ? "text-gray-900" : "text-gray-400"}`}>{badge.label}</p>
                        {hasBadge && <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Columns (2/3): Edit Profile & Academics info */}
        <div className="lg:col-span-2 space-y-6">
          {isOwnProfile ? (
            <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8 text-left">
              <div>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Academic Identity Cards</h2>
                <p className="text-xs text-gray-400 leading-relaxed">Customize how you appear to other study partners in community reviewing networks, discussion queues, and active study rooms.</p>
              </div>

              {/* Display message handler */}
              {saveSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-2"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>Your academic study profile has been updated successfully!</span>
                </motion.div>
              )}

              {errorMess && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-800 text-xs font-semibold">
                  {errorMess}
                </div>
              )}

              {/* Display Name and Email information grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Full Name / Display Nickname</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter displayName on StudyMate"
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Registered Email address</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-gray-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      disabled
                      value={viewedProfile.email}
                      className="w-full bg-gray-100/70 text-gray-400 border border-gray-200 cursor-not-allowed rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none"
                      title="Registered email cannot be modified"
                    />
                  </div>
                </div>
              </div>

              {/* University & Course of Study Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Philippine University / Campus</label>
                  <select
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">-- No Campus Selected --</option>
                    {PH_UNIVERSITIES.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Major Course / Program</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-gray-400">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="e.g. BS Computer Science, AB History"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Custom University conditional input */}
              {university === "Other / Custom" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2 pt-2"
                >
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Custom Campus Name</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 text-gray-400">
                      <MapPin className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="Enter university name"
                      value={customUniversity}
                      onChange={(e) => setCustomUniversity(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {/* SELECT AVATAR SECTION */}
              <div className="pt-4 border-t border-gray-50">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-4">Select Your Academic Study Persona</label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {PRESET_AVATARS.map((preset) => {
                    const PresetIcon = preset.icon;
                    const isSelected = selectedAvatar === preset.id;
                    
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatar(preset.id)}
                        className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center transition-all focus:outline-none group relative overflow-hidden ${
                          isSelected 
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/25 scale-102"
                            : "bg-white border-gray-100 text-gray-700 hover:border-gray-200 hover:bg-gray-50/50"
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl mb-2.5 flex items-center justify-center ${
                          isSelected ? "bg-white/20 text-white" : preset.color
                        }`}>
                          <PresetIcon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold tracking-tight">{preset.name}</span>

                        {isSelected && (
                          <div className="absolute right-2 top-2 bg-white text-primary rounded-full p-0.5 shadow-sm">
                            <Check className="w-3 h-3 font-semibold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save Buttons Panel */}
              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-50">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-8 py-3.5 bg-[#5A5A40] text-white rounded-2xl text-sm font-bold flex items-center space-x-2 shadow-lg shadow-[#5A5A40]/15 hover:bg-[#4d4d36] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save My Portfolio</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8 text-left">
              <div>
                <h2 className="font-serif text-2xl font-bold text-gray-900 mb-1">Academic Scholar</h2>
                <p className="text-xs text-gray-400 leading-relaxed">View student identity and university affiliation details on StudyMate PH community network.</p>
              </div>

              {/* Display Name and Email information grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Student Name</label>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900">
                    {viewedProfile.displayName || "Scholar"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">University email</label>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-semibold text-gray-400 flex items-center justify-between">
                    <span>{viewedProfile.email ? viewedProfile.email.replace(/(?<=.{3}).(?=.*@)/g, '*') : "Private"}</span>
                    <span className="text-[10px] font-black uppercase bg-green-50 text-green-600 px-2 py-0.5 rounded border border-green-100">Verified</span>
                  </div>
                </div>
              </div>

              {/* University & Course of Study Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Philippine University / Campus</label>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900 font-serif">
                    {viewedProfile.university || "No Campus Listed"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Major Course / Program</label>
                  <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-900">
                    {viewedProfile.major || "Undecided"}
                  </div>
                </div>
              </div>

              {/* Persona section */}
              <div className="pt-4 border-t border-gray-50 text-left">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-4">Academic Study Persona</label>
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 flex items-center space-x-4 max-w-md">
                  <div className="p-4 bg-white rounded-2xl text-primary shadow-sm">
                    {(() => {
                      const preset = PRESET_AVATARS.find(p => p.id === (viewedProfile.avatar || "bayanihan-leader")) || PRESET_AVATARS[0];
                      const PersonaIcon = preset.icon;
                      return <PersonaIcon className="w-6 h-6 text-primary" />;
                    })()}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">
                      {PRESET_AVATARS.find(p => p.id === (viewedProfile.avatar || "bayanihan-leader"))?.name || "Bayanihan Scholar"}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium leading-relaxed">
                      Collaboratively study with peer students using StudyMate PH attributes!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
