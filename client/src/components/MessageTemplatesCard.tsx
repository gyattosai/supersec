import { useState, useMemo, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_PRESET_TEMPLATES,
  type MessageTemplate,
} from "@shared/messageTemplates";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AiTextAssist } from "@/components/AiTextAssist";
import { toast } from "sonner";
import {
  Check,
  Copy,
  ExternalLink,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Edit3,
  Send,
  CopyCheck,
  Eye,
  ShieldAlert,
  LayoutGrid,
  List,
  Bold,
  Italic,
  Code,
  Strikethrough,
  ListOrdered,
  Minus,
  Quote,
  Smile,
  Sparkles,
  Variable,
} from "lucide-react";

const STORAGE_KEY = "supersec_custom_message_templates";
const HIDDEN_PRESETS_KEY = "supersec_hidden_preset_templates";

const QUICK_REACTION_EMOJIS = ["👍", "❤️", "📢", "⚠️", "✅", "📌", "👉", "📝", "🔥", "🎉", "🙏", "💯"];

const EMOJI_CATEGORIES: Record<string, { icon: string; emojis: string[] }> = {
  Reactions: {
    icon: "👍",
    emojis: ["👍", "❤️", "😂", "😮", "😢", "😡", "🔥", "👏", "🙌", "🙏", "💯", "🫡", "👋", "🤩", "🎉", "🥳", "✨", "🤝"],
  },
  Alerts: {
    icon: "📢",
    emojis: ["📢", "🚨", "⚠️", "🔔", "📣", "📌", "📍", "⚡", "‼️", "ℹ️", "🔊", "🛑", "💡", "🏷️", "❗", "❓"],
  },
  Academic: {
    icon: "📚",
    emojis: ["📚", "📖", "📝", "📋", "📂", "📁", "🎓", "✍️", "📄", "🖊️", "📊", "💻", "🖥️", "🎒", "🏫", "✏️", "📐"],
  },
  Attendance: {
    icon: "✅",
    emojis: ["✅", "❌", "⏳", "⏰", "🗓️", "📅", "🕒", "⌛", "🎯", "⏱️", "🌅", "🌙", "🌤️", "💤"],
  },
  Communication: {
    icon: "💬",
    emojis: ["👉", "🔗", "🌐", "💬", "📲", "📱", "✉️", "📩", "📨", "🚀", "🔒", "👥", "🧑‍🏫", "👩‍🎓", "👤"],
  },
};

const QUICK_GREETINGS = [
  "Hello class!",
  "Good morning everyone!",
  "Good afternoon everyone!",
  "Urgent Reminder:",
];

const QUICK_CLOSINGS = [
  "Please react with 👍 once read. Thank you!",
  "Please check the portal link above for complete details.",
  "Please submit your attendance proof before cutoff.",
  "Thank you and stay safe!",
];

const DYNAMIC_VARIABLES = [
  { label: "Subject Name", value: "{Subject Name}" },
  { label: "Subject Code", value: "{Subject Code}" },
  { label: "Portal Link", value: "{Portal Link}" },
  { label: "Session Date", value: "{Session Date}" },
  { label: "Present Count", value: "{Present Count}" },
  { label: "Time", value: "{Time}" },
  { label: "Professor", value: "{Professor}" },
];

export interface MessageTemplatesCardProps {
  initialSubjectId?: string | number;
  embedded?: boolean;
}

