import React, { useState, useMemo, useEffect } from "react";
import {
  type SecretaryNote,
  type NoteColor,
  type NoteAttachment,
  NOTE_COLOR_STYLES,
  INITIAL_SECRETARY_NOTES,
  createDefaultNote,
  filterNotes,
  moveNoteSubject,
  formatNoteForMessenger,
} from "@shared/notes";
import { RichNoteEditor } from "@/components/RichNoteEditor";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { AnnouncementPreview } from "@/components/AnnouncementPreview";
import { AiTextAssist } from "@/components/AiTextAssist";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Image,
  LayoutGrid,
  List,
  Paperclip,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Tag,
  Trash2,
  X,
  Maximize2,
  Share2,
} from "lucide-react";

const STORAGE_KEY = "supersec_secretary_notes";

export interface NotesWorkspaceCardProps {
  initialSubjectId?: string | number;
  embedded?: boolean;
}

export function NotesWorkspaceCard({ initialSubjectId, embedded = false }: NotesWorkspaceCardProps = {}) {
  const subjects = trpc.subjects.list.useQuery();
  const activeSubjects = subjects.data?.filter(s => s.status === "active") ?? [];

  // Manage notes in state & localStorage
  const [notes, setNotes] = useState<SecretaryNote[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_SECRETARY_NOTES;
    } catch {
      return INITIAL_SECRETARY_NOTES;
    }
  });

  const saveNotes = (newNotes: SecretaryNote[]) => {
    setNotes(newNotes);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("supersec_notes_updated", { detail: { notes: newNotes } }));
      }
    } catch {}
  };

  // Cross-component and cross-tab real-time state sync
  useEffect(() => {
    const handleUpdate = (e: Event) => {
      try {
        const customEvt = e as CustomEvent<{ notes: SecretaryNote[] }>;
        if (customEvt.detail?.notes) {
          setNotes(customEvt.detail.notes);
          return;
        }
      } catch {}
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setNotes(JSON.parse(saved));
      } catch {}
    };

    window.addEventListener("supersec_notes_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("supersec_notes_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // View Mode: grid vs list
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Search & Filtering State
  const queryParamSubjectId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("subjectId")
    : null;
  const initialFilter = initialSubjectId ? String(initialSubjectId) : (queryParamSubjectId ? String(queryParamSubjectId) : "all");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(initialFilter);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("all");
  const [onlyPinned, setOnlyPinned] = useState(false);

  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectFilter(String(initialSubjectId));
    } else if (queryParamSubjectId) {
      setSelectedSubjectFilter(String(queryParamSubjectId));
    }
  }, [initialSubjectId, queryParamSubjectId]);

  // Quick Note Composer State
  const [isQuickExpanded, setIsQuickExpanded] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [quickContent, setQuickContent] = useState("");
  const [quickSubjectId, setQuickSubjectId] = useState<string>("general");
  const [quickColor, setQuickColor] = useState<NoteColor>("default");

  // Full Note Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Editor Draft State
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftSubjectId, setDraftSubjectId] = useState<string>("general");
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [draftColor, setDraftColor] = useState<NoteColor>("default");
  const [draftIsPinned, setDraftIsPinned] = useState(false);
  const [draftAttachments, setDraftAttachments] = useState<NoteAttachment[]>([]);

  // Focus Reader Modal State
  const [readingNote, setReadingNote] = useState<SecretaryNote | null>(null);

  // Delete Alert State
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<SecretaryNote | null>(null);

  // Move Note to Subject State
  const [movingNote, setMovingNote] = useState<SecretaryNote | null>(null);

  // Collect all unique tags across notes
  const allUniqueTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => set.add(t)));
    return Array.from(set);
  }, [notes]);

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return filterNotes(notes, {
      searchQuery,
      subjectId: selectedSubjectFilter,
      tag: selectedTagFilter,
      onlyPinned,
    });
  }, [notes, searchQuery, selectedSubjectFilter, selectedTagFilter, onlyPinned]);

  const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter(n => !n.isPinned), [filteredNotes]);

  // Save Quick Note
  const handleSaveQuickNote = () => {
    if (!quickTitle.trim() && !quickContent.trim()) {
      setIsQuickExpanded(false);
      return;
    }

    const title = quickTitle.trim() || "Quick Note";
    const selectedSub = activeSubjects.find(s => String(s.id) === quickSubjectId);
    const now = new Date().toISOString();

    const newNote: SecretaryNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      content: quickContent.trim(),
      subjectId: selectedSub ? selectedSub.id : null,
      subjectCode: selectedSub ? selectedSub.code : "GENERAL",
      subjectName: selectedSub ? selectedSub.name : "General Notes",
      tags: ["QuickNote"],
      color: quickColor,
      isPinned: false,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };

    saveNotes([newNote, ...notes]);
    setQuickTitle("");
    setQuickContent("");
    setQuickColor("default");
    setIsQuickExpanded(false);
    toast.success("Saved quick note!");
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingNoteId(null);
    setDraftTitle("");
    setDraftContent("");
    setDraftSubjectId(activeSubjects.length > 0 ? String(activeSubjects[0].id) : "general");
    setDraftTags([]);
    setTagInput("");
    setDraftColor("default");
    setDraftIsPinned(false);
    setDraftAttachments([]);
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (note: SecretaryNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingNoteId(note.id);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftSubjectId(note.subjectId ? String(note.subjectId) : "general");
    setDraftTags(note.tags);
    setTagInput("");
    setDraftColor(note.color);
    setDraftIsPinned(note.isPinned);
    setDraftAttachments(note.attachments);
    setReadingNote(null);
    setIsEditorOpen(true);
  };

  // Open Focus Reader
  const handleOpenReader = (note: SecretaryNote) => {
    setReadingNote(note);
  };

  // Add Tag
  const handleAddTag = () => {
    const cleaned = tagInput.trim().replace(/^#/, "");
    if (!cleaned) return;
    if (!draftTags.includes(cleaned)) {
      setDraftTags([...draftTags, cleaned]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setDraftTags(draftTags.filter(t => t !== tag));
  };

  // Save Note from Modal
  const handleSaveNote = () => {
    if (!draftTitle.trim()) {
      toast.error("Please enter a note title.");
      return;
    }

    const selectedSub = activeSubjects.find(s => String(s.id) === draftSubjectId);
    const now = new Date().toISOString();

    if (editingNoteId) {
      // Update existing note
      const updated = notes.map(n =>
        n.id === editingNoteId
          ? {
              ...n,
              title: draftTitle.trim(),
              content: draftContent,
              subjectId: selectedSub ? selectedSub.id : null,
              subjectCode: selectedSub ? selectedSub.code : "GENERAL",
              subjectName: selectedSub ? selectedSub.name : "General Notes",
              tags: draftTags,
              color: draftColor,
              isPinned: draftIsPinned,
              attachments: draftAttachments,
              updatedAt: now,
            }
          : n
      );
      saveNotes(updated);
      toast.success("Note saved successfully!");
    } else {
      // Create new note
      const newNote: SecretaryNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: draftTitle.trim(),
        content: draftContent,
        subjectId: selectedSub ? selectedSub.id : null,
        subjectCode: selectedSub ? selectedSub.code : "GENERAL",
        subjectName: selectedSub ? selectedSub.name : "General Notes",
        tags: draftTags,
        color: draftColor,
        isPinned: draftIsPinned,
        attachments: draftAttachments,
        createdAt: now,
        updatedAt: now,
      };
      saveNotes([newNote, ...notes]);
      toast.success("New note created!");
    }

    setIsEditorOpen(false);
  };

  // Move Note to Subject with Optimistic State and Error Rollback
  const handleMoveNote = (target: { id: number | string | null; code?: string; name?: string }) => {
    if (!movingNote) return;
    const prev = notes;
    try {
      const updated = moveNoteSubject(notes, movingNote.id, target);
      saveNotes(updated);
      toast.success(`Moved "${movingNote.title}" to ${target.name || "General"}!`, {
        action: {
          label: "Undo",
          onClick: () => {
            saveNotes(prev);
            toast.success("Move undone.");
          },
        },
      });
      if (readingNote?.id === movingNote.id) {
        setReadingNote(updated.find(n => n.id === movingNote.id) ?? null);
      }
    } catch {
      saveNotes(prev);
      toast.error("Failed to move note.");
    } finally {
      setMovingNote(null);
    }
  };

  // Toggle Pin
  const handleTogglePin = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notes.map(n =>
      n.id === noteId ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
    );
    saveNotes(updated);
    toast.success("Updated pin status.");
  };

  // Request Delete Note
  const handleRequestDelete = (note: SecretaryNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNoteToDelete(note);
    setIsDeleteAlertOpen(true);
  };

  // Confirm Delete with Undo Toast
  const handleConfirmDelete = () => {
    if (!noteToDelete) return;
    const deletedItem = noteToDelete;
    const remaining = notes.filter(n => n.id !== deletedItem.id);
    saveNotes(remaining);

    if (readingNote?.id === deletedItem.id) {
      setReadingNote(null);
    }

    setIsDeleteAlertOpen(false);
    setNoteToDelete(null);

    toast.success(`Deleted note "${deletedItem.title}"`, {
      action: {
        label: "Undo",
        onClick: () => {
          saveNotes([deletedItem, ...remaining]);
          toast.success("Note restored!");
        },
      },
    });
  };

  // Copy Note for Messenger
  const handleCopyNote = async (note: SecretaryNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const formatted = formatNoteForMessenger(note);
    try {
      await navigator.clipboard.writeText(formatted);
      toast.success("Copied note formatted for Messenger!", {
        description: "Ready to paste into your class group chat.",
      });
    } catch {
      toast.error("Failed to copy to clipboard.");
    }
  };

  // Download Note as Markdown
  const handleDownloadNote = (note: SecretaryNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const formatted = formatNoteForMessenger(note);
    const blob = new Blob([formatted], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${note.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded note as Markdown (.md) file.");
  };

  return (
    <section className="signal-panel rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6 shadow-xl shadow-primary/5 space-y-6">
      {/* Top Header */}
      {!embedded ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm font-black text-xs">
                <StickyNote className="size-4" />
              </span>
              <p className="signal-kicker">Secretary Workspace</p>
            </div>
            <h2 className="signal-heading text-lg sm:text-xl font-extrabold tracking-tight mt-1">
              Notes & Study References
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Take rich-text notes, attach reference files & images, organize by subject, and copy formatted notes to Messenger.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={handleOpenCreate}
              className="rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold text-xs sm:text-sm"
            >
              <Plus className="mr-1.5 size-4" /> New Rich Note
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/20 text-primary font-bold text-xs">
              <StickyNote className="size-3.5" />
            </span>
            <span className="text-xs font-bold text-foreground">Subject Notes & Memos</span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="rounded-xl bg-primary text-primary-foreground font-bold text-xs h-8 px-3"
          >
            <Plus className="mr-1 size-3.5" /> New Rich Note
          </Button>
        </div>
      )}

      {/* Quick Note Inline Composer (Google Keep Style) */}
      <div className="rounded-2xl border border-border/80 bg-secondary/40 p-3 sm:p-4 shadow-sm transition-all">
        {!isQuickExpanded ? (
          <div
            onClick={() => setIsQuickExpanded(true)}
            className="flex items-center justify-between gap-3 cursor-pointer py-1 px-2 text-muted-foreground hover:text-foreground"
          >
            <span className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Plus className="size-4 text-primary" /> Take a quick note, lecture reminder, or meeting memo…
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-card/60 border border-border">
                Quick Composer
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              placeholder="Note Title…"
              value={quickTitle}
              onChange={e => setQuickTitle(e.target.value)}
              className="font-bold text-sm bg-card rounded-xl"
              autoFocus
            />
            <WysiwygEditor
              value={quickContent}
              onChange={setQuickContent}
              placeholder="Write your note body with rich WYSIWYG formatting (headings, lists, bold, links)…"
              minHeightClassName="min-h-32"
              aiTarget="student_note"
              aiContext={quickSubjectId !== "general" ? activeSubjects.find(s => String(s.id) === quickSubjectId)?.code : undefined}
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* Subject Picker */}
                <select
                  value={quickSubjectId}
                  onChange={e => setQuickSubjectId(e.target.value)}
                  className="h-8 rounded-lg border border-input bg-card px-2 text-xs font-semibold text-foreground"
                >
                  <option value="general">General Note</option>
                  {activeSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </select>

                {/* Quick Color Picker */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/80">
                  {(["default", "sky", "emerald", "amber", "purple", "rose"] as NoteColor[]).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setQuickColor(c)}
                      className={`size-4 rounded-full border transition-transform ${
                        c === "default"
                          ? "bg-slate-600 border-slate-400"
                          : c === "sky"
                          ? "bg-sky-500 border-sky-300"
                          : c === "emerald"
                          ? "bg-emerald-500 border-emerald-300"
                          : c === "amber"
                          ? "bg-amber-500 border-amber-300"
                          : c === "purple"
                          ? "bg-purple-500 border-purple-300"
                          : "bg-rose-500 border-rose-300"
                      } ${quickColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "opacity-80 hover:opacity-100"}`}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsQuickExpanded(false)}
                  className="rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveQuickNote}
                  className="rounded-lg bg-primary text-primary-foreground font-bold text-xs shadow-xs"
                >
                  Save Quick Note
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter, Search & View Mode Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes, tags, contents…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={e => setSelectedSubjectFilter(e.target.value)}
            className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-xs"
          >
            <option value="all">All Subjects</option>
            <option value="general">General Secretary</option>
            {activeSubjects.map(s => (
              <option key={s.id} value={s.code}>
                {s.code}
              </option>
            ))}
          </select>

          {/* Tag Filter */}
          {allUniqueTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={e => setSelectedTagFilter(e.target.value)}
              className="h-9 rounded-xl border border-input bg-card px-2.5 text-xs font-semibold text-foreground shadow-xs"
            >
              <option value="all">All Tags</option>
              {allUniqueTags.map(t => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          {/* Pinned Filter Pill */}
          <button
            type="button"
            onClick={() => setOnlyPinned(!onlyPinned)}
            className={`inline-flex items-center gap-1.5 h-9 rounded-xl px-3 text-xs font-bold transition-all border ${
              onlyPinned
                ? "bg-primary/15 text-primary border-primary/40 shadow-xs"
                : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <Pin className="size-3" /> Pinned Only
          </button>
        </div>

        {/* Right Side: View Mode Switcher & Counter */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
          <span className="text-xs text-muted-foreground font-medium">
            {filteredNotes.length} note{filteredNotes.length === 1 ? "" : "s"}
          </span>

          <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Compact List View"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Grid View vs List View */}
      {viewMode === "grid" ? (
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Pin className="size-3.5 fill-amber-400" /> Pinned Notes ({pinnedNotes.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotes.map(note => renderNoteCard(note))}
              </div>
            </div>
          )}

          {/* Regular / Other Notes Section */}
          {unpinnedNotes.length > 0 && (
            <div className="space-y-3">
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider pt-2">
                  <StickyNote className="size-3.5" /> Other Notes ({unpinnedNotes.length})
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedNotes.map(note => renderNoteCard(note))}
              </div>
            </div>
          )}

          {filteredNotes.length === 0 && renderEmptyState()}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
            {filteredNotes.map(note => {
              const colorStyle = NOTE_COLOR_STYLES[note.color] || NOTE_COLOR_STYLES.default;
              return (
                <div
                  key={note.id}
                  onClick={() => handleOpenReader(note)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-secondary/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={e => handleTogglePin(note.id, e)}
                      className={`p-1 rounded-lg text-muted-foreground hover:text-foreground shrink-0 ${
                        note.isPinned ? "text-amber-400" : ""
                      }`}
                      title={note.isPinned ? "Unpin note" : "Pin note"}
                    >
                      {note.isPinned ? <Pin className="size-3.5 fill-amber-400" /> : <Pin className="size-3.5" />}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${colorStyle.badge}`}>
                          {note.subjectCode || "NOTE"}
                        </Badge>
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {note.title}
                        </h4>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {note.content || "Empty note."}
                      </p>
                    </div>
                  </div>

                  {/* List Item Actions & Meta */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {note.attachments.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-primary font-semibold">
                          <Paperclip className="size-3" /> {note.attachments.length}
                        </span>
                      )}
                      <span>
                        {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={e => handleCopyNote(note, e)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Copy formatted note for Messenger"
                      >
                        <Copy className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setMovingNote(note);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Move note to another subject"
                      >
                        <ArrowRightLeft className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => handleOpenEdit(note, e)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit note"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={e => handleRequestDelete(note, e)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredNotes.length === 0 && renderEmptyState()}
        </div>
      )}

      {/* Focus Reader Modal */}
      <Dialog open={Boolean(readingNote)} onOpenChange={open => !open && setReadingNote(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6">
          {readingNote && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${NOTE_COLOR_STYLES[readingNote.color]?.badge}`}>
                    {readingNote.subjectCode || "NOTE"}
                  </Badge>
                  {readingNote.isPinned && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Pin className="size-3.5 fill-amber-400" /> Pinned
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadNote(readingNote)}
                    className="rounded-xl text-xs"
                    title="Download as Markdown file"
                  >
                    <Download className="mr-1 size-3.5" /> Download .md
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMovingNote(readingNote)}
                    className="rounded-xl text-xs"
                    title="Move note to another subject"
                  >
                    <ArrowRightLeft className="mr-1 size-3.5" /> Move
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleCopyNote(readingNote)}
                    className="rounded-xl bg-primary text-primary-foreground font-bold text-xs"
                  >
                    <Copy className="mr-1.5 size-3.5" /> Copy for Messenger
                  </Button>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                  {readingNote.title}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Last updated {new Date(readingNote.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>

              {/* Note Content Area */}
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 text-xs sm:text-sm font-sans leading-relaxed text-foreground select-all min-h-[140px] overflow-y-auto">
                {readingNote.content ? (
                  <AnnouncementPreview body={readingNote.content} />
                ) : (
                  <span className="text-muted-foreground italic">Empty note.</span>
                )}
              </div>

              {/* Attached Images Gallery */}
              {readingNote.attachments.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Paperclip className="size-3.5 text-primary" /> Attached Media ({readingNote.attachments.length})
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {readingNote.attachments.map(att => (
                      <div key={att.id} className="rounded-xl border border-border overflow-hidden bg-secondary">
                        {att.type === "image" ? (
                          <a href={att.url} target="_blank" rel="noreferrer" className="block relative group">
                            <img src={att.url} alt={att.name} className="h-28 w-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity">
                              <Maximize2 className="size-4 mr-1" /> View Full
                            </div>
                          </a>
                        ) : (
                          <a href={att.url} target="_blank" rel="noreferrer" className="p-3 flex items-center gap-2 hover:bg-secondary/80 transition-colors">
                            <FileText className="size-5 text-primary shrink-0" />
                            <span className="text-xs font-semibold truncate flex-1">{att.name}</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {readingNote.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-2">
                  {readingNote.tags.map(tag => (
                    <span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <DialogFooter className="flex flex-row items-center justify-between border-t border-border/60 pt-3">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setReadingNote(null);
                    handleRequestDelete(readingNote);
                  }}
                  className="rounded-xl text-xs"
                >
                  <Trash2 className="mr-1 size-3.5" /> Delete Note
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenEdit(readingNote)}
                    className="rounded-xl text-xs font-bold"
                  >
                    <Edit3 className="mr-1 size-3.5" /> Edit Note
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <AlertDialogTitle className="text-base font-bold">Delete Note?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              Are you sure you want to delete <strong className="text-foreground">"{noteToDelete?.title}"</strong>? You can immediately undo this action right after deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs"
            >
              Delete Note
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full Note Editor Modal */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-4">
          <DialogHeader className="pb-1 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight">
                  {editingNoteId ? "Edit Note & References" : "Create New Note"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Format notes with markdown, upload lecture files and formulas, and organize by subject desk.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title & Subject Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-8 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="note-title" className="text-xs font-bold">
                    Note Title *
                  </Label>
                  <AiTextAssist
                    value={draftTitle}
                    onApply={setDraftTitle}
                    target="student_note"
                    context={`Suggest or polish a note title for ${draftSubjectId !== "general" ? activeSubjects.find(s => String(s.id) === draftSubjectId)?.code || "class" : "general class secretary"}.`}
                  />
                </div>
                <Input
                  id="note-title"
                  placeholder="e.g. Chapter 4 Reviewer & Formula Sheet"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value)}
                  className="h-10 rounded-xl text-xs sm:text-sm font-semibold bg-card border-border shadow-xs"
                  autoFocus
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="note-subject" className="text-xs font-bold block">
                  Subject Desk
                </Label>
                <select
                  id="note-subject"
                  value={draftSubjectId}
                  onChange={e => setDraftSubjectId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-card px-3 text-xs sm:text-sm font-semibold text-foreground shadow-xs"
                >
                  <option value="general">General Secretary Desk</option>
                  {activeSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rich Text Editor with Upload Toolbar & AI Assist */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold block">Note Content & Attachments</Label>
              <RichNoteEditor
                content={draftContent}
                onChange={setDraftContent}
                attachments={draftAttachments}
                onAttachmentsChange={setDraftAttachments}
                minHeightClassName="min-h-[220px]"
                subjectContext={
                  draftTitle
                    ? `Title: ${draftTitle} | Subject: ${draftSubjectId !== "general" ? activeSubjects.find(s => String(s.id) === draftSubjectId)?.code || "General" : "General"}`
                    : draftSubjectId !== "general"
                    ? activeSubjects.find(s => String(s.id) === draftSubjectId)?.code
                    : undefined
                }
              />
            </div>

            {/* Note Properties Box: Tags, Color Accents, and Pin */}
            <div className="rounded-2xl border border-border/80 bg-secondary/20 p-3.5 sm:p-4 space-y-3.5">
              {/* Tags Row */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Tags & Topics
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Add tag (e.g. Reviewer, Formulas, Quiz, Project)…"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="h-9 text-xs rounded-xl bg-card border-border"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTag}
                    className="h-9 rounded-xl text-xs font-bold shrink-0 bg-card border-border shadow-xs"
                  >
                    Add Tag
                  </Button>
                </div>

                {draftTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {draftTags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-foreground border border-border shadow-xs"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                          title="Remove tag"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Color Accent & Pin Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
                {/* Color Accent Picker */}
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-muted-foreground">Color:</span>
                  <div className="flex items-center gap-2">
                    {(["default", "sky", "emerald", "amber", "purple", "rose"] as NoteColor[]).map(
                      color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setDraftColor(color)}
                          className={`size-8 sm:size-7 p-0.5 rounded-full inline-flex items-center justify-center transition-all ${
                            draftColor === color ? "scale-110" : "hover:scale-105"
                          }`}
                          title={`Color ${color}`}
                          aria-label={`Select color ${color}`}
                        >
                          <span
                            className={`size-6 rounded-full border-2 transition-all ${
                              color === "default"
                                ? "bg-slate-700 border-slate-500"
                                : color === "sky"
                                ? "bg-sky-500 border-sky-400"
                                : color === "emerald"
                                ? "bg-emerald-500 border-emerald-400"
                                : color === "amber"
                                ? "bg-amber-500 border-amber-400"
                                : color === "purple"
                                ? "bg-purple-500 border-purple-400"
                                : "bg-rose-500 border-rose-400"
                            } ${draftColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"}`}
                          />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Pin Toggle */}
                <div>
                  <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer select-none px-2.5 py-1 rounded-xl bg-card border border-border shadow-xs hover:border-primary/40 transition-colors">
                    <input
                      type="checkbox"
                      checked={draftIsPinned}
                      onChange={e => setDraftIsPinned(e.target.checked)}
                      className="rounded border-input text-primary size-3.5"
                    />
                    <span className="text-foreground">Pin to top of desk</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2 pt-3 border-t border-border/70">
            {editingNoteId ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  const noteToDelete = notes.find(n => n.id === editingNoteId);
                  if (noteToDelete) {
                    setIsEditorOpen(false);
                    handleRequestDelete(noteToDelete);
                  }
                }}
                className="rounded-xl text-xs font-bold"
              >
                <Trash2 className="mr-1 size-3.5" /> Delete Note
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-xl text-xs bg-card border-border shadow-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveNote}
                className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20"
              >
                {editingNoteId ? "Save Changes" : "Create Note"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Note to Subject Dialog */}
      <Dialog open={Boolean(movingNote)} onOpenChange={open => !open && setMovingNote(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ArrowRightLeft className="size-4 text-primary" /> Move Note to Subject
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select which subject desk this note should belong to, or move it to General Notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3 max-h-[60vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => handleMoveNote({ id: null, code: "GENERAL", name: "General Notes" })}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold ${
                !movingNote?.subjectId || movingNote?.subjectCode === "GENERAL"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/80 hover:border-primary/60 hover:bg-secondary/60 text-foreground"
              }`}
            >
              <span>📌 General Notes</span>
              <span className="text-[10px] text-muted-foreground">Global desk</span>
            </button>
            {activeSubjects.map(sub => {
              const isCurrent = String(movingNote?.subjectId) === String(sub.id) || movingNote?.subjectCode === sub.code;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleMoveNote({ id: sub.id, code: sub.code, name: sub.name })}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-xs font-semibold ${
                    isCurrent
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/80 hover:border-primary/60 hover:bg-secondary/60 text-foreground"
                  }`}
                >
                  <span className="truncate">{sub.code} · {sub.name}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-primary shrink-0 ml-2">Current</span>
                  )}
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMovingNote(null)}
              className="rounded-xl text-xs bg-card border-border"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );

  function renderNoteCard(note: SecretaryNote) {
    const colorStyle = NOTE_COLOR_STYLES[note.color] || NOTE_COLOR_STYLES.default;
    const imageAttachments = note.attachments.filter(a => a.type === "image");

    return (
      <div
        key={note.id}
        onClick={() => handleOpenReader(note)}
        className={`group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 cursor-pointer transition-all hover:shadow-lg ${colorStyle.cardBg} ${colorStyle.border}`}
      >
        <div className="space-y-2.5">
          {/* Card Top: Subject Pill, Pin, Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider ${colorStyle.badge}`}>
                {note.subjectCode || "NOTE"}
              </Badge>
              {note.isPinned && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400">
                  <Pin className="size-3 fill-amber-400" /> Pinned
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
              <button
                type="button"
                onClick={e => handleTogglePin(note.id, e)}
                className={`p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary ${
                  note.isPinned ? "text-amber-400" : ""
                }`}
                title={note.isPinned ? "Unpin note" : "Pin note to top"}
              >
                {note.isPinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
              </button>

              <button
                type="button"
                onClick={e => handleCopyNote(note, e)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Copy note text for Messenger"
              >
                <Copy className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setMovingNote(note);
                }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Move note to another subject"
              >
                <ArrowRightLeft className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={e => handleOpenEdit(note, e)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Edit note"
              >
                <Edit3 className="size-3.5" />
              </button>

              <button
                type="button"
                onClick={e => handleRequestDelete(note, e)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete note"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {note.title}
          </h3>

          {/* Content Snippet */}
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {note.content || "Empty note."}
          </p>

          {/* Image Thumbnails Gallery (if any) */}
          {imageAttachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {imageAttachments.slice(0, 3).map(img => (
                <div
                  key={img.id}
                  className="size-12 rounded-lg overflow-hidden border border-border shrink-0 bg-secondary"
                >
                  <img src={img.url} alt={img.name} className="size-full object-cover" />
                </div>
              ))}
              {imageAttachments.length > 3 && (
                <span className="text-[10px] font-bold text-muted-foreground px-1.5 py-1 rounded-md bg-secondary">
                  +{imageAttachments.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Card Footer: Tags & Attachments */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1 min-w-0">
            {note.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground font-semibold">
                +{note.tags.length - 3}
              </span>
            )}
          </div>

          {/* Attachments Count */}
          {note.attachments.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary shrink-0">
              <Paperclip className="size-3" />
              {note.attachments.length}
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderEmptyState() {
    return (
      <div className="signal-panel p-10 text-center rounded-2xl border border-dashed border-border">
        <StickyNote className="size-8 text-primary mx-auto opacity-70" />
        <h3 className="font-bold text-lg mt-3">No notes found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Take your first rich-text note or use the quick note bar above.
        </p>
        <Button
          type="button"
          onClick={handleOpenCreate}
          className="mt-5 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
        >
          <Plus className="mr-1.5 size-4" /> Create First Note
        </Button>
      </div>
    );
  }
}
