import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Layout, 
  Image as ImageIcon, 
  Layers, 
  ChevronRight, 
  Download, 
  Sparkles, 
  LogOut, 
  User, 
  Folder, 
  Palette, 
  Type as TypeIcon,
  X,
  Upload,
  Loader2,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import confetti from 'canvas-confetti';
import { auth, db, signIn, signOut } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy,
  limit
} from 'firebase/firestore';
import { Project, Asset, Variation, Suggestion, CampaignType } from './types';
import { cn, handleFirestoreError, OperationType } from './lib/utils';

// --- Templates ---
const TEMPLATES = [
  { id: '1', name: 'Social Media Post', type: 'social_media' as CampaignType, ratio: '1:1' },
  { id: '2', name: 'Email Header', type: 'banner' as CampaignType, ratio: '16:9' },
  { id: '3', name: 'Ad Banner', type: 'promo' as CampaignType, ratio: '4:1' },
  { id: '4', name: 'Event Poster', type: 'poster' as CampaignType, ratio: '3:4' },
];

const CAMPAIGN_TYPES: { id: CampaignType; label: string; icon: any }[] = [
  { id: 'poster', label: 'Poster', icon: ImageIcon },
  { id: 'banner', label: 'Banner', icon: Layout },
  { id: 'social_media', label: 'Social Media', icon: Sparkles },
  { id: 'event', label: 'Event Graphic', icon: Folder },
  { id: 'promo', label: 'Promotional Asset', icon: Layers },
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'projects'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(p);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));
    return unsubscribe;
  }, [user]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return <LandingUI onSignIn={signIn} />;
  }

  return (
    <div className="flex h-screen bg-[#F3F2EE] overflow-hidden text-[#1A1A1A]">
      {/* Sidebar */}
      <nav className="w-72 border-r border-[#D1D1CF] bg-white flex flex-col">
        <div className="p-8 border-b border-[#F3F2EE] mb-4">
          <div className="mb-10">
            <h1 className="text-4xl font-serif font-black tracking-tight leading-none uppercase italic">V.C.G</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] mt-2 text-[#888]">Visual Campaign Gen</p>
          </div>
          
          <button 
            onClick={() => setShowWizard(true)}
            className="w-full btn-primary gap-2 py-3"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-8">
          <div>
            <h3 className="editorial-label">Projects</h3>
            <div className="space-y-1">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => setActiveProjectId(p.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all text-left",
                    activeProjectId === p.id ? "bg-[#F3F2EE] border border-[#D1D1CF]" : "text-[#555] hover:text-black"
                  )}
                >
                  <Folder className={cn("w-4 h-4", activeProjectId === p.id ? "text-black" : "text-[#888]")} />
                  <span className="truncate font-serif italic text-base">{p.name}</span>
                </button>
              ))}
              {projects.length === 0 && (
                <p className="px-3 py-4 text-[11px] text-[#888] italic uppercase tracking-widest">No active units</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#D1D1CF]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 grayscale contrast-125" />
              ) : (
                <div className="w-8 h-8 bg-black flex items-center justify-center text-white">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-widest truncate">{user.displayName || 'Creator'}</p>
                <p className="text-[9px] text-[#888] truncate">{user.email}</p>
              </div>
            </div>
            <button onClick={signOut} className="p-2 hover:bg-neutral-100 transition-colors text-neutral-400">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeProject ? (
            <div key={activeProject.id} className="h-full">
              <Studio project={activeProject} onBack={() => setActiveProjectId(null)} />
            </div>
          ) : (
            <div key="dashboard" className="h-full">
              <Dashboard projects={projects} onProjectSelect={setActiveProjectId} onNewProject={() => setShowWizard(true)} />
            </div>
          )}
        </AnimatePresence>

        {showWizard && (
          <ProjectWizard 
            userId={user.uid}
            onClose={() => setShowWizard(false)} 
            onCreated={(id) => {
              setActiveProjectId(id);
              setShowWizard(false);
            }} 
          />
        )}
      </main>
    </div>
  );
}

// --- Sub-Components ---

