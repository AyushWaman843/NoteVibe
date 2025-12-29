
import React, { useState, useEffect, useMemo } from 'react';
import { Note, Subject, ViewState, User } from './types';
import { SubjectCard } from './components/SubjectCard';
import { Editor } from './components/Editor';
import { auth, db, googleProvider, storage } from './services/firebase';
import { ref, deleteObject } from 'firebase/storage';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  serverTimestamp,
  orderBy,
  where,
  setDoc,
  getDocs,
  getDoc
} from 'firebase/firestore';
import { Branch, Semester } from './types';


const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [view, setView] = useState<ViewState>('subjects');
  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branch, setBranch] = useState<Branch>('Computer Science');
  const [semester, setSemester] = useState<Semester>(1);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (!userData.branch || !userData.semester) {
            setNeedsOnboarding(true);
            setUser({ id: fbUser.uid, ...userData } as User);
          } else {
            setNeedsOnboarding(false);
            setUser({ id: fbUser.uid, ...userData } as User);
          }
        } else {
          // New user (Google login case usually)
          setNeedsOnboarding(true);
          setUser({
            id: fbUser.uid,
            username: fbUser.displayName || 'Scholar',
            email: fbUser.email || '',
            role: 'student',
            semester: 1, // temporary defaults
            branch: 'Computer Science'
          });
        }
      } else {
        setUser(null);
        setNeedsOnboarding(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const subjectsQuery = query(
      collection(db, 'subjects'),
      where('branch', '==', user.branch),
      where('semester', '==', user.semester)
    );
    const unsubscribeSubjects = onSnapshot(subjectsQuery, (snapshot) => {
      const subs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
      setSubjects(subs);
    });

    const notesQuery = query(
      collection(db, 'notes'),
      where('branch', '==', user.branch),
      where('semester', '==', user.semester)
    );
    const unsubscribeNotes = onSnapshot(notesQuery, (snapshot) => {
      const allNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Note));

      // Filter logic: Show if note is yours OR if it's from an admin in your sector
      const accessibleNotes = allNotes.filter(n =>
        n.userId === user.id || n.createdByRole === 'admin'
      );

      // Sort client-side to avoid index requirement
      const sortedNotes = accessibleNotes.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotes(sortedNotes);
    });

    return () => {
      unsubscribeSubjects();
      unsubscribeNotes();
    };
  }, [user]);


  const [sectorAdmin, setSectorAdmin] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch all admins and filter client-side to avoid composite index requirement
    const adminQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin')
    );

    const unsubscribeAdmin = onSnapshot(adminQuery, (snapshot) => {
      // Filter to find admin matching user's branch and semester
      const matchingAdmin = snapshot.docs.find(doc => {
        const data = doc.data();
        return data.branch === user.branch && data.semester === user.semester;
      });

      if (matchingAdmin) {
        setSectorAdmin({ id: matchingAdmin.id, ...matchingAdmin.data() } as User);
      } else {
        setSectorAdmin(null);
      }
    }, (error) => {
      console.error("Error fetching admin:", error);
      setSectorAdmin(null);
    });

    return () => unsubscribeAdmin();
  }, [user]);


  const filteredNotes = useMemo(() => notes.filter((n: Note) => n.subjectId === activeSubjectId), [notes, activeSubjectId]);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const userRef = doc(db, 'users', result.user.uid);
      const userSnap = await getDoc(userRef);

      // If this is a first-time Google login, create the profile WITHOUT branch/sem to trigger onboarding
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          username: result.user.displayName || 'Google Scholar',
          email: result.user.email,
          role: 'student',
          createdAt: new Date().toISOString()
        });
        setNeedsOnboarding(true);
      }
    } catch (error: any) {
      console.error("Google Login failed", error);
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        // Create user profile - ALWAYS DEFAULT TO STUDENT
        await setDoc(doc(db, 'users', credential.user.uid), {
          username: username || email.split('@')[0],
          email,
          phoneNumber: phoneNumber || '',
          branch,
          semester,
          role: 'student',
          createdAt: new Date().toISOString()
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Email Auth failed", error);
      setAuthError(error.message);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setResetSuccess(false);
    if (!email) {
      setAuthError("PLEASE ENTER YOUR EMAIL FIRST.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSuccess(true);
    } catch (error: any) {
      console.error("Password reset failed", error);
      setAuthError(error.message);
    }
  };

  const handleSignOut = () => signOut(auth);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newPhone, setNewPhone] = useState(user?.phoneNumber || '');
  const [newBranch, setNewBranch] = useState<Branch>(user?.branch || 'Computer Science');
  const [newSemester, setNewSemester] = useState<Semester>(user?.semester || 1);

  const handleUpdateProfile = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        phoneNumber: newPhone,
        branch: newBranch,
        semester: newSemester
      });
      setUser({ ...user, phoneNumber: newPhone, branch: newBranch, semester: newSemester });
      setIsProfileModalOpen(false);
      alert("Profile updated!");
    } catch (error) {
      console.error("Failed to update profile", error);
      alert("Update failed.");
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), {
        branch,
        semester,
        phoneNumber: phoneNumber || '',
        lastUpdated: new Date().toISOString()
      });
      setUser({ ...user, branch, semester, phoneNumber: phoneNumber || '' });
      setNeedsOnboarding(false);
    } catch (error) {
      console.error("Onboarding failed", error);
      alert("Failed to save profile.");
    }
  };


  const handleDeleteNote = async (noteId: string) => {
    const noteToDelete = notes.find(n => n.id === noteId);
    if (!noteToDelete) return;

    if (confirm("Delete this note and its attached files permanently?")) {
      try {
        // 1. Delete associated files from Storage
        if (noteToDelete.attachments && noteToDelete.attachments.length > 0) {
          const deletePromises = noteToDelete.attachments.map(file => {
            const fileRef = ref(storage, file.url);
            return deleteObject(fileRef).catch(err => {
              console.warn("Storage deletion failed for file:", file.name, err);
            });
          });
          await Promise.all(deletePromises);
        }

        // 2. Delete document from Firestore
        await deleteDoc(doc(db, 'notes', noteId));
      } catch (error) {
        console.error("Failed to delete note", error);
        alert("Delete failed.");
      }
    }
  };


  const addSubject = async () => {
    if (!user || user.role !== 'admin') return;
    const name = prompt("Subject Name?");
    if (!name) return;
    try {
      await addDoc(collection(db, 'subjects'), {
        name,
        description: 'Newly spawned knowledge hub for your brain.',
        icon: '✨',
        color: '#22d3ee',
        branch: user.branch,
        semester: user.semester,
        createdBy: user.id
      });
    } catch (error) {
      console.error("Failed to add subject", error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="max-w-xl w-full relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-accent via-secondary to-neon rounded-[3rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative glass-card p-12 md:p-16 rounded-[3rem] text-center">
            <h1 className="text-7xl font-display font-black text-white mb-4 tracking-tighter leading-none">
              NOTE<span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-secondary italic">VIBE</span>
            </h1>
            <p className="text-slate-400 text-lg mb-12 font-medium">Immaculate Study Aesthetics.</p>

            <div className="space-y-6">
              <form onSubmit={isResetMode ? handlePasswordReset : handleEmailAuth} className="space-y-4">
                {isResetMode ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed mb-4">
                      Enter your email to receive a secure recovery link.
                    </p>
                    <input
                      type="email"
                      placeholder="EMAIL@CAMPUS.COM"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:border-accent/50 outline-none transition-all font-bold text-sm"
                      required
                    />
                    {resetSuccess && (
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-relaxed">
                        RECOVERY LINK SENT! CHECK YOUR INBOX.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {isSignUp && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <input
                          type="text"
                          placeholder="FULL NAME"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:border-accent/50 outline-none transition-all font-bold text-sm"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="WHATSAPP PHONE NUMBER"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:border-accent/50 outline-none transition-all font-bold text-sm"
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value as Branch)}
                            className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none transition-all font-bold text-sm appearance-none cursor-pointer [&>option]:bg-slate-900"
                          >
                            <option value="Computer Science">COMP SCI</option>
                            <option value="Data Science">DATA SCI</option>
                            <option value="IT">IT</option>
                            <option value="Mechatronics">MECH</option>
                          </select>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(Number(e.target.value) as Semester)}
                            className="px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none transition-all font-bold text-sm appearance-none cursor-pointer [&>option]:bg-slate-900"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s} className="bg-slate-900">SEM {s}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                    <input
                      type="email"
                      placeholder="EMAIL@CAMPUS.COM"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:border-accent/50 outline-none transition-all font-bold text-sm"
                      required
                    />
                    <input
                      type="password"
                      placeholder="PASSWORD"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-600 focus:border-accent/50 outline-none transition-all font-bold text-sm"
                      required={!isResetMode}
                    />
                  </>
                )}

                {authError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-relaxed">{authError}</p>}

                <button type="submit" className="w-full py-5 bg-white text-black rounded-[1.5rem] font-black text-sm tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.1)]">
                  {isResetMode ? 'SEND RECOVERY LINK' : isSignUp ? `INITIALIZE ACCOUNT` : 'SECURE ACCESS'}
                </button>
              </form>

              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-white/5"></div>
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.3em]">OR VIBE WITH</span>
                <div className="h-px flex-1 bg-white/5"></div>
              </div>

              <button onClick={handleGoogleLogin} className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-[1.5rem] font-black text-sm tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" /><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" /><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" /><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" /></svg>
                CONTINUE WITH GOOGLE
              </button>

              <button onClick={() => { setIsSignUp(!isSignUp); setIsResetMode(false); setAuthError(null); }} className="w-full text-center text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]">
                {isSignUp ? 'Already on the grid? Sign In' : "New to NoteVibe? Initialize Account"}
              </button>

              {!isSignUp && (
                <button onClick={() => { setIsResetMode(!isResetMode); setAuthError(null); }} className="w-full text-center text-[9px] font-black text-slate-700 hover:text-accent transition-colors uppercase tracking-[0.2em] mt-2">
                  {isResetMode ? 'Wait, I remember it! Go Back' : 'Locked Out? Reset Password'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-black relative overflow-hidden">
        {/* Aesthetic Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-accent/20 blur-[120px] rounded-full animate-pulse"></div>
          <div className="absolute bottom-[10%] right-[10%] w-96 h-96 bg-secondary/20 blur-[120px] rounded-full animate-pulse delay-700"></div>
        </div>

        <div className="max-w-xl w-full relative z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="glass-card p-12 md:p-16 rounded-[3rem] border-white/10 shadow-[0_0_80px_rgba(168,85,247,0.1)]">
            <div className="mb-10 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-accent to-secondary rounded-3xl flex items-center justify-center text-white text-3xl font-black mx-auto mb-6 shadow-2xl shadow-accent/20">NV</div>
              <h2 className="text-4xl font-display font-black text-white tracking-tighter uppercase mb-2">Sync Your Frequency</h2>
              <p className="text-slate-500 font-bold tracking-widest text-[10px] uppercase">Almost there, scholar. Pick your sector.</p>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-accent uppercase tracking-widest block ml-2">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white placeholder:text-slate-600 outline-none focus:border-accent/40 transition-all font-bold text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-accent uppercase tracking-widest block ml-2">Academic Branch</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value as Branch)}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white outline-none focus:border-accent/40 transition-all font-bold text-sm appearance-none cursor-pointer [&>option]:bg-slate-900"
                  >
                    <option value="Computer Science">COMP SCI</option>
                    <option value="Data Science">DATA SCI</option>
                    <option value="IT">IT</option>
                    <option value="Mechatronics">MECH</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-accent uppercase tracking-widest block ml-2">Current Semester</label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(Number(e.target.value) as Semester)}
                    className="w-full px-8 py-5 bg-white/5 border border-white/10 rounded-[1.5rem] text-white outline-none focus:border-accent/40 transition-all font-bold text-sm appearance-none cursor-pointer [&>option]:bg-slate-900"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s} className="bg-slate-900">SEM {s}</option>)}
                  </select>
                </div>
              </div>


              <button
                onClick={handleCompleteOnboarding}
                className="w-full py-6 bg-white text-black rounded-[2rem] font-black text-sm tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-white/5"
              >
                INITIALIZE HUB ACCESS
              </button>

              <button
                onClick={handleSignOut}
                className="w-full text-center text-[10px] font-black text-slate-700 hover:text-rose-500 transition-colors uppercase tracking-widest"
              >
                Wrong account? Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-300 selection:bg-accent/30 selection:text-white pb-20">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-center">
        <div className="glass-card px-8 py-3 rounded-full flex items-center gap-8 shadow-2xl">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { setView('subjects'); setActiveSubjectId(null); }}>
            <div className="w-8 h-8 bg-gradient-to-br from-accent to-secondary rounded-xl flex items-center justify-center text-white text-sm font-black group-hover:rotate-12 transition-transform">NV</div>
            <span className="text-xl font-display font-black text-white tracking-tighter">NoteVibe</span>
          </div>
          <div className="w-px h-6 bg-white/10"></div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">{user.username}</span>
              <span className="text-[8px] font-black text-accent uppercase tracking-widest">{user.branch} | SEM {user.semester}</span>
            </div>
            <button
              onClick={() => {
                setNewPhone(user.phoneNumber || '');
                setNewBranch(user.branch);
                setNewSemester(user.semester);
                setIsProfileModalOpen(true);
              }}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-accent hover:border-accent/50 transition-all group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
            </button>
            <button onClick={handleSignOut} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-secondary hover:border-secondary/50 transition-all group">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-32">
        {view === 'subjects' ? (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">

            {/* COMPACT Vibe Header */}
            <div className="glass-card mb-10 p-8 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group border-white/10">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 blur-[80px] -mr-40 -mt-40 pointer-events-none"></div>
              <div className="relative z-10 flex-1">
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-3">Academic Vault</div>
                <h2 className="text-3xl md:text-5xl font-display font-black text-white leading-tight tracking-tighter uppercase">
                  Subject Repository
                </h2>
              </div>
              {user.role === 'admin' && (
                <button onClick={addSubject} className="relative z-10 px-8 py-4 bg-white text-black rounded-2xl font-black text-[11px] tracking-widest hover:scale-105 transition-all shadow-xl flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  NEW SUBJECT
                </button>
              )}
            </div>

            {/* UNIFORM Subject Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch auto-rows-fr">
              {subjects.map((s) => (
                <div key={s.id} className="h-full">
                  <SubjectCard
                    subject={s}
                    isAdmin={user.role === 'admin'}
                    noteCount={notes.filter(n => n.subjectId === s.id).length}
                    onClick={(id) => { setActiveSubjectId(id); setView('notes'); }}
                    onDelete={async (id) => {
                      if (confirm("Delete this subject and ALL associated files permanently?")) {
                        await deleteDoc(doc(db, 'subjects', id));
                        const q = query(collection(db, 'notes'), where('subjectId', '==', id));
                        const snap = await getDocs(q);

                        // Storage Cleanup for all notes in this subject
                        const allDeletePromises: Promise<any>[] = [];
                        snap.forEach(d => {
                          const noteData = d.data() as Note;
                          if (noteData.attachments && noteData.attachments.length > 0) {
                            noteData.attachments.forEach(file => {
                              allDeletePromises.push(
                                deleteObject(ref(storage, file.url)).catch(e => console.warn(e))
                              );
                            });
                          }
                          allDeletePromises.push(deleteDoc(d.ref));
                        });
                        await Promise.all(allDeletePromises);
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-right-8 duration-700">
            <div className="flex items-center gap-6 mb-12">
              <button onClick={() => { setView('subjects'); setActiveSubjectId(null); }} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 shadow-lg">
                <svg className="text-slate-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <div className="flex-1">
                <h2 className="text-4xl font-display font-black text-white tracking-tighter uppercase leading-none mb-1">
                  {subjects.find(s => s.id === activeSubjectId)?.name}
                </h2>
                <p className="text-accent font-black uppercase text-[9px] tracking-[0.4em]">Vault Access Restricted</p>
              </div>
              {user.role === 'admin' && (
                <button onClick={() => { setActiveNote(null); setIsEditorOpen(true); }} className="px-8 py-4 bg-accent text-white rounded-2xl font-black text-[11px] tracking-widest hover:scale-105 transition-all shadow-lg flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  ADD NOTE
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch auto-rows-fr">
              {filteredNotes.length === 0 ? (
                <div className="col-span-full py-24 text-center glass-card rounded-[3rem] border-dashed border-white/10 flex flex-col items-center">
                  <div className="text-6xl mb-6">📁</div>
                  <h3 className="text-2xl font-display font-black text-white mb-2 uppercase">Empty Hub</h3>
                  <p className="text-slate-500 font-bold tracking-[0.2em] text-[10px] uppercase">No notes detected in this sector.</p>
                </div>
              ) : filteredNotes.map(note => (
                <div key={note.id} className="glass-card p-10 rounded-[2.5rem] group relative overflow-hidden transition-all hover:border-accent/40 shadow-xl flex flex-col h-full card-hover-effect">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex-1">
                      <h3 className="text-3xl font-display font-black text-white leading-tight group-hover:text-accent transition-colors tracking-tight mb-2">{note.title}</h3>
                      {note.subtitle && <p className="text-[10px] font-black text-accent uppercase tracking-[0.2em] mb-4">{note.subtitle}</p>}
                    </div>
                    <div className="flex gap-2">
                      {note.createdByRole === 'admin' && (
                        <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[8px] font-black text-white tracking-widest flex items-center gap-1.5 h-fit">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse"></div>
                          HUB RES
                        </div>
                      )}
                      {(user.role === 'admin' || note.userId === user.id) && (
                        <div className="flex gap-2">
                          <button onClick={() => { setActiveNote(note); setIsEditorOpen(true); }} className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-500 rounded-xl hover:text-white transition-all border border-white/5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteNote(note.id)} className="w-10 h-10 flex items-center justify-center bg-white/5 text-slate-500 rounded-xl hover:text-rose-500 hover:bg-rose-500/10 transition-all border border-white/5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-400 font-medium text-lg leading-relaxed mb-8 line-clamp-3 group-hover:text-slate-200 transition-colors flex-1">{note.content}</p>


                  {note.attachments && note.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8 relative z-10">
                      {note.attachments.map((file, i) => (
                        <a
                          key={i}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white hover:border-accent/40 transition-all uppercase tracking-widest"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                          {file.name.split('.').slice(0, -1).join('.').slice(0, 15)}...
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="pt-8 border-t border-white/5 flex items-center justify-between relative z-10 text-[10px] font-black uppercase tracking-widest text-slate-600">
                    <span>Entry #{note.id.slice(-4)}</span>
                    <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isEditorOpen && (
        <Editor
          note={activeNote}
          isAdmin={user.role === 'admin'}
          onSave={async (data) => {
            if (!user) return;
            try {
              if (activeNote) {
                await updateDoc(doc(db, 'notes', activeNote.id), {
                  ...data,
                  lastEdited: new Date().toISOString()
                });
              } else {
                await addDoc(collection(db, 'notes'), {
                  subjectId: activeSubjectId!,
                  title: data.title!,
                  subtitle: data.subtitle || '',
                  content: data.content || '',
                  attachments: data.attachments || [],
                  userId: user.id,
                  createdByRole: user.role,
                  branch: user.branch,
                  semester: user.semester,
                  createdAt: new Date().toISOString(),
                  lastEdited: new Date().toISOString()
                });
              }
              setIsEditorOpen(false);
            } catch (error) {
              console.error("Firebase save error:", error);
              throw error; // Rethrow so Editor can show alert
            }
          }}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}


      <footer className="pt-20 text-center">
        <div className="flex items-center justify-center gap-4 opacity-10 mb-6 group hover:opacity-20 transition-all">
          <div className="w-12 h-px bg-white"></div>
          <span className="font-display font-black text-xl tracking-[0.4em] uppercase">NoteVibe</span>
          <div className="w-12 h-px bg-white"></div>
        </div>
        <p className="text-[9px] font-black text-slate-800 tracking-[0.6em] uppercase select-none">
          DESIGNED & IMPLEMENTED BY AYUSH WAMAN
        </p>
      </footer>

      {/* Floating WhatsApp Contact */}
      {user.role === 'student' && sectorAdmin && sectorAdmin.phoneNumber && (
        <a
          href={`https://wa.me/${sectorAdmin.phoneNumber.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-8 left-8 z-[60] flex items-center gap-4 group"
        >
          <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center shadow-[0_20px_40px_rgba(37,211,102,0.3)] hover:scale-110 active:scale-95 transition-all text-white relative">
            <div className="absolute inset-0 bg-white/20 rounded-2xl animate-ping opacity-20 group-hover:block hidden"></div>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.763.459 3.42 1.258 4.864L2 22l5.341-1.402a9.907 9.907 0 0 0 4.69 1.171c5.516 0 9.969-4.453 9.969-9.969 0-5.516-4.453-9.969-9.969-9.969zm5.558 14.155c-.229.645-1.354 1.182-1.854 1.259-.45.068-.99.11-2.924-.652-2.479-.974-4.07-3.483-4.195-3.648-.124-.165-1.012-1.343-1.012-2.562 0-1.219.644-1.819.869-2.067.226-.25.494-.312.661-.312.165 0 .331.001.475.007.149.006.347-.057.545.412.201.477.684 1.666.744 1.789.06.124.1.268.016.433-.082.163-.125.263-.244.407-.123.14-.258.312-.369.42-.123.118-.252.247-.108.494.143.247.638 1.054 1.369 1.704.942.84 1.737 1.1 1.984 1.226.247.124.391.103.536-.062.145-.165.617-.722.784-.969.165-.246.331-.206.556-.124.225.083 1.428.675 1.675.799.248.124.413.186.474.288.061.103.061.598-.168 1.243z" />
            </svg>
          </div>
          <div className="glass-card px-6 py-3 rounded-2xl opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all pointer-events-none">
            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none block mb-1">Contact Admin</span>
            <span className="text-[8px] font-black text-accent uppercase tracking-[0.2em]">{sectorAdmin.username}</span>
          </div>
        </a>
      )}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="max-w-md w-full glass-card p-10 rounded-[2.5rem] border-white/10 shadow-[0_0_80px_rgba(168,85,247,0.1)]">
            <h3 className="text-3xl font-display font-black text-white mb-2 tracking-tighter uppercase">Vibe Settings</h3>
            <p className="text-slate-500 font-bold text-[10px] tracking-widest uppercase mb-8">Update your contact frequency</p>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-accent uppercase tracking-widest block ml-2">WhatsApp Hub Number</label>
                <input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-700 focus:border-accent/50 outline-none transition-all font-bold text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-accent uppercase tracking-widest block ml-2">Academic Branch</label>
                <select
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value as Branch)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-accent/50 transition-all font-bold text-sm appearance-none cursor-pointer [&>option]:bg-slate-900"
                >
                  <option value="Computer Science">COMP SCI</option>
                  <option value="Data Science">DATA SCI</option>
                  <option value="IT">IT</option>
                  <option value="Mechatronics">MECH</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-accent uppercase tracking-widest block ml-2">Current Semester</label>
                <select
                  value={newSemester}
                  onChange={(e) => setNewSemester(Number(e.target.value) as Semester)}
                  className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-accent/50 transition-all font-bold text-sm appearance-none cursor-pointer [&>option]:bg-slate-900"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s} className="bg-slate-900">SEM {s}</option>)}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 bg-white/5 text-slate-500 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:text-white transition-all uppercase">Cancel</button>
                <button onClick={handleUpdateProfile} className="flex-1 py-4 bg-white text-black rounded-2xl font-black text-[10px] tracking-[0.2em] hover:scale-105 transition-all uppercase shadow-xl shadow-white/5">Update Hub</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
