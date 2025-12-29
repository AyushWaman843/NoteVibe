
import React, { useState, useRef } from 'react';
import { Note, Attachment } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../services/firebase';

interface EditorProps {
  note: Note | null;
  onSave: (note: Partial<Note>) => void;
  onCancel: () => void;
  isAdmin: boolean;
}

export const Editor: React.FC<EditorProps> = ({ note, onSave, onCancel, isAdmin }) => {
  const [title, setTitle] = useState(note?.title || '');
  const [subtitle, setSubtitle] = useState(note?.subtitle || '');
  const [content, setContent] = useState(note?.content || '');
  const [attachments, setAttachments] = useState<Attachment[]>(note?.attachments || []);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB limit

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      alert(`FILE TOO HEAVY! 🛑\n\nThis file is ${(file.size / (1024 * 1024)).toFixed(1)}MB. To keep the Hub fast and save space, we limit direct uploads to 20MB.\n\nPlease upload this to Google Drive or Dropbox and paste the link in the note content instead! ✨`);
      return;
    }

    try {
      setIsUploading(true);
      const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      const newAttachment: Attachment = {
        name: file.name,
        url: url,
        type: file.type || 'application/octet-stream'
      };

      setAttachments([...attachments, newAttachment]);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload file. Check your connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please add a title for this note.");
      return;
    }
    if (!content.trim() && attachments.length === 0) {
      alert("Please add some content or a document to sync.");
      return;
    }

    try {
      await onSave({ title, subtitle, content, attachments });
    } catch (error: any) {
      console.error("Save failed", error);
      alert(`Sync failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl animate-in fade-in duration-500">
      <div className="w-full max-w-5xl h-[85vh] flex flex-col glass-card rounded-[3rem] overflow-hidden border-white/5 shadow-[0_0_100px_rgba(168,85,247,0.1)]">
        <header className="px-12 py-8 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-secondary"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">ZEN EDITOR // {note ? 'UPDATING' : 'INITIALIZING'}</span>
          </div>
          <button onClick={onCancel} className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="flex-1 flex flex-col px-12 py-10 overflow-y-auto custom-scrollbar">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Main Heading..."
            className="bg-transparent text-5xl md:text-6xl font-display font-black text-white border-none focus:ring-0 placeholder:text-white/10 mb-2 tracking-tighter w-full"
          />
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Add a subtitle or short description..."
            className="bg-transparent text-xl font-bold text-accent border-none focus:ring-0 placeholder:text-accent/20 mb-8 uppercase tracking-[0.2em] w-full"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Detailed notes go here..."
            className="flex-1 bg-transparent text-xl md:text-2xl font-medium text-slate-300 leading-relaxed border-none focus:ring-0 placeholder:text-white/5 resize-none min-h-[300px]"
          />

          {attachments.length > 0 && (
            <div className="mt-8 space-y-3">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Attachments</h4>
              <div className="flex flex-wrap gap-4">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl group/file">
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">{file.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-slate-500 hover:text-rose-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="px-12 py-8 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,text/plain"
            />
            {isAdmin && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-black text-[10px] tracking-widest transition-all ${isUploading ? 'bg-white/5 text-slate-500 cursor-not-allowed' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                )}
                {isUploading ? 'UPLOADING...' : 'PIN DOCUMENT'}
              </button>
            )}
          </div>

          <div className="flex gap-6">
            <button onClick={onCancel} className="px-8 py-4 text-xs font-black text-slate-500 hover:text-white transition-colors">DISCARD</button>
            <button
              onClick={handleSave}
              disabled={isUploading}
              className={`px-12 py-4 rounded-2xl font-black text-xs transition-all shadow-xl ${isUploading ? 'bg-white/20 text-black/50 cursor-not-allowed' : 'bg-white text-black hover:scale-105 shadow-white/5'}`}
            >
              {isUploading ? 'WAITING...' : 'SYNC TO HUB'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