export function MessageTemplatesCard({ initialSubjectId, embedded = false }: MessageTemplatesCardProps = {}) {
  const subjectsQuery = trpc.subjects.list.useQuery();
  const subjects = subjectsQuery.data ?? [];

  const queryParamSubjectId = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("subjectId")
    : null;
  const initialSubId = initialSubjectId ? String(initialSubjectId) : (queryParamSubjectId ? String(queryParamSubjectId) : "");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubId);

  useEffect(() => {
    if (initialSubjectId) {
      setSelectedSubjectId(String(initialSubjectId));
    } else if (queryParamSubjectId) {
      setSelectedSubjectId(String(queryParamSubjectId));
    }
  }, [initialSubjectId, queryParamSubjectId]);

  const currentSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find(s => String(s.id) === selectedSubjectId || s.publicId === selectedSubjectId || s.code === selectedSubjectId) ?? null;
  }, [subjects, selectedSubjectId]);

  // Manage custom templates in localStorage
  const [customTemplates, setCustomTemplates] = useState<MessageTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Manage hidden preset IDs in localStorage
  const [hiddenPresetIds, setHiddenPresetIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HIDDEN_PRESETS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCustomTemplates = (templates: MessageTemplate[]) => {
    setCustomTemplates(templates);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
    } catch {}
  };

  const saveHiddenPresets = (ids: string[]) => {
    setHiddenPresetIds(ids);
    try {
      localStorage.setItem(HIDDEN_PRESETS_KEY, JSON.stringify(ids));
    } catch {}
  };

  // Combine visible presets and custom templates
  const allTemplates = useMemo(() => {
    const visiblePresets = DEFAULT_PRESET_TEMPLATES.filter(p => !hiddenPresetIds.includes(p.id));
    return [...visiblePresets, ...customTemplates];
  }, [customTemplates, hiddenPresetIds]);

  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Editor Modal State
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>("Alerts");

  // Delete Alert State
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [snippetToDelete, setSnippetToDelete] = useState<MessageTemplate | null>(null);

  // Reset Presets Alert State
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter(t => {
      const matchesSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.template.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [allTemplates, searchQuery]);

  const interpolateSnippet = (template: string) => {
    if (!template) return "";
    let res = template;
    if (currentSubject) {
      res = res
        .replace(/\{Subject Name\}/gi, currentSubject.name || "Subject")
        .replace(/\{Subject Code\}/gi, currentSubject.code || "SUBJ")
        .replace(/\{Professor\}/gi, currentSubject.professorName || "Professor")
        .replace(/\{Portal Link\}/gi, currentSubject.publicId ? `${window.location.origin}/s/${currentSubject.publicId}` : `${window.location.origin}`);
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    res = res
      .replace(/\{Session Date\}/gi, dateStr)
      .replace(/\{Time\}/gi, timeStr);
    return res;
  };

  // Copy to clipboard with visual feedback per snippet
  const handleCopySnippet = async (t: MessageTemplate) => {
    if (!t.template) return;
    try {
      const textToCopy = interpolateSnippet(t.template);
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(t.id);
      toast.success(`Copied "${t.title}" for Messenger!`, {
        description: currentSubject
          ? `Variables interpolated for ${currentSubject.code}. Ready to paste!`
          : "Ready to paste directly into your class group chat.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard. Please copy manually.");
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setDraftTitle("");
    setDraftDescription("");
    setDraftContent(`📢 CLASS ANNOUNCEMENT\n\nHello class! [Write announcement message here]\n\n👉 https://supersec.mjbalubar.tech\n\nPlease acknowledge once read. Thank you!`);
    setEditorTab("write");
    setIsEditorOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setDraftTitle(t.title);
    setDraftDescription(t.description || "");
    setDraftContent(t.template);
    setEditorTab("write");
    setIsEditorOpen(true);
  };

  // Duplicate as custom template
  const handleDuplicate = (t: MessageTemplate) => {
    const duplicated: MessageTemplate = {
      id: `custom-${Date.now()}`,
      title: `${t.title} (Custom Copy)`,
      category: "custom",
      description: t.description ? `Customized from: ${t.description}` : "Custom message snippet",
      template: t.template,
    };
    saveCustomTemplates([...customTemplates, duplicated]);
    toast.success("Snippet duplicated as custom template!", {
      description: "You can now edit and customize this message freely.",
    });
  };

  // Trigger Delete Confirmation
  const handleRequestDelete = (t: MessageTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSnippetToDelete(t);
    setIsDeleteAlertOpen(true);
  };

  // Confirm Delete Snippet
  const handleConfirmDelete = () => {
    if (!snippetToDelete) return;

    if (!snippetToDelete.isPreset) {
      // Delete custom template permanently
      const updated = customTemplates.filter(t => t.id !== snippetToDelete.id);
      saveCustomTemplates(updated);
      toast.success(`Deleted snippet "${snippetToDelete.title}".`);
    } else {
      // Hide preset template
      const updated = [...hiddenPresetIds, snippetToDelete.id];
      saveHiddenPresets(updated);
      toast.success(`Hidden preset "${snippetToDelete.title}".`, {
        description: "You can restore default presets anytime via the restore action.",
      });
    }

    setIsDeleteAlertOpen(false);
    setSnippetToDelete(null);
  };

  // Reset to Factory Presets
  const handleResetPresets = () => {
    saveHiddenPresets([]);
    toast.success("Default preset snippets restored!");
    setIsResetAlertOpen(false);
  };

  // Save Template from Editor
  const handleSaveTemplate = () => {
    if (!draftTitle.trim() || !draftContent.trim()) {
      toast.error("Please fill in both a title and message body.");
      return;
    }

    if (editingTemplate) {
      // Update existing custom template
      const updated = customTemplates.map(t =>
        t.id === editingTemplate.id
          ? {
              ...t,
              title: draftTitle.trim(),
              description: draftDescription.trim(),
              template: draftContent.trim(),
            }
          : t
      );
      saveCustomTemplates(updated);
      toast.success("Updated snippet!");
    } else {
      // Add new custom template
      const newTemplate: MessageTemplate = {
        id: `custom-${Date.now()}`,
        title: draftTitle.trim(),
        category: "custom",
        description: draftDescription.trim(),
        template: draftContent.trim(),
      };
      saveCustomTemplates([...customTemplates, newTemplate]);
      toast.success("Created new snippet!");
    }

    setIsEditorOpen(false);
  };

  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraftContent(prev => `${prev} ${textToInsert}`);
      return;
    }
    const start = textarea.selectionStart ?? draftContent.length;
    const end = textarea.selectionEnd ?? draftContent.length;
    const before = draftContent.substring(0, start);
    const after = draftContent.substring(end);
    const nextContent = before + textToInsert + after;
    setDraftContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      const nextCursor = start + textToInsert.length;
      textarea.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

  const wrapSelection = (prefix: string, suffix: string = prefix, defaultPlaceholder: string = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setDraftContent(prev => `${prev}${prefix}${defaultPlaceholder}${suffix}`);
      return;
    }
    const start = textarea.selectionStart ?? draftContent.length;
    const end = textarea.selectionEnd ?? draftContent.length;
    const selected = draftContent.substring(start, end) || defaultPlaceholder;
    const before = draftContent.substring(0, start);
    const after = draftContent.substring(end);
    const replacement = `${prefix}${selected}${suffix}`;
    setDraftContent(before + replacement + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 0);
  };

  const handleInsertEmoji = (emoji: string) => {
    insertTextAtCursor(` ${emoji} `);
  };

  return (
    <section className="signal-panel rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6 shadow-xl shadow-primary/5 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm font-black text-xs">
              <MessageSquare className="size-4" />
            </span>
            <p className="signal-kicker">Secretary Toolkit</p>
          </div>
          <h2 className="signal-heading text-lg sm:text-xl font-extrabold tracking-tight mt-1">
            Snippets
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Quickly create, customize, and copy ready-to-send Messenger notices, roll-call links, and reminders in 1 click.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hiddenPresetIds.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetAlertOpen(true)}
              className="rounded-xl text-xs border-border bg-card/60 shadow-xs"
              title="Restore all default preset templates"
            >
              <RotateCcw className="mr-1.5 size-3.5" /> Restore Presets ({hiddenPresetIds.length})
            </Button>
          )}

          <Button
            type="button"
            onClick={handleOpenCreate}
            className="rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 font-bold text-xs sm:text-sm"
          >
            <Plus className="mr-1.5 size-4" /> New Snippet
          </Button>
        </div>
      </div>

      {/* Search & Subject Filter & View Mode Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search snippet titles or message keywords…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl bg-card border-border"
            />
          </div>

          <select
            value={selectedSubjectId}
            onChange={e => setSelectedSubjectId(e.target.value)}
            className="h-9 rounded-xl border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary sm:w-56"
            title="Select subject desk to auto-fill template variables"
          >
            <option value="">All Subjects (Default Variables)</option>
            {subjects.map(s => (
              <option key={s.id} value={String(s.id)}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span className="text-xs text-muted-foreground font-medium">
            {filteredTemplates.length} snippet{filteredTemplates.length === 1 ? "" : "s"}
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
              title="List View"
            >
              <List className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(t => {
            const isCopied = copiedId === t.id;

            return (
              <div
                key={t.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all space-y-3.5"
              >
                {/* Card Top: Title & Quick Actions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      {!t.isPreset && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit snippet"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDuplicate(t)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                        title="Duplicate as Custom Snippet"
                      >
                        <CopyCheck className="size-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={e => handleRequestDelete(t, e)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t.isPreset ? "Hide preset snippet" : "Delete custom snippet"}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-foreground leading-snug">
                    {t.title}
                  </h3>

                  {t.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Messenger Message Preview */}
                <div className="rounded-xl border border-border/70 bg-secondary/70 dark:bg-[#0f172a] p-3 space-y-2">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground dark:text-slate-400 border-b border-border/70 dark:border-slate-800 pb-1.5">
                    <span className="flex items-center gap-1 font-semibold">
                      <span className="size-1.5 rounded-full bg-emerald-500 inline-block" /> Messenger Preview
                    </span>
                    <span className="font-mono text-[9px]">Just now</span>
                  </div>

                  <div className="rounded-xl rounded-tl-xs bg-gradient-to-br from-[#0084ff] to-[#0066cc] p-2.5 text-xs font-sans leading-relaxed text-white shadow-xs whitespace-pre-wrap select-all font-normal line-clamp-6 break-words">
                    {t.template}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    onClick={() => handleCopySnippet(t)}
                    size="sm"
                    className={`flex-1 rounded-xl font-bold text-xs shadow-xs transition-all ${
                      isCopied
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-primary text-primary-foreground shadow-primary/10"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="mr-1.5 size-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1.5 size-3.5" /> Copy for Messenger
                      </>
                    )}
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-xl px-2.5 border-border text-muted-foreground hover:text-sky-400"
                    title="Open Messenger in new tab"
                  >
                    <a href="https://www.messenger.com" target="_blank" rel="noreferrer">
                      <Send className="size-3.5" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
          {filteredTemplates.map(t => {
            const isCopied = copiedId === t.id;

            return (
              <div
                key={t.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-secondary/40 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-xs sm:text-sm text-foreground">
                      {t.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 break-words">
                    {t.template}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <Button
                    type="button"
                    onClick={() => handleCopySnippet(t)}
                    size="sm"
                    className={`rounded-xl font-bold text-xs transition-all ${
                      isCopied
                        ? "bg-emerald-600 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isCopied ? <Check className="mr-1 size-3.5" /> : <Copy className="mr-1 size-3.5" />}
                    {isCopied ? "Copied" : "Copy"}
                  </Button>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    {!t.isPreset && (
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        title="Edit snippet"
                      >
                        <Edit3 className="size-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDuplicate(t)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-sky-400 hover:bg-sky-500/10 transition-colors"
                      title="Duplicate snippet"
                    >
                      <CopyCheck className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={e => handleRequestDelete(t, e)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete / Hide"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="p-10 text-center rounded-2xl border border-dashed border-border/80 text-muted-foreground text-xs space-y-2">
          <MessageSquare className="size-8 mx-auto text-primary opacity-60 mb-2" />
          <p className="font-semibold text-sm text-foreground">No snippets found</p>
          <p className="text-xs max-w-sm mx-auto">Try adjusting your search keywords or create a new custom snippet.</p>
          <Button size="sm" onClick={handleOpenCreate} className="mt-3 rounded-xl bg-primary text-primary-foreground font-bold text-xs">
            <Plus className="mr-1 size-3.5" /> Create Snippet
          </Button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              <AlertDialogTitle className="text-base font-bold">
                {snippetToDelete?.isPreset ? "Hide Preset Snippet?" : "Delete Custom Snippet?"}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {snippetToDelete?.isPreset ? (
                <>
                  Are you sure you want to hide <strong className="text-foreground">"{snippetToDelete?.title}"</strong>? You can restore all default presets anytime using the "Restore Presets" button.
                </>
              ) : (
                <>
                  Are you sure you want to permanently delete <strong className="text-foreground">"{snippetToDelete?.title}"</strong>? This custom snippet will be removed from your saved templates.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold text-xs"
            >
              {snippetToDelete?.isPreset ? "Hide Preset" : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore Presets Confirmation Modal */}
      <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
        <AlertDialogContent className="rounded-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <RotateCcw className="size-5" />
              <AlertDialogTitle className="text-base font-bold">
                Restore Default Preset Snippets?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This will restore all default system snippets that were previously hidden. Your custom snippets will remain untouched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetPresets}
              className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs"
            >
              Restore Presets
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enhanced Pop-up Editor Modal (Spacious, Responsive, No Horizontal Scroll) */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight">
              {editingTemplate ? "Edit Message Snippet" : "Create New Message Snippet"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Write, format, and polish your message text for fast copy-pasting into Messenger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Snippet Title with AI Title Assist */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="draft-title" className="text-xs font-bold">
                  Snippet Title *
                </Label>
                <AiTextAssist
                  value={draftTitle}
                  onApply={setDraftTitle}
                  target="general_text"
                  context="Suggest a concise, punchy title with emojis for a class Messenger snippet."
                />
              </div>
              <Input
                id="draft-title"
                placeholder="e.g. 📢 Attendance Summary or ⚡ Makeup Class Notice"
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                className="rounded-xl text-xs sm:text-sm font-semibold bg-card border-border"
                autoFocus
              />
            </div>

            {/* Description (Optional) */}
            <div>
              <Label htmlFor="draft-desc" className="text-xs font-bold mb-1.5 block">
                Description / Note (Optional)
              </Label>
              <Input
                id="draft-desc"
                placeholder="e.g. Sent to group chat after published attendance roll call"
                value={draftDescription}
                onChange={e => setDraftDescription(e.target.value)}
                className="rounded-xl text-xs bg-card border-border"
              />
            </div>

            {/* Message Body Section with Tab Switcher & AI Assist */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="draft-content" className="text-xs font-bold">
                    Message Body *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({draftContent.length} chars · {draftContent.trim() ? draftContent.trim().split(/\s+/).length : 0} words)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <AiTextAssist
                    value={draftContent}
                    onApply={setDraftContent}
                    target="announcement"
                    context={draftTitle ? `Title: ${draftTitle}` : undefined}
                  />

                  {/* Write vs Messenger Preview Mode Switcher */}
                  <div className="flex items-center rounded-lg bg-secondary/60 p-0.5 border border-border">
                    <button
                      type="button"
                      onClick={() => setEditorTab("write")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                        editorTab === "write"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Edit3 className="size-3" /> Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorTab("preview")}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 ${
                        editorTab === "preview"
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Eye className="size-3" /> Messenger Preview
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Placeholders Toolbar */}
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground">
                  <Variable className="size-3.5 text-primary" />
                  <span>Dynamic Variables (1-Click Insert):</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {DYNAMIC_VARIABLES.map(v => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => insertTextAtCursor(v.value)}
                      className="rounded-lg border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-mono font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors active:scale-95"
                      title={`Insert ${v.value} into message`}
                    >
                      {v.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Greetings & Closings Bar */}
              <div className="rounded-xl border border-border/70 bg-secondary/25 p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-muted-foreground">Quick Greetings:</span>
                    {QUICK_GREETINGS.map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => insertTextAtCursor(`${g}\n\n`)}
                        className="rounded-md border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-secondary hover:text-primary transition-colors"
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-muted-foreground">Quick Closings:</span>
                    {QUICK_CLOSINGS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => insertTextAtCursor(`\n\n${c}`)}
                        className="rounded-md border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground hover:bg-secondary hover:text-primary transition-colors"
                        title={c}
                      >
                        {c.split(".")[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Formatting & Categorized Emoji Helper Bar */}
              <div className="rounded-xl border border-border/70 bg-secondary/30 p-2.5 space-y-2">
                {/* Top Row: Formatting Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                    <span>Format:</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => wrapSelection("*", "*", "Bold text")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Bold (*Text*)"
                    >
                      <Bold className="size-3" /> Bold
                    </button>

                    <button
                      type="button"
                      onClick={() => wrapSelection("_", "_", "Italic text")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Italic (_Text_)"
                    >
                      <Italic className="size-3" /> Italic
                    </button>

                    <button
                      type="button"
                      onClick={() => wrapSelection("~", "~", "strikethrough text")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Strikethrough (~Text~)"
                    >
                      <Strikethrough className="size-3" /> Strike
                    </button>

                    <button
                      type="button"
                      onClick={() => wrapSelection("`", "`", "code")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Code (`code`)"
                    >
                      <Code className="size-3" /> Code
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n• ")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Bullet point (• )"
                    >
                      <List className="size-3" /> Bullet
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n1. ")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Numbered list (1. )"
                    >
                      <ListOrdered className="size-3" /> Numbered
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n━━━━━━━━━━━━━━━━━━━━\n")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Divider line"
                    >
                      <Minus className="size-3" /> Divider
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("\n> ")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Quote/Note block (> )"
                    >
                      <Quote className="size-3" /> Note
                    </button>

                    <button
                      type="button"
                      onClick={() => insertTextAtCursor("👉 {Portal Link} ")}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
                      title="Insert Fast Link pointer"
                    >
                      <ExternalLink className="size-3" /> Link Pointer
                    </button>
                  </div>
                </div>

                {/* 1-Click Popular Messenger Reaction Bar */}
                <div className="flex items-center justify-between gap-1.5 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                    Quick Reactions:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {QUICK_REACTION_EMOJIS.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="size-8 sm:size-7 rounded-lg hover:bg-secondary grid place-items-center text-sm transition-transform active:scale-90"
                        title={`Insert ${emoji}`}
                        aria-label={`Insert emoji ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bottom Row: Categorized Messenger Emojis */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                      <Smile className="size-3.5 text-amber-400" />
                      <span>Messenger Emojis:</span>
                    </div>

                    {/* Emoji Category Tabs */}
                    <div className="flex flex-wrap items-center gap-1">
                      {Object.keys(EMOJI_CATEGORIES).map(cat => {
                        const info = EMOJI_CATEGORIES[cat];
                        const isActive = activeEmojiCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveEmojiCategory(cat)}
                            className={`min-h-9 sm:min-h-8 inline-flex items-center px-2.5 py-1 text-xs sm:text-[11px] font-bold rounded-lg transition-all shrink-0 ${
                              isActive
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground bg-card/60 border border-border/50"
                            }`}
                          >
                            {info.icon} {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Category Emoji Grid */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {EMOJI_CATEGORIES[activeEmojiCategory]?.emojis.map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleInsertEmoji(emoji)}
                        className="size-8 sm:size-7 rounded-lg hover:bg-card hover:border hover:border-border grid place-items-center text-base sm:text-sm transition-all active:scale-90"
                        title={`Insert ${emoji}`}
                        aria-label={`Insert emoji ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor Tab 1: Write Textarea */}
              {editorTab === "write" ? (
                <Textarea
                  ref={textareaRef}
                  id="draft-content"
                  rows={8}
                  placeholder="Type or paste your message text here..."
                  value={draftContent}
                  onChange={e => setDraftContent(e.target.value)}
                  className="rounded-xl text-xs sm:text-sm font-sans leading-relaxed resize-y bg-card border-border min-h-[180px]"
                />
              ) : (
                /* Editor Tab 2: Full-Width Messenger Live Preview */
                <div className="rounded-2xl border border-border/80 bg-secondary/60 dark:bg-[#0f172a] p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground dark:text-slate-400 border-b border-border/70 dark:border-slate-800 pb-2">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <span className="size-2 rounded-full bg-emerald-500 inline-block" /> Facebook Messenger Group Chat
                    </span>
                    <span className="font-mono text-[10px]">Just now</span>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="size-8 rounded-full bg-gradient-to-tr from-primary to-amber-500 grid place-items-center text-white font-black text-xs shrink-0 shadow-sm">
                      SS
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="rounded-2xl rounded-tl-sm bg-gradient-to-br from-[#0084ff] to-[#0066cc] p-3.5 text-xs sm:text-sm font-sans leading-relaxed text-white shadow-md whitespace-pre-wrap select-all font-normal break-words max-h-[300px] overflow-y-auto">
                        {draftContent || (
                          <span className="text-white/60 italic">Type in the message box to see live preview...</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground dark:text-slate-400 pl-1">
                        Ready to paste into your class Messenger group chat
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2 border-t border-border/60 pt-4">
            {editingTemplate && !editingTemplate.isPreset ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setIsEditorOpen(false);
                  handleRequestDelete(editingTemplate);
                }}
                className="rounded-xl text-xs font-bold"
              >
                <Trash2 className="mr-1 size-3.5" /> Delete Snippet
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-xl text-xs bg-card"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveTemplate}
                className="rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/20"
              >
                {editingTemplate ? "Save Changes" : "Create Snippet"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}


