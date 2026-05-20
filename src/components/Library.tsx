import { useState, useEffect } from "react";
import { Search, Filter, Book, FileText, Download, Star, User, Plus, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { StudyMaterial } from "../types";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, deleteDoc, doc } from "firebase/firestore";
import UploadModal from "./UploadModal";
import { motion, AnimatePresence } from "motion/react";

interface LibraryProps {
  onOpenAuth?: () => void;
}

export default function Library({ onOpenAuth }: LibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ id: string, title: string } | null>(null);

  const handleUploadClick = () => {
    if (!auth.currentUser) {
      onOpenAuth?.();
    } else {
      setIsUploadOpen(true);
    }
  };

  const handleDelete = async (materialId: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "materials", materialId));
      alert("Study material removed from library.");
    } catch (err: any) {
      console.error("Delete material error:", err);
      handleFirestoreError(err, OperationType.DELETE, `materials/${materialId}`);
      alert("Failed to delete resource: " + (err.message || "Permission Denied"));
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, "materials"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StudyMaterial[];
      setMaterials(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "materials");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || m.type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div>
          <h1 className="font-serif text-3xl text-gray-900 mb-2">Resource Library</h1>
          <p className="text-gray-500 font-sans">Access peer-reviewed notes and reviewers from across PH.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search subjects, unis..." 
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64 lg:w-96"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleUploadClick}
            className="flex items-center space-x-2 px-6 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-md hover:bg-primary-dark transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Upload</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="hidden lg:block space-y-8">
          <div>
            <h3 className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-4">Resource Type</h3>
            <div className="space-y-2">
              {['all', 'notes', 'reviewer', 'summary', 'exam', 'practice'].map(type => (
                <button 
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`block w-full text-left text-sm py-2 px-4 rounded-xl transition-all ${
                    selectedType === type 
                      ? 'bg-primary text-white font-bold shadow-md' 
                      : 'text-gray-600 hover:bg-gray-100 font-medium'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-secondary/30 rounded-3xl border border-secondary/50">
            <h4 className="text-primary font-serif font-bold text-lg mb-2">Bayanihan Drive</h4>
            <p className="text-xs text-primary-dark/70 leading-relaxed mb-4">
              Your notes can help someone pass! Join the movement of sharing knowledge.
            </p>
            <button 
              onClick={handleUploadClick}
              className="text-xs font-bold text-primary hover:underline flex items-center space-x-1"
            >
              Learn more about verified contributors →
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-gray-500 font-medium">Fetching the latest materials...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredMaterials.map((material) => (
                  <div 
                    key={material.id}
                    className="bg-white border border-gray-100 rounded-2xl p-6 hover:shadow-xl hover:border-primary/20 transition-all group flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-primary/5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-[10px] font-bold uppercase tracking-wider rounded text-gray-500 mb-1">
                            {material.type}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                            {material.title}
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 text-xs font-bold text-gray-400">
                        <Star className="w-3 h-3 text-secondary fill-secondary" />
                        <span>{material.rating || 'New'}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4 flex-grow leading-relaxed line-clamp-3">
                      {material.description}
                    </p>

                    <div className="flex items-center space-x-2 mb-4">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-widest px-2 py-1 bg-primary/5 rounded border border-primary/10">
                        {material.subject}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1 bg-gray-50 rounded border border-gray-100">
                        {material.university}
                      </span>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div 
                        className="flex items-center space-x-2 cursor-pointer hover:text-primary transition-colors group/uploader"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('view-profile', { detail: { userId: material.uploadedBy } }));
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-primary/10 group-hover/uploader:bg-primary transition-colors flex items-center justify-center">
                          <User className="w-3 h-3 text-primary group-hover/uploader:text-white transition-colors" />
                        </div>
                        <span className="text-[11px] font-bold text-gray-500 group-hover/uploader:text-primary transition-colors uppercase tracking-tight">{material.uploadedByName}</span>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {auth.currentUser?.uid === material.uploadedBy && (
                          <button 
                            onClick={() => setConfirmModal({ id: material.id, title: material.title })}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            title="Delete Resource"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                          if (!material.content) {
                            alert("This resource has no downloadable content.");
                            return;
                          }
                          
                          if (material.content.startsWith('data:')) {
                            // It's a file, download it
                            const link = document.createElement('a');
                            link.href = material.content;
                            link.download = `${material.title}`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          } else {
                            // It's a link or text
                            const url = material.content.trim();
                            if (url.startsWith('http')) {
                              window.open(url, '_blank');
                            } else {
                              // If it's just text, maybe show it (for now, just alert)
                              alert("Content: " + url.substring(0, 100) + "...");
                            }
                          }
                        }}
                        className="flex items-center space-x-1.5 text-primary font-bold text-sm hover:underline"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              </div>

              {filteredMaterials.length === 0 && (
                <div className="text-center py-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <Book className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">No materials found</h3>
                  <p className="text-gray-500 max-w-sm mx-auto mb-8">
                    Be the first to help your fellow students! Share your reviewers for this category.
                  </p>
                  <button 
                    onClick={handleUploadClick}
                    className="bg-primary text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-primary-dark transition-all"
                  >
                    Start the Bayanihan
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onSuccess={() => {
          // You could add a success toast here
        }}
      />

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
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto mb-6">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete Resource?</h3>
              
              <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8">
                Are you sure you want to remove <b>{confirmModal.title}</b>? This action will permanently delete the file from the community library.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  disabled={isDeleting}
                  className="py-4 bg-gray-50 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDelete(confirmModal.id)}
                  disabled={isDeleting}
                  className="py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
                >
                  {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
