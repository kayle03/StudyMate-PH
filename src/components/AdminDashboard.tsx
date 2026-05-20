import { useState, useEffect } from "react";
import { 
  Users, 
  Package, 
  Shield, 
  Trash2, 
  Star, 
  Crown, 
  Search, 
  AlertTriangle,
  Loader2,
  Check,
  X,
  FileText,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { UserProfile, StudyGroup, StudyMaterial } from "../types";
import CreateGroupModal from "./CreateGroupModal";
import UploadModal from "./UploadModal";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'groups' | 'materials'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete-user' | 'delete-group' | 'delete-material' | 'toggle-admin' | 'toggle-premium';
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setLoading(true);
    let unsubUsers: any, unsubGroups: any, unsubMaterials: any;

    if (activeTab === 'users') {
      const q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(50));
      unsubUsers = onSnapshot(q, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        setLoading(false);
      });
    } else if (activeTab === 'groups') {
      const q = query(collection(db, "groups"), orderBy("createdAt", "desc"), limit(50));
      unsubGroups = onSnapshot(q, (snapshot) => {
        setGroups(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyGroup)));
        setLoading(false);
      });
    } else if (activeTab === 'materials') {
      const q = query(collection(db, "materials"), orderBy("createdAt", "desc"), limit(50));
      unsubMaterials = onSnapshot(q, (snapshot) => {
        setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyMaterial)));
        setLoading(false);
      });
    }

    return () => {
      if (unsubUsers) unsubUsers();
      if (unsubGroups) unsubGroups();
      if (unsubMaterials) unsubMaterials();
    };
  }, [activeTab]);

  const handleUpdateUser = async (uid: string, data: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, "users", uid), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteItem = async () => {
    if (!confirmAction) return;
    const { type, id } = confirmAction;

    try {
      if (type === 'delete-user') {
        // In a real app, you'd trigger a cloud function to delete the auth user too
        await deleteDoc(doc(db, "users", id));
      } else if (type === 'delete-group') {
        await deleteDoc(doc(db, "groups", id));
      } else if (type === 'delete-material') {
        await deleteDoc(doc(db, "materials", id));
      }
      setConfirmAction(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${type.split('-')[1]}s/${id}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    g.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 min-h-screen">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight flex items-center">
            <Shield className="w-10 h-10 mr-3 text-primary" />
            Admin Dashboard
          </h1>
          <p className="text-gray-500 font-medium mt-1">Manage users, groups, and study materials.</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-gray-100 mt-6 md:mt-0">
          <button 
            onClick={() => setActiveTab('users')}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'users' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users</span>
          </button>
          <button 
            onClick={() => setActiveTab('groups')}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'groups' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Groups</span>
          </button>
          <button 
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-2.5 rounded-xl font-bold flex items-center space-x-2 transition-all ${
              activeTab === 'materials' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Materials</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-100 py-5 pl-14 pr-6 rounded-[28px] focus:ring-4 focus:ring-primary/10 transition-all font-medium text-lg placeholder:text-gray-300 shadow-sm"
          />
        </div>
        
        {activeTab === 'groups' && (
          <button 
            onClick={() => setIsCreateGroupOpen(true)}
            className="hidden md:flex items-center space-x-2 bg-primary text-white px-8 py-5 rounded-[28px] font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>New Group</span>
          </button>
        )}

        {activeTab === 'materials' && (
          <button 
            onClick={() => setIsCreateMaterialOpen(true)}
            className="hidden md:flex items-center space-x-2 bg-primary text-white px-8 py-5 rounded-[28px] font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Upload Material</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p className="font-bold">Loading dashboard data...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  {activeTab === 'users' && (
                    <>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Student</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Points / Rank</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </>
                  )}
                  {activeTab === 'groups' && (
                    <>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Group Name</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Subject / Uni</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Members</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </>
                  )}
                  {activeTab === 'materials' && (
                    <>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Resource</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Subject</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Uploaded By</th>
                      <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeTab === 'users' && filteredUsers.map(user => (
                  <tr key={user.uid} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.displayName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 leading-tight">{user.displayName}</p>
                          <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <input 
                            type="number" 
                            defaultValue={user.points || 0}
                            onBlur={(e) => handleUpdateUser(user.uid, { points: parseInt(e.target.value) || 0 })}
                            className="w-16 bg-gray-50 border-none rounded-lg text-xs font-black text-primary-dark p-1 focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs font-bold text-gray-400">pts</span>
                        </div>
                        <span className="text-[10px] uppercase font-black tracking-widest text-gray-400">{user.rank}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex space-x-2">
                        {user.isPremium && (
                          <span className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center">
                            <Crown className="w-2.5 h-2.5 mr-1" /> Premium
                          </span>
                        )}
                        {user.role === 'admin' && (
                          <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-black uppercase tracking-tighter flex items-center">
                            <Shield className="w-2.5 h-2.5 mr-1" /> Admin
                          </span>
                        )}
                        {!user.isPremium && !user.role && <span className="text-xs font-medium text-gray-400">Regular</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => handleUpdateUser(user.uid, { isPremium: !user.isPremium })}
                          className={`p-2 rounded-xl transition-all ${user.isPremium ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-500 hover:bg-yellow-50'}`}
                          title={user.isPremium ? "Remove Premium" : "Make Premium"}
                        >
                          <Crown className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateUser(user.uid, { role: user.role === 'admin' ? 'user' : 'admin' })}
                          className={`p-2 rounded-xl transition-all ${user.role === 'admin' ? 'text-primary bg-primary/5' : 'text-gray-300 hover:text-primary hover:bg-primary/5'}`}
                          title={user.role === 'admin' ? "Remove Admin" : "Make Admin"}
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setConfirmAction({ type: 'delete-user', id: user.uid, name: user.displayName })}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {activeTab === 'groups' && filteredGroups.map(group => (
                  <tr key={group.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{group.description}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-primary-dark">{group.subject}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{group.university}</p>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-black">
                        {group.memberCount || 0} Students
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                         onClick={() => setConfirmAction({ type: 'delete-group', id: group.id, name: group.name })}
                         className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                         title="Delete Group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {activeTab === 'materials' && filteredMaterials.map(material => (
                  <tr key={material.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-bold text-gray-900">{material.title}</p>
                      <span className="text-[10px] font-black uppercase text-primary bg-primary/5 px-2 py-0.5 rounded italic">
                        {material.type}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-primary-dark">{material.subject}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{material.university}</p>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-medium text-gray-600">{material.uploadedByName}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <button 
                         onClick={() => setConfirmAction({ type: 'delete-material', id: material.id, name: material.title })}
                         className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                         title="Delete Material"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {(activeTab === 'users' && filteredUsers.length === 0) || 
             (activeTab === 'groups' && filteredGroups.length === 0) || 
             (activeTab === 'materials' && filteredMaterials.length === 0) ? (
              <div className="py-20 text-center text-gray-400">
                <p className="font-bold">No results found for your search.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmAction && (
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
              
              <h3 className="text-xl font-black text-gray-900 mb-2">Are you sure?</h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                You are about to delete <b>{confirmAction.name}</b>. This action is irreversible and all associated data will be purged.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmAction(null)}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteItem}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <CreateGroupModal 
        isOpen={isCreateGroupOpen} 
        onClose={() => setIsCreateGroupOpen(false)} 
        onSuccess={() => {}} 
      />

      <UploadModal 
        isOpen={isCreateMaterialOpen}
        onClose={() => setIsCreateMaterialOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
}