function LandingUI({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#F3F2EE] p-6 text-[#1A1A1A]">
      <div className="max-w-4xl w-full text-center space-y-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-3 px-6 py-2 border border-[#1A1A1A] font-serif italic text-sm font-medium mb-4"
        >
          <Sparkles className="w-4 h-4" />
          Powered by Gemini AI Engine
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-7xl md:text-9xl font-serif font-black tracking-tighter leading-[0.85] uppercase italic"
        >
          Visual <br /> <span className="text-white/0" style={{ WebkitTextStroke: '1px #1A1A1A' }}>Campaign</span> <br /> Generator
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-[#555] max-w-xl mx-auto font-medium uppercase tracking-widest leading-relaxed"
        >
          A sophisticated creative studio for instantaneous visual synthesis. Build markers of distinction in seconds.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="pt-8"
        >
          <button 
            onClick={onSignIn}
            className="btn-primary text-xl px-12 py-5 gap-6"
          >
            Access Studio
            <ChevronRight className="w-6 h-6" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

function Dashboard({ projects, onProjectSelect, onNewProject }: { 
  projects: Project[], 
  onProjectSelect: (id: string) => void,
  onNewProject: () => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-12 overflow-y-auto h-full bg-[#F3F2EE]"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between border-b-2 border-black pb-8 mb-12">
          <div>
            <h2 className="text-5xl font-serif font-black italic mb-2 uppercase">Workspace</h2>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#888]">Central Archive / Projects 1.0</p>
          </div>
          <button onClick={onNewProject} className="btn-primary gap-4 px-8">
            <Plus className="w-4 h-4" /> Start New Synthesis
          </button>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {projects.map((p, i) => (
              <motion.div 
                key={p.id} 
                layoutId={p.id}
                initial={{ rotate: i % 2 === 0 ? -1 : 1 }}
                onClick={() => onProjectSelect(p.id)}
                className="studio-card p-4 cursor-pointer group hover:rotate-0 transition-transform bg-white"
              >
                <div className="bg-[#1A1A1A] aspect-[4/5] flex flex-col justify-between p-6 mb-6">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40 border border-white/20 px-2 py-1">
                      {p.campaignType.replace('_', ' ')}
                    </span>
                    <Folder className="w-4 h-4 text-white/20" />
                  </div>
                  <h3 className="text-3xl font-serif italic text-white leading-none truncate">{p.name}</h3>
                </div>
                
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#555]">
                  <span>Updated {new Date(p.updatedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <span>Open</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 border border-[#D1D1CF] bg-white shadow-inner">
            <Sparkles className="w-16 h-16 text-[#D1D1CF] mb-8" />
            <h3 className="text-2xl font-serif italic mb-2">Archive Empty</h3>
            <p className="text-[11px] uppercase tracking-widest text-[#888] mb-10">Waiting for first generation</p>
            <button onClick={onNewProject} className="btn-primary">
              Initialize Synthesis
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ProjectWizard({ userId, onClose, onCreated }: { userId: string, onClose: () => void, onCreated: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    name: '',
    campaignType: 'social_media' as CampaignType,
    brandDetails: '',
    visualStyle: 'High Contrast Editorial'
  });

  const handleCreate = async () => {
    if (!data.name) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, 'projects'), {
        ...data,
        userId,
        createdAt: now,
        updatedAt: now
      });
      onCreated(docRef.id);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#1A1A1A]/90 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#F3F2EE] p-12 border border-white shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-8 right-8 p-2 hover:bg-neutral-200 transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="mb-12">
          <div className="flex gap-4 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className={cn("h-1 flex-1 transition-all", i <= step ? "bg-black" : "bg-black/10")} />
            ))}
          </div>
          <h2 className="text-4xl font-serif font-black italic uppercase leading-none">
            {step === 1 && "The Project Name"}
            {step === 2 && "The Medium"}
            {step === 3 && "The Narrative"}
          </h2>
        </div>

        <div className="min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="editorial-label">Title of Work</label>
                <input 
                  autoFocus
                  placeholder="e.g. AUTUMN ART GALA"
                  className="input-field text-2xl font-serif italic"
                  value={data.name}
                  onChange={e => setData({...data, name: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && setStep(2)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              {CAMPAIGN_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setData({...data, campaignType: t.id})}
                  className={cn(
                    "flex flex-col items-center gap-4 p-8 border transition-all text-center group",
                    data.campaignType === t.id ? "bg-white border-black" : "bg-white/50 border-[#D1D1CF] hover:border-black"
                  )}
                >
                  <t.icon className={cn("w-6 h-6", data.campaignType === t.id ? "text-black" : "text-[#D1D1CF] group-hover:text-black")} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{t.label}</span>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8">
              <div>
                <label className="editorial-label">Event Narrative / Description</label>
                <textarea 
                  rows={4}
                  placeholder="A sophisticated art auction featuring local creators..."
                  className="input-field resize-none italic"
                  value={data.brandDetails}
                  onChange={e => setData({...data, brandDetails: e.target.value})}
                />
              </div>
              <div>
                <label className="editorial-label">Visual Aesthetic Preset</label>
                <div className="grid grid-cols-2 gap-2">
                  {['High Contrast Editorial', 'Soft Minimalist', 'Swiss Grid', 'Retro Pop'].map(s => (
                    <button
                      key={s}
                      onClick={() => setData({...data, visualStyle: s})}
                      className={cn(
                        "px-4 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all",
                        data.visualStyle === s ? "bg-black text-white border-black" : "bg-white text-[#555] border-[#D1D1CF] hover:border-black"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#D1D1CF]">
          <button 
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="btn-secondary"
          >
            Back
          </button>
          {step < 3 ? (
            <button 
              disabled={step === 1 && !data.name}
              onClick={() => setStep(step + 1)}
              className="btn-primary"
            >
              Continue
            </button>
          ) : (
            <button 
              onClick={handleCreate}
              disabled={loading}
              className="btn-primary gap-4 px-10"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Initiate Studio"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function Studio({ project, onBack }: { project: Project, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'studio' | 'assets' | 'history'>('studio');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);

  useEffect(() => {
    const qv = query(
      collection(db, 'projects', project.id, 'variations'),
      orderBy('createdAt', 'desc')
    );
    const uv = onSnapshot(qv, (snap) => {
      setVariations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Variation)));
    });

    const qa = query(
      collection(db, 'projects', project.id, 'assets'),
      orderBy('createdAt', 'desc')
    );
    const ua = onSnapshot(qa, (snap) => {
      setAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    });

    return () => { uv(); ua(); };
  }, [project.id]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/campaign/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignType: project.campaignType,
          brandDetails: project.brandDetails,
          visualStyle: project.visualStyle
        })
      });
      const data = await res.json();
      setSuggestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createVariation = async (suggestion: Suggestion) => {
    setLoading(true);
    try {
      const imgRes = await fetch('/api/campaign/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: `${suggestion.imagePrompt}, in ${project.visualStyle} style, professional commercial visual`,
          aspectRatio: TEMPLATES.find(t => t.type === project.campaignType)?.ratio || "1:1"
        })
      });
      const imgData = await imgRes.json();
      
      const varData: Omit<Variation, 'id'> = {
        projectId: project.id,
        headline: suggestion.headline,
        description: suggestion.description,
        imagePrompt: suggestion.imagePrompt,
        colors: suggestion.colors,
        imageUrl: imgData.imageUrl,
        createdAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'projects', project.id, 'variations'), varData);
      setSelectedVariation({ id: docRef.id, ...varData });
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-full flex-1"
    >
      {/* LEFT PANEL: Navigation & Assets */}
      <aside className="w-64 border-r border-[#D1D1CF] bg-white flex flex-col p-6 overflow-y-auto">
        <button onClick={onBack} className="flex items-center gap-2 text-[#888] hover:text-black mb-10 transition-colors uppercase text-[10px] font-bold tracking-widest">
          <ChevronRight className="w-3 h-3 rotate-180" />
          General Archive
        </button>

        <section className="mb-10">
          <h3 className="editorial-label">Core Identity</h3>
          <div className="bg-[#F3F2EE] p-4 border border-[#D1D1CF] mb-4">
             <h4 className="text-xl font-serif font-black italic uppercase leading-none">{project.name}</h4>
             <p className="text-[9px] uppercase font-bold tracking-wider mt-2 opacity-60">{project.campaignType.replace('_', ' ')}</p>
          </div>
          <p className="text-xs text-[#555] line-clamp-3 italic mb-4 leading-relaxed">{project.brandDetails}</p>
        </section>

        <section className="flex-1">
          <h3 className="editorial-label">Brand Assets</h3>
          <AssetUploader projectId={project.id} />
          <div className="grid grid-cols-2 gap-2 mt-4">
            {assets.map(a => (
              <div key={a.id} className="group relative aspect-square bg-white border border-[#E5E5E3] p-1 flex items-center justify-center overflow-hidden">
                <img src={a.url} alt={a.name} className="w-full h-full object-contain grayscale contrast-125" />
                <button 
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'projects', project.id, 'assets', a.id));
                    } catch(e) { console.error(e); }
                  }}
                  className="absolute top-1 right-1 p-1 bg-white/90 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-6 border-t border-[#D1D1CF] mt-auto">
           <button onClick={() => setActiveTab('history')} className="text-[10px] font-bold uppercase tracking-widest text-[#888] hover:text-black transition-colors">
              Generation History ({variations.length})
           </button>
        </div>
      </aside>

      {/* CENTER VIEWPORT: Canvas */}
      <main className="flex-1 bg-[#F3F2EE] h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
        <header className="w-full max-w-2xl flex items-center justify-between mb-8 pb-4 border-b border-[#D1D1CF]">
           <div className="flex gap-6">
              <span className="text-[11px] font-bold uppercase tracking-widest border-b-2 border-black pb-1">Master Canvas</span>
              <button 
                onClick={() => setActiveTab('history')}
                className="text-[11px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100"
              >
                Drafts
              </button>
           </div>
           {selectedVariation && <ExportMenu variation={selectedVariation} />}
        </header>

        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
          {selectedVariation ? (
            <div className="space-y-12">
              <StudioCanvas variation={selectedVariation} />
              <div className="flex justify-between items-end">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] max-w-xs leading-loose">
                  Variation ID_{selectedVariation.id.slice(0, 8)} / <br /> {selectedVariation.description}
                </p>
                <div className="flex gap-4">
                  {selectedVariation.colors.map(c => (
                    <div key={c} className="w-8 h-8 rounded-full border border-black/10 shadow-inner" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-32 bg-white/50 border border-dashed border-[#D1D1CF] w-full max-w-xl">
               <Sparkles className="w-12 h-12 text-[#D1D1CF] mx-auto mb-6" />
               <h3 className="text-xl font-serif italic mb-2">Awaiting Synthesis</h3>
               <p className="text-[10px] uppercase tracking-widest text-[#888]">Select a variation from the generator</p>
            </div>
          )}
        </div>
      </main>

      {/* RIGHT PANEL: Generator Settings */}
      <aside className="w-80 border-l border-[#D1D1CF] bg-white h-full flex flex-col p-8 overflow-y-auto">
        <h2 className="editorial-label mb-8">Campaign Synthesis</h2>

        <div className="flex-1 space-y-10">
          <section>
            <label className="editorial-label">Generation Mode</label>
            <div className="flex gap-2">
              <button onClick={() => generateSuggestions()} disabled={loading} className="flex-1 btn-primary py-4">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Gen. Ideas"}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <label className="editorial-label">AI Visual Options</label>
            {suggestions.length > 0 ? (
              <div className="space-y-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => createVariation(s)}
                    disabled={loading}
                    className="w-full text-left studio-card p-4 hover:border-black transition-all group bg-neutral-50"
                  >
                    <h4 className="font-serif italic text-lg mb-2 group-hover:text-black">{s.headline}</h4>
                    <div className="flex gap-1 mb-2">
                        {s.colors.map(c => <div key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />)}
                    </div>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-[#888] flex items-center justify-between">
                       Synthesize Visual
                       <ChevronRight className="w-3 h-3" />
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-center text-[#AAA] uppercase italic py-8 border border-dashed border-[#E5E5E3]">No active suggestions</p>
            )}
          </section>
        </div>

        <div className="mt-auto pt-8 border-t border-[#D1D1CF]">
           <div className="bg-[#1A1A1A] p-4 text-white text-[9px] uppercase tracking-tighter">
              AI Core Load: 3.12s / Latency: 45ms <br /> 
              Status: Connected to Synthesis Engine
           </div>
        </div>
      </aside>
    </motion.div>
  );
}

function AssetUploader({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          await addDoc(collection(db, 'projects', projectId, 'assets'), {
            projectId,
            name: file.name,
            url: base64,
            type: file.type,
            createdAt: new Date().toISOString()
          });
        };
        reader.readAsDataURL(file);
      } catch (e) { console.error(e); }
    }
    setUploading(false);
  }, [projectId]);

  // @ts-ignore
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {'image/*': []},
    multiple: true
  });

  return (
    <div {...getRootProps()} className={cn(
      "border-2 border-dashed border-[#D1D1CF] aspect-square flex flex-col items-center justify-center text-center transition-all cursor-pointer p-4 group",
      isDragActive ? "border-black bg-[#F3F2EE]" : "hover:border-black"
    )}>
      <input {...getInputProps()} />
      <Upload className="w-5 h-5 text-[#D1D1CF] group-hover:text-black mb-2 transition-colors" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#888] group-hover:text-black transition-colors">
        {uploading ? "Uploading..." : "+ Add Asset"}
      </p>
    </div>
  );
}

function StudioCanvas({ variation }: { variation: Variation }) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  
  return (
    <div className="relative group perspective-1000">
      <div 
        id="studio-canvas"
        ref={canvasRef}
        className="studio-card shadow-2xl relative overflow-hidden bg-white transform hover:rotate-0 transition-transform duration-500"
        style={{ 
          width: '512px', 
          aspectRatio: '1/1',
          backgroundColor: variation.colors[0],
          transform: 'rotate(-1deg)'
        }}
      >
        {variation.imageUrl && (
          <img src={variation.imageUrl} className="absolute inset-0 w-full h-full object-cover grayscale contrast-125 transition-all duration-700" alt="" />
        )}
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-white">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-6xl font-serif font-black italic leading-[0.85] uppercase">
              {variation.headline.split(' ').map((word, i) => (
                <React.Fragment key={i}>{word}<br/></React.Fragment>
              ))}
            </h1>
          </motion.div>
          
          <div className="flex justify-between items-end">
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.1 }}
              className="text-xs font-bold uppercase tracking-[0.2em] max-w-[200px] leading-relaxed"
            >
              {variation.description}
            </motion.p>
            <div className="w-16 h-16 border border-white/20 rounded-full flex items-center justify-center">
               <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          </div>
        </div>
        
        {/* Editorial accents */}
        <div className="absolute top-0 right-0 w-full h-1 bg-white/20" />
        <div className="absolute bottom-0 left-0 w-1 h-full bg-white/20" />
      </div>
    </div>
  );
}

function ExportMenu({ variation }: { variation: Variation }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'png' | 'jpeg' | 'svg') => {
    const el = document.getElementById('studio-canvas');
    if (!el) return;
    setExporting(true);
    try {
      let dataUrl = '';
      if (format === 'png') dataUrl = await toPng(el);
      if (format === 'jpeg') dataUrl = await toJpeg(el, { quality: 0.95 });
      if (format === 'svg') dataUrl = await toSvg(el);
      
      const link = document.createElement('a');
      link.download = `campaign-${variation.headline.toLowerCase().replace(/\s+/g, '-')}.${format}`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button 
        disabled={exporting}
        onClick={() => handleExport('png')}
        className="btn-primary py-2 px-6 gap-3"
      >
        {exporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3" /> Export .PNG</>}
      </button>
      <div className="flex border border-black p-0.5">
        <button onClick={() => handleExport('jpeg')} className="px-3 py-1.5 hover:bg-black hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest">JPG</button>
        <button onClick={() => handleExport('svg')} className="px-3 py-1.5 hover:bg-black hover:text-white transition-colors text-[9px] font-bold uppercase tracking-widest border-l border-black">SVG</button>
      </div>
    </div>
  );
}
