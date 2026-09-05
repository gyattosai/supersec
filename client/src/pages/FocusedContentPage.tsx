import { AnnouncementEditor } from "@/components/AnnouncementEditor";
import { AnnouncementPreview } from "@/components/AnnouncementPreview";
import { AiTextAssist } from "@/components/AiTextAssist";
import DashboardLayout from "@/components/DashboardLayout";
import { QuestionAnswerControls } from "@/components/QuestionAnswerControls";
import { RecordStatusBadge } from "@/components/RecordStatusBadge";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatFileSize, isPublicImageMimeType, isSupportedPublicUploadMimeType, isSupportedResourceFileMimeType, MAX_PUBLIC_UPLOAD_BYTES, PUBLIC_IMAGE_MIME_TYPES, RESOURCE_FILE_MIME_TYPES } from "@shared/mediaPolicy";
import { SocialPreviewCard } from "@/components/SocialPreviewCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import { Archive, ArchiveRestore, ArrowLeft, BookOpen, Check, CircleHelp, Copy, ExternalLink, Eye, FileText, Image, Layers, Loader2, Megaphone, Paperclip, Pencil, Send, Share2, Sparkles, StickyNote, Trash2, Upload } from "lucide-react";
import React, { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { NotesWorkspaceCard } from "@/components/NotesWorkspaceCard";
import { MessageTemplatesCard } from "@/components/MessageTemplatesCard";
import ErrorBoundary from "@/components/ErrorBoundary";
import { filterNotes, type SecretaryNote, INITIAL_SECRETARY_NOTES } from "@shared/notes";
import { filterMessageTemplates, DEFAULT_PRESET_TEMPLATES, type MessageTemplate } from "@shared/messageTemplates";
import { Link, useLocation, useRoute } from "wouter";

const tabs = [
  { key: "announcements", label: "Announcements", singular: "Announcement", icon: Megaphone, description: "Write, publish, and share class updates." },
  { key: "resources", label: "Resources", singular: "Resource", icon: BookOpen, description: "Keep class links, files, forms, and meeting links." },
  { key: "questions", label: "Q&A", singular: "Q&A", icon: CircleHelp, description: "Save answers you can share again." },
  { key: "notes", label: "Notes", singular: "Note", icon: StickyNote, description: "Personal drafts, meeting minutes, and subject-specific memos." },
  { key: "snippets", label: "Snippets", singular: "Snippet", icon: Sparkles, description: "Quick message templates and canned responses for class blasts." },
] as const;
type ContentKind = (typeof tabs)[number]["key"];
type ContentRowAction = { type: "publish" | "archive" | "restore" | "delete"; id: number | string };
type AttachmentAsset = { id: number | string; url: string; originalName: string; mimeType: string; byteSize: number; altText: string | null };
type LocalContentListProps = { kind: ContentKind; subjectId: number | string; items: any[] | undefined; loading: boolean; onPublish: (id: any) => void; onArchive: (id: any) => void; onRestore: (id: any) => void; onDelete?: (item: any) => void; onCrossPost?: (item: any) => void; busy?: boolean; subjectCode?: string };

function toSafeIsoString(val: unknown): string | undefined {
  if (!val) return undefined;
  try {
    const d = new Date(val as string | number | Date);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

function fileToDataUrl(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Unable to read the selected file")); reader.onerror = () => reject(new Error("Unable to read the selected file")); reader.readAsDataURL(file); }); }
function assetAccepts(mimeTypes: readonly string[]) { return mimeTypes.join(","); }

export default function FocusedContentPage(props?: { params?: { subjectId?: string; kind?: string; itemId?: string } }) {
  const [, listParams] = useRoute("/app/subjects/:subjectId/:kind");
  const [, createParams] = useRoute("/app/subjects/:subjectId/:kind/new");
  const [, editParams] = useRoute("/app/subjects/:subjectId/:kind/edit/:itemId");
  const [location, setLocation] = useLocation();
  const params = props?.params ?? editParams ?? createParams ?? listParams;
  const pathSubjectId = location.startsWith("/app/subjects/")
    ? location.slice("/app/subjects/".length).split("/")[0]?.split("?")[0]
    : "";
  const subjectId = params?.subjectId || pathSubjectId || "";
  const numSubjectId = Number(subjectId);
  const isNumericSubject = !isNaN(numSubjectId) && numSubjectId > 0 && String(numSubjectId) === String(subjectId).trim();
  const subjectQueryParam = isNumericSubject ? numSubjectId : subjectId;
  const kind: ContentKind = tabs.some(tab => tab.key === params?.kind) ? params!.kind as ContentKind : "announcements";
  const itemId = props?.params?.itemId ?? editParams?.itemId ?? "";
  const numItemId = Number(itemId);
  const isNumericItem = !isNaN(numItemId) && numItemId > 0 && String(numItemId) === String(itemId).trim();
  const effectiveItemId = isNumericItem ? numItemId : itemId;
  const isAuthoring = Boolean(createParams || editParams);
  const editing = Boolean(editParams && itemId && itemId !== "0" && itemId !== "NaN");
  const tab = tabs.find(item => item.key === kind)!;
  const Icon = tab.icon;
  const utils = trpc.useUtils();
  const announcements = trpc.content.announcements.list.useQuery(
    { subjectId: subjectQueryParam },
    { enabled: Boolean(subjectQueryParam), staleTime: 0, refetchOnMount: "always" }
  );
  const resources = trpc.content.resources.list.useQuery(
    { subjectId: subjectQueryParam },
    { enabled: Boolean(subjectQueryParam), staleTime: 0, refetchOnMount: "always" }
  );
  const questions = trpc.content.questions.list.useQuery(
    { subjectId: subjectQueryParam },
    { enabled: Boolean(subjectQueryParam), staleTime: 0, refetchOnMount: "always" }
  );
  const isListLoading = kind === "announcements" ? announcements.isLoading : kind === "resources" ? resources.isLoading : questions.isLoading;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [resourceType, setResourceType] = useState("External link");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [isOfficial, setIsOfficial] = useState(true);
  const [changeSummary, setChangeSummary] = useState("");
  const [mediaAssetId, setMediaAssetId] = useState<number | null>(null);
  const [socialPreviewMediaAssetId, setSocialPreviewMediaAssetId] = useState<number | null>(null);
  const [socialAsset, setSocialAsset] = useState<AttachmentAsset | null>(null);
  const [attachmentAssets, setAttachmentAssets] = useState<AttachmentAsset[]>([]);
  const [imageAltText, setImageAltText] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingContentAction, setPendingContentAction] = useState<ContentRowAction | null>(null);
  const selectedItem = useMemo(() => {
    const list = kind === "announcements" ? announcements.data : kind === "resources" ? resources.data : questions.data;
    return list?.find(item => String(item.id) === String(itemId) || (isNumericItem && item.id === numItemId));
  }, [announcements.data, itemId, numItemId, isNumericItem, kind, questions.data, resources.data]);

  useEffect(() => {
    if (!editing || !selectedItem) return;
    setChangeSummary(""); setPreviewOpen(false);
    if (kind === "announcements" && "body" in selectedItem) {
      setTitle(selectedItem.title);
      setBody(selectedItem.body);
      setMediaAssetId(selectedItem.mediaAssetId);
      setSocialPreviewMediaAssetId(selectedItem.socialPreviewMediaAssetId);
      setSocialAsset(selectedItem.socialAsset ?? null);
      setImageAltText(selectedItem.socialAsset?.altText ?? selectedItem.coverAsset?.altText ?? "");
    }
    if (kind === "resources" && "description" in selectedItem) {
      setTitle(selectedItem.title);
      setBody(selectedItem.description);
      setCategory(selectedItem.category);
      setResourceType(selectedItem.resourceType);
      setDestinationUrl(selectedItem.destinationUrl);
      setMediaAssetId(selectedItem.fallbackMediaAssetId);
      setSocialPreviewMediaAssetId(selectedItem.socialPreviewMediaAssetId);
      setAttachmentAssets(selectedItem.attachments ?? []);
      setSocialAsset(selectedItem.socialAsset ?? null);
      setImageAltText(selectedItem.socialAsset?.altText ?? selectedItem.coverAsset?.altText ?? "");
    }
    if (kind === "questions" && "question" in selectedItem) {
      setQuestion(selectedItem.question);
      setAnswer(selectedItem.answer);
      setTagsText(selectedItem.tagsText ?? "");
      setIsOfficial(selectedItem.isOfficial);
      setSocialPreviewMediaAssetId(selectedItem.socialPreviewMediaAssetId);
      setSocialAsset(selectedItem.socialAsset ?? null);
      setImageAltText(selectedItem.socialAsset?.altText ?? "");
    }
  }, [editing, kind, selectedItem]);

  const subjectsQuery = trpc.subjects.list.useQuery();
  const activeSubjects = useMemo(() => {
    return (subjectsQuery.data ?? []).filter(s => s.status === "active");
  }, [subjectsQuery.data]);
  const otherSubjects = useMemo(() => {
    return activeSubjects.filter(s =>
      String(s.id) !== String(subjectQueryParam) &&
      s.publicId !== String(subjectQueryParam) &&
      s.code !== String(subjectQueryParam)
    );
  }, [activeSubjects, subjectQueryParam]);
  const currentSubject = useMemo(() => {
    return activeSubjects.find(s =>
      String(s.id) === String(subjectQueryParam) ||
      s.publicId === String(subjectQueryParam) ||
      s.code === String(subjectQueryParam)
    );
  }, [activeSubjects, subjectQueryParam]);
  const [selectedCrossPostSubjectIds, setSelectedCrossPostSubjectIds] = useState<Array<number | string>>([]);
  const [crossPostTargetItem, setCrossPostTargetItem] = useState<{ id: any; title: string; kind: ContentKind } | null>(null);
  const [modalTargetSubjectIds, setModalTargetSubjectIds] = useState<Array<number | string>>([]);
  const [modalPublishDirectly, setModalPublishDirectly] = useState(true);

  const [notesCount, setNotesCount] = useState<number>(0);
  const [snippetsCount, setSnippetsCount] = useState<number>(0);

  useEffect(() => {
    const updateCounts = () => {
      try {
        const savedNotes = localStorage.getItem("supersec_secretary_notes");
        const parsedNotes: SecretaryNote[] = savedNotes ? JSON.parse(savedNotes) : INITIAL_SECRETARY_NOTES;
        const matchingNotes = filterNotes(parsedNotes, {
          subjectId: currentSubject ? currentSubject.id : subjectId,
        }).filter(n => {
          if (!currentSubject && !subjectId) return true;
          const matchSubId = currentSubject ? String(currentSubject.id) : String(subjectId);
          const matchCode = currentSubject ? currentSubject.code : String(subjectId);
          if (n.subjectId && String(n.subjectId) === matchSubId) return true;
          if (n.subjectCode && (n.subjectCode === matchCode || n.subjectCode === currentSubject?.publicId)) return true;
          return false;
        });
        setNotesCount(matchingNotes.length);
      } catch {
        setNotesCount(0);
      }

      try {
        const savedTemplates = localStorage.getItem("supersec_custom_message_templates");
        const hiddenPresets = localStorage.getItem("supersec_hidden_preset_templates");
        const custom: MessageTemplate[] = savedTemplates ? JSON.parse(savedTemplates) : [];
        const hidden: string[] = hiddenPresets ? JSON.parse(hiddenPresets) : [];
        const presets = DEFAULT_PRESET_TEMPLATES.filter(p => !hidden.includes(p.id));
        const matchingSnippets = filterMessageTemplates([...presets, ...custom], {
          subjectId: currentSubject ? currentSubject.id : subjectId,
        });
        setSnippetsCount(matchingSnippets.length);
      } catch {
        setSnippetsCount(0);
      }
    };

    updateCounts();
    window.addEventListener("supersec_notes_updated", updateCounts);
    window.addEventListener("supersec_snippets_updated", updateCounts);
    window.addEventListener("storage", updateCounts);
    return () => {
      window.removeEventListener("supersec_notes_updated", updateCounts);
      window.removeEventListener("supersec_snippets_updated", updateCounts);
      window.removeEventListener("storage", updateCounts);
    };
  }, [subjectId, currentSubject]);

  const annoCount = announcements.data?.length ?? 0;
  const resCount = resources.data?.length ?? 0;
  const qaCount = questions.data?.length ?? 0;
  const countByKind: Record<ContentKind, number> = {
    announcements: annoCount,
    resources: resCount,
    questions: qaCount,
    notes: notesCount,
    snippets: snippetsCount,
  };

  useEffect(() => {
    if (!isAuthoring || editing) return;
    setTitle(""); setBody(""); setCategory(""); setResourceType("External link"); setDestinationUrl(""); setQuestion(""); setAnswer(""); setTagsText(""); setIsOfficial(true); setChangeSummary(""); setMediaAssetId(null); setSocialPreviewMediaAssetId(null); setSocialAsset(null); setAttachmentAssets([]); setImageAltText(""); setPreviewOpen(false); setSelectedCrossPostSubjectIds([]);
  }, [editing, isAuthoring, kind]);

  const refresh = async () => {
    await Promise.all([
      utils.content.announcements.list.invalidate({ subjectId: subjectQueryParam as any }),
      utils.content.resources.list.invalidate({ subjectId: subjectQueryParam as any }),
      utils.content.questions.list.invalidate({ subjectId: subjectQueryParam as any }),
      utils.content.announcements.list.refetch({ subjectId: subjectQueryParam as any }),
      utils.content.resources.list.refetch({ subjectId: subjectQueryParam as any }),
      utils.content.questions.list.refetch({ subjectId: subjectQueryParam as any }),
      utils.content.announcements.list.invalidate(),
      utils.content.resources.list.invalidate(),
      utils.content.questions.list.invalidate(),
    ]);
  };
  const backToList = () => setLocation(subjectId && subjectId !== "NaN" ? `/app/subjects/${subjectId}/${kind}` : "/app/subjects");
  const uploadMedia = trpc.foundation.media.upload.useMutation();
  const crossPostAnnouncement = trpc.content.announcements.crossPost.useMutation({
    onSuccess: async res => {
      await refresh();
      toast.success(`Announcement published and cross-posted to ${res.count} subject(s)`);
      setCrossPostTargetItem(null);
    },
    onError: err => toast.error(err.message),
  });
  const crossPostResource = trpc.content.resources.crossPost.useMutation({
    onSuccess: async res => {
      await refresh();
      toast.success(`Resource published and cross-posted to ${res.count} subject(s)`);
      setCrossPostTargetItem(null);
    },
    onError: err => toast.error(err.message),
  });
  const crossPostQuestion = trpc.content.questions.crossPost.useMutation({
    onSuccess: async res => {
      await refresh();
      toast.success(`Q&A published and cross-posted to ${res.count} subject(s)`);
      setCrossPostTargetItem(null);
    },
    onError: err => toast.error(err.message),
  });
  const announcementCreate = trpc.content.announcements.create.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success(selectedCrossPostSubjectIds.length > 0 ? `Announcement published and cross-posted to ${selectedCrossPostSubjectIds.length} other subject(s)` : "Announcement saved as draft");
      backToList();
    },
    onError: error => toast.error(error.message),
  });
  const resourceCreate = trpc.content.resources.create.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success(selectedCrossPostSubjectIds.length > 0 ? `Resource published and cross-posted to ${selectedCrossPostSubjectIds.length} other subject(s)` : "Resource saved as draft");
      backToList();
    },
    onError: error => toast.error(error.message),
  });
  const questionCreate = trpc.content.questions.create.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success(selectedCrossPostSubjectIds.length > 0 ? `Q&A published and cross-posted to ${selectedCrossPostSubjectIds.length} other subject(s)` : "Q&A saved as draft");
      backToList();
    },
    onError: error => toast.error(error.message),
  });
  const announcementUpdate = trpc.content.announcements.update.useMutation({ onSuccess: async () => { await refresh(); toast.success("Announcement updated as a new version"); backToList(); }, onError: error => toast.error(error.message) });
  const resourceUpdate = trpc.content.resources.update.useMutation({ onSuccess: async () => { await refresh(); toast.success("Resource updated as a new version"); backToList(); }, onError: error => toast.error(error.message) });
  const questionUpdate = trpc.content.questions.update.useMutation({ onSuccess: async () => { await refresh(); toast.success("Q&A updated as a new version"); backToList(); }, onError: error => toast.error(error.message) });
  const publishAnnouncement = trpc.content.announcements.publish.useMutation({ onMutate: input => { setPendingContentAction({ type: "publish", id: input.id }); }, onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Announcement published"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const publishResource = trpc.content.resources.publish.useMutation({ onMutate: input => { setPendingContentAction({ type: "publish", id: input.id }); }, onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Resource published"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const publishQuestion = trpc.content.questions.publish.useMutation({ onMutate: input => { setPendingContentAction({ type: "publish", id: input.id }); }, onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Q&A published"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const archiveAnnouncement = trpc.content.announcements.archive.useMutation({ onMutate: input => setPendingContentAction({ type: "archive", id: input.id }), onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Moved to Archive"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const archiveResource = trpc.content.resources.archive.useMutation({ onMutate: input => setPendingContentAction({ type: "archive", id: input.id }), onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Moved to Archive"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const archiveQuestion = trpc.content.questions.archive.useMutation({ onMutate: input => setPendingContentAction({ type: "archive", id: input.id }), onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Moved to Archive"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const restoreAnnouncement = trpc.content.announcements.restore.useMutation({ onMutate: input => setPendingContentAction({ type: "restore", id: input.id }), onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Restored as draft"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const restoreResource = trpc.content.resources.restore.useMutation({ onMutate: input => setPendingContentAction({ type: "restore", id: input.id }), onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Restored as draft"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const restoreQuestion = trpc.content.questions.restore.useMutation({ onMutate: input => setPendingContentAction({ type: "restore", id: input.id }), onSuccess: async () => { await refresh(); setPendingContentAction(null); toast.success("Restored as draft"); }, onError: error => { setPendingContentAction(null); toast.error(error.message); } });
  const deleteAnnouncement = trpc.content.announcements.delete.useMutation({
    onMutate: input => setPendingContentAction({ type: "delete", id: input.id }),
    onSuccess: async () => {
      await refresh();
      setPendingContentAction(null);
      setItemToDelete(null);
      toast.success("Announcement deleted permanently");
    },
    onError: error => {
      setPendingContentAction(null);
      toast.error(error.message);
    },
  });
  const deleteResource = trpc.content.resources.delete.useMutation({
    onMutate: input => setPendingContentAction({ type: "delete", id: input.id }),
    onSuccess: async () => {
      await refresh();
      setPendingContentAction(null);
      setItemToDelete(null);
      toast.success("Resource deleted permanently");
    },
    onError: error => {
      setPendingContentAction(null);
      toast.error(error.message);
    },
  });
  const deleteQuestion = trpc.content.questions.delete.useMutation({
    onMutate: input => setPendingContentAction({ type: "delete", id: input.id }),
    onSuccess: async () => {
      await refresh();
      setPendingContentAction(null);
      setItemToDelete(null);
      toast.success("Q&A deleted permanently");
    },
    onError: error => {
      setPendingContentAction(null);
      toast.error(error.message);
    },
  });

  const [itemToDelete, setItemToDelete] = useState<{ id: any; title: string } | null>(null);

  const confirmDelete = () => {
    if (!itemToDelete) return;
    if (kind === "announcements") deleteAnnouncement.mutate({ id: itemToDelete.id });
    if (kind === "resources") deleteResource.mutate({ id: itemToDelete.id });
    if (kind === "questions") deleteQuestion.mutate({ id: itemToDelete.id });
  };

  const autoDraft = trpc.content.autoDraftVersionHistory.useMutation({
    onSuccess: data => {
      setChangeSummary(data.summary);
      toast.success("AI auto-drafted version history note");
    },
    onError: error => {
      toast.error(error.message || "Could not auto-draft version summary");
    },
  });

  const handleAutoDraft = () => {
    const isQuestion = kind === "questions";
    const currTitle = isQuestion ? question.trim() : title.trim();
    const currBody = isQuestion ? answer.trim() : body.trim();
    if (!currTitle && !currBody) {
      toast.error("Please provide title or content first before auto-drafting");
      return;
    }

    const prevTitle = selectedItem
      ? (isQuestion ? (selectedItem as any).question : (selectedItem as any).title)
      : undefined;
    const prevBody = selectedItem
      ? (isQuestion ? (selectedItem as any).answer : (kind === "resources" ? (selectedItem as any).description : (selectedItem as any).body))
      : undefined;

    autoDraft.mutate({
      kind: isQuestion ? "question" : (kind === "resources" ? "resource" : "announcement"),
      title: currTitle || "Untitled",
      body: currBody || "",
      previousTitle: prevTitle || null,
      previousBody: prevBody || null,
      version: selectedItem?.version ? selectedItem.version + 1 : 2,
      action: editing ? "updated" : "published",
      category: kind === "resources" ? category : null,
      attachmentsCount: kind === "resources" ? attachmentAssets.length : null,
    });
  };

  const busy = uploadMedia.isPending || announcementCreate.isPending || resourceCreate.isPending || questionCreate.isPending || announcementUpdate.isPending || resourceUpdate.isPending || questionUpdate.isPending || crossPostAnnouncement.isPending || crossPostResource.isPending || crossPostQuestion.isPending || deleteAnnouncement.isPending || deleteResource.isPending || deleteQuestion.isPending || autoDraft.isPending;

  const uploadAsset = async (event: ChangeEvent<HTMLInputElement>, target: "social" | "attachment") => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PUBLIC_UPLOAD_BYTES) return toast.error("Choose a file smaller than 8 MB");
    const isImageSlot = target === "social";
    if (!isSupportedPublicUploadMimeType(file.type) || (isImageSlot && !isPublicImageMimeType(file.type)) || (target === "attachment" && !isSupportedResourceFileMimeType(file.type))) return toast.error(isImageSlot ? "Choose a supported image" : "Choose a PDF, document, spreadsheet, presentation, text file, or CSV");
    if (target === "attachment" && attachmentAssets.length >= 6) return toast.error("A Resource can include up to 6 attached files");
    try {
      const uploaded = await uploadMedia.mutateAsync({ fileName: file.name, mimeType: file.type, base64Data: await fileToDataUrl(file), altText: isImageSlot ? imageAltText.trim() || title || question || null : null, publicUse: true });
      const asset: AttachmentAsset = { id: uploaded.id, url: uploaded.url, originalName: uploaded.originalName, mimeType: uploaded.mimeType, byteSize: uploaded.byteSize, altText: isImageSlot ? imageAltText.trim() || title || question || null : null };
      if (target === "social") { setSocialPreviewMediaAssetId(asset.id as any); setSocialAsset(asset); toast.success("Messenger preview image attached"); }
      if (target === "attachment") { setAttachmentAssets(current => [...current, asset]); if (!destinationUrl) { setDestinationUrl(new URL(asset.url, window.location.origin).toString()); setResourceType("File attachment"); } toast.success("Attachment added"); }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to upload the selected file"); }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const effectiveSubjectId = subjectQueryParam as any;

    if (kind === "announcements") {
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      if (trimmedTitle.length < 2) {
        toast.error("Announcement title must be at least 2 characters");
        return;
      }
      if (!trimmedBody) {
        toast.error("Announcement body cannot be empty");
        return;
      }
      const socialImage = socialPreviewMediaAssetId !== null ? socialPreviewMediaAssetId : (mediaAssetId ?? null);
      if (editing) {
        announcementUpdate.mutate({
          id: effectiveItemId,
          title: trimmedTitle,
          body: trimmedBody,
          mediaAssetId: mediaAssetId ?? null,
          socialPreviewMediaAssetId: socialImage,
          summary: changeSummary.trim() || "Updated",
          targetSubjectIds: selectedCrossPostSubjectIds,
        });
      } else {
        announcementCreate.mutate({
          subjectId: effectiveSubjectId,
          title: trimmedTitle,
          body: trimmedBody,
          mediaAssetId: mediaAssetId ?? null,
          socialPreviewMediaAssetId: socialImage,
          targetSubjectIds: selectedCrossPostSubjectIds,
        });
      }
    }

    if (kind === "resources") {
      const trimmedTitle = title.trim();
      const trimmedBody = body.trim();
      const trimmedCategory = category.trim();
      if (trimmedTitle.length < 2) {
        toast.error("Resource title must be at least 2 characters");
        return;
      }
      if (!trimmedBody) {
        toast.error("Resource description cannot be empty");
        return;
      }
      if (trimmedCategory.length < 2) {
        toast.error("Resource category must be at least 2 characters");
        return;
      }

      let finalUrl = destinationUrl.trim();
      if (!finalUrl && attachmentAssets.length > 0) {
        finalUrl = new URL(attachmentAssets[0].url, window.location.origin).toString();
        setDestinationUrl(finalUrl);
      }
      if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
        finalUrl = `https://${finalUrl}`;
        setDestinationUrl(finalUrl);
      }
      if (!finalUrl) {
        toast.error("Please provide a destination link or upload a file");
        return;
      }

      const attachmentAssetIds = attachmentAssets.map(asset => Number(asset.id)).filter(id => !isNaN(id) && id > 0);
      const effectiveFallbackId = attachmentAssetIds[0] ?? (mediaAssetId ? Number(mediaAssetId) : null);
      const socialImage = socialPreviewMediaAssetId !== null ? socialPreviewMediaAssetId : (mediaAssetId ?? null);

      if (editing) {
        resourceUpdate.mutate({
          id: effectiveItemId,
          title: trimmedTitle,
          description: trimmedBody,
          category: trimmedCategory,
          resourceType,
          destinationUrl: finalUrl,
          fallbackMediaAssetId: effectiveFallbackId,
          socialPreviewMediaAssetId: socialImage,
          attachmentAssetIds,
          summary: changeSummary.trim() || "Updated",
          targetSubjectIds: selectedCrossPostSubjectIds,
        });
      } else {
        resourceCreate.mutate({
          subjectId: effectiveSubjectId,
          title: trimmedTitle,
          description: trimmedBody,
          category: trimmedCategory,
          resourceType,
          destinationUrl: finalUrl,
          fallbackMediaAssetId: effectiveFallbackId,
          socialPreviewMediaAssetId: socialImage,
          attachmentAssetIds,
          targetSubjectIds: selectedCrossPostSubjectIds,
        });
      }
    }

    if (kind === "questions") {
      const trimmedQuestion = question.trim();
      const trimmedAnswer = answer.trim();
      if (trimmedQuestion.length < 3) {
        toast.error("Question must be at least 3 characters");
        return;
      }
      if (!trimmedAnswer) {
        toast.error("Answer cannot be empty");
        return;
      }

      const cleanTags = tagsText
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
        .join(", ") || null;
      const socialImage = socialPreviewMediaAssetId !== null ? socialPreviewMediaAssetId : null;

      if (editing) {
        questionUpdate.mutate({
          id: effectiveItemId,
          question: trimmedQuestion,
          answer: trimmedAnswer,
          tagsText: cleanTags,
          isOfficial,
          socialPreviewMediaAssetId: socialImage,
          summary: changeSummary.trim() || "Updated",
          targetSubjectIds: selectedCrossPostSubjectIds,
        });
      } else {
        questionCreate.mutate({
          subjectId: effectiveSubjectId,
          question: trimmedQuestion,
          answer: trimmedAnswer,
          tagsText: cleanTags,
          isOfficial,
          socialPreviewMediaAssetId: socialImage,
          targetSubjectIds: selectedCrossPostSubjectIds,
        });
      }
    }
  };

  const openCrossPostModal = (item: any) => {
    const itemTitle = kind === "questions" ? item.question : item.title;
    setCrossPostTargetItem({ id: item.id, title: itemTitle, kind });
    setModalTargetSubjectIds([]);
    setModalPublishDirectly(true);
  };

  const handleExecuteCrossPost = async () => {
    if (!crossPostTargetItem || modalTargetSubjectIds.length === 0) return;
    if (crossPostTargetItem.kind === "announcements") {
      await crossPostAnnouncement.mutateAsync({
        id: crossPostTargetItem.id,
        targetSubjectIds: modalTargetSubjectIds,
        publishDirectly: modalPublishDirectly,
      });
    } else if (crossPostTargetItem.kind === "resources") {
      await crossPostResource.mutateAsync({
        id: crossPostTargetItem.id,
        targetSubjectIds: modalTargetSubjectIds,
        publishDirectly: modalPublishDirectly,
      });
    } else if (crossPostTargetItem.kind === "questions") {
      await crossPostQuestion.mutateAsync({
        id: crossPostTargetItem.id,
        targetSubjectIds: modalTargetSubjectIds,
        publishDirectly: modalPublishDirectly,
      });
    }
  };

  if (isAuthoring) return (
    <DashboardLayout>
      <section className="mx-auto max-w-4xl">
        <WorkspacePageHeader
          eyebrow={tab.label}
          title={`${editing ? "Edit" : "New"} ${tab.singular}`}
          description={editing ? "Save changes as a new version." : "Create a draft. Publish it when ready."}
          back={
            <Link
              href={`/app/subjects/${subjectId}/${kind}`}
              className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to {tab.label}
            </Link>
          }
        />
        <form onSubmit={submit} className="signal-panel mt-6 overflow-hidden">
          <div className="border-b border-border bg-secondary/65 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="signal-kicker">Editor</p>
                <h2 className="mt-1 text-xl font-bold tracking-[-0.04em]">
                  {editing ? `Edit ${tab.singular}` : `Create ${tab.singular}`}
                </h2>
              </div>
            </div>
          </div>
          {editing && !selectedItem ? (
            isListLoading ? (
              <div className="signal-inset m-5 p-6 text-center text-xs text-muted-foreground animate-pulse">
                Loading {tab.singular.toLowerCase()}…
              </div>
            ) : (
              <div className="signal-panel m-5 p-6 text-center space-y-3">
                <p className="text-sm font-semibold text-foreground">{tab.singular} not found or has been deleted.</p>
                <Button type="button" variant="outline" onClick={backToList} className="rounded-xl text-xs">
                  Return to {tab.label}
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-5 p-5 sm:p-6">
              {kind === "announcements" ? (
                <AnnouncementFields
                  title={title}
                  body={body}
                  previewOpen={previewOpen}
                  onTitleChange={setTitle}
                  onBodyChange={setBody}
                  onPreview={() => setPreviewOpen(value => !value)}
                />
              ) : null}
              {kind === "resources" ? (
                <ResourceFields
                  title={title}
                  body={body}
                  category={category}
                  resourceType={resourceType}
                  destinationUrl={destinationUrl}
                  onTitleChange={setTitle}
                  onBodyChange={setBody}
                  onCategoryChange={setCategory}
                  onResourceTypeChange={setResourceType}
                  onDestinationUrlChange={setDestinationUrl}
                />
              ) : null}
              {kind === "questions" ? (
                <QuestionFields
                  question={question}
                  answer={answer}
                  tagsText={tagsText}
                  isOfficial={isOfficial}
                  changeSummary={changeSummary}
                  editing={editing}
                  onQuestionChange={setQuestion}
                  onAnswerChange={setAnswer}
                  onTagsChange={setTagsText}
                  onOfficialChange={setIsOfficial}
                  onSummaryChange={setChangeSummary}
                  onAutoDraft={handleAutoDraft}
                  isDrafting={autoDraft.isPending}
                />
              ) : null}
              <MediaFields
                kind={kind}
                socialAsset={socialAsset}
                attachmentAssets={attachmentAssets}
                imageAltText={imageAltText}
                busy={uploadMedia.isPending}
                onImageAltTextChange={val => {
                  setImageAltText(val);
                  setSocialAsset(prev => prev ? { ...prev, altText: val } : null);
                }}
                onUpload={uploadAsset}
                onRemoveSocial={() => {
                  setSocialPreviewMediaAssetId(null);
                  setSocialAsset(null);
                  setMediaAssetId(null);
                }}
                onRemoveAttachment={assetId => {
                  setAttachmentAssets(current => {
                    const remaining = current.filter(asset => asset.id !== assetId);
                    if (mediaAssetId === assetId) {
                      setMediaAssetId(remaining[0]?.id ? Number(remaining[0].id) : null);
                    }
                    return remaining;
                  });
                }}
              />
              {otherSubjects.length > 0 ? (
                <CrossPostFormSection
                  isEditing={editing}
                  otherSubjects={otherSubjects}
                  selectedSubjectIds={selectedCrossPostSubjectIds}
                  onChange={setSelectedCrossPostSubjectIds}
                />
              ) : null}
              {editing ? (
                <ChangeSummary
                  value={changeSummary}
                  onChange={setChangeSummary}
                  onAutoDraft={handleAutoDraft}
                  isDrafting={autoDraft.isPending}
                />
              ) : null}
              <div className="signal-inset border-l-2 border-l-primary p-4 text-sm text-muted-foreground">
                <Check className="mr-2 inline size-4 text-primary" />
                {editing
                  ? selectedCrossPostSubjectIds.length > 0
                    ? `Saves a new public version and syncs updates to ${selectedCrossPostSubjectIds.length} other subject(s).`
                    : "Saves a new public version."
                  : selectedCrossPostSubjectIds.length > 0
                  ? `Publishes and cross-posts to ${selectedCrossPostSubjectIds.length} other subject(s).`
                  : "Saves a private draft."}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={backToList}>
                  Cancel
                </Button>
                <Button disabled={busy}>
                  <Send className="size-4" />
                  {editing
                    ? selectedCrossPostSubjectIds.length > 0
                      ? `Save & Sync (${selectedCrossPostSubjectIds.length + 1})`
                      : "Save new version"
                    : selectedCrossPostSubjectIds.length > 0
                    ? `Publish & Cross-Post (${selectedCrossPostSubjectIds.length + 1})`
                    : "Save draft"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </section>
    </DashboardLayout>
  );




  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl space-y-6 pb-16">
        <WorkspacePageHeader
          eyebrow="Class Content Studio"
          title={tab.label}
          description={tab.description}
          back={
            <Link
              href={subjectId && subjectId !== "NaN" ? `/app/subjects/${subjectId}` : "/app/subjects"}
              className="signal-action inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to Subject
            </Link>
          }
          action={
            kind === "notes" ? (
              <Button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("supersec_open_new_note"))}
                className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 h-10"
              >
                <StickyNote className="mr-1.5 size-4" />
                New Note
              </Button>
            ) : kind === "snippets" ? (
              <Button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("supersec_open_new_snippet"))}
                className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 h-10"
              >
                <Sparkles className="mr-1.5 size-4" />
                New Snippet
              </Button>
            ) : (
              <Button asChild className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/25 h-10">
                <Link href={`/app/subjects/${subjectId}/${kind}/new`}>
                  <Send className="mr-1.5 size-4" />
                  New {tab.singular}
                </Link>
              </Button>
            )
          }
        />

        {/* Tab switcher */}
        <div
          role="tablist"
          aria-label="Subject Workspaces"
          className="signal-inset flex flex-wrap sm:flex-nowrap gap-1.5 p-1.5 rounded-2xl bg-secondary/50 border border-border/80"
        >
          {tabs.map(t => {
            const TabIcon = t.icon;
            const isActive = t.key === kind;
            return (
              <Link
                key={t.key}
                role="tab"
                id={`tab-${t.key}`}
                aria-selected={isActive}
                aria-controls={`panel-${t.key}`}
                href={`/app/subjects/${subjectId}/${t.key}`}
                className={`signal-action inline-flex min-h-11 flex-1 min-w-[5.5rem] sm:min-w-0 items-center justify-center gap-1.5 sm:gap-2.5 rounded-xl px-2.5 sm:px-3 text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <TabIcon className={`size-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="inline sm:hidden">{t.singular.split(" ")[0]}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    isActive ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {countByKind[t.key]}
                </span>
              </Link>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id={`panel-${kind}`}
          aria-labelledby={`tab-${kind}`}
          tabIndex={0}
          className="outline-none"
        >
          <ErrorBoundary>
            {kind === "notes" ? (
              <NotesWorkspaceCard initialSubjectId={subjectId} embedded />
            ) : kind === "snippets" ? (
              <MessageTemplatesCard initialSubjectId={subjectId} embedded />
            ) : (
              <SignalContentList
                kind={kind}
                subjectId={subjectId}
                subjectCode={currentSubject?.code}
                pendingAction={pendingContentAction ?? { type: "publish", id: -1 }}
                onDelete={item => setItemToDelete({ id: item.id, title: kind === "questions" ? item.question : item.title })}
                items={
                  kind === "announcements"
                    ? announcements.data
                    : kind === "resources"
                    ? resources.data
                    : questions.data
                }
                loading={
                  kind === "announcements"
                    ? announcements.isLoading
                    : kind === "resources"
                    ? resources.isLoading
                    : questions.isLoading
                }
                onPublish={id =>
                  kind === "announcements"
                    ? publishAnnouncement.mutate({ id, summary: "Published by the class secretary" })
                    : kind === "resources"
                    ? publishResource.mutate({ id, summary: "Published by the class secretary" })
                    : publishQuestion.mutate({
                        id,
                        summary: "Published by the class secretary",
                        official: Boolean(questions.data?.find(item => String(item.id) === String(id))?.isOfficial),
                      })
                }
                onArchive={id =>
                  kind === "announcements"
                    ? archiveAnnouncement.mutate({ id })
                    : kind === "resources"
                    ? archiveResource.mutate({ id })
                    : archiveQuestion.mutate({ id })
                }
                onRestore={id =>
                  kind === "announcements"
                    ? restoreAnnouncement.mutate({ id })
                    : kind === "resources"
                    ? restoreResource.mutate({ id })
                    : restoreQuestion.mutate({ id })
                }
                busy={
                  publishAnnouncement.isPending ||
                  publishResource.isPending ||
                  publishQuestion.isPending ||
                  archiveAnnouncement.isPending ||
                  archiveResource.isPending ||
                  archiveQuestion.isPending ||
                  restoreAnnouncement.isPending ||
                  restoreResource.isPending ||
                  restoreQuestion.isPending ||
                  crossPostAnnouncement.isPending ||
                  crossPostResource.isPending ||
                  crossPostQuestion.isPending
                }
                onCrossPost={openCrossPostModal}
              />
            )}
          </ErrorBoundary>
        </div>

        <CrossPostModal
          isOpen={Boolean(crossPostTargetItem)}
          onClose={() => setCrossPostTargetItem(null)}
          itemTitle={crossPostTargetItem?.title ?? ""}
          kind={crossPostTargetItem?.kind ?? "announcements"}
          otherSubjects={otherSubjects}
          selectedSubjectIds={modalTargetSubjectIds}
          onToggleSubject={id => {
            setModalTargetSubjectIds(prev =>
              prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
            );
          }}
          onSelectAll={() => {
            const allSelected = otherSubjects.length > 0 && otherSubjects.every(s => modalTargetSubjectIds.includes(s.id) || modalTargetSubjectIds.includes(s.publicId));
            setModalTargetSubjectIds(allSelected ? [] : otherSubjects.map(s => s.id));
          }}
          publishDirectly={modalPublishDirectly}
          onTogglePublishDirectly={setModalPublishDirectly}
          onConfirm={handleExecuteCrossPost}
          isPending={crossPostAnnouncement.isPending || crossPostResource.isPending || crossPostQuestion.isPending}
        />

        <AlertDialog open={Boolean(itemToDelete)} onOpenChange={open => !open && setItemToDelete(null)}>
          <AlertDialogContent className="rounded-2xl sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-bold">
                Delete {tab.singular} Permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
                Are you sure you want to permanently delete &ldquo;{itemToDelete?.title}&rdquo;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="rounded-xl text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </DashboardLayout>
  );
}

function AnnouncementFields({
  title,
  body,
  previewOpen,
  onTitleChange,
  onBodyChange,
  onPreview,
}: {
  title: string;
  body: string;
  previewOpen: boolean;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onPreview: () => void;
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Label htmlFor="announcement-title" className="text-xs font-bold uppercase tracking-wider text-foreground">
            Announcement Title *
          </Label>
          <AiTextAssist
            value={title}
            onApply={onTitleChange}
            target="announcement"
            context="Suggest or polish a concise, eye-catching headline for a class announcement."
          />
        </div>
        <Input
          id="announcement-title"
          required
          value={title}
          onChange={event => onTitleChange(event.target.value)}
          placeholder="State the update clearly (e.g. Midterm Exam Schedule & Guidelines)"
          className="rounded-xl min-h-12 h-12 sm:h-11 text-xs sm:text-sm"
        />
      </div>
      <div>
        <Label htmlFor="announcement-body" className="text-xs font-bold uppercase tracking-wider text-foreground">
          Announcement Body *
        </Label>
        <AnnouncementEditor
          id="announcement-body"
          label="Announcement body"
          required
          value={body}
          onChange={onBodyChange}
          aiTarget="announcement"
          aiContext={title || "Class announcement"}
          placeholder="Write the details of the announcement here. Use the formatting toolbar for bold text, lists, quotes, and links."
          helperText="Use headings and bullet points for important deadlines so classmates do not miss them."
          minHeightClassName="min-h-56"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Preview before publishing to see exactly what students see.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPreview}
          className="rounded-xl min-h-10 sm:min-h-9"
        >
          <Eye className="mr-1.5 size-3.5 text-primary" />
          {previewOpen ? "Hide Preview" : "Live Preview"}
        </Button>
      </div>
      {previewOpen ? (
        <div className="rounded-2xl border border-primary/20 bg-card p-4 sm:p-5 shadow-sm space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Live Public Preview</p>
          <h3 className="text-lg font-bold text-foreground">{title || "Untitled Announcement"}</h3>
          <AnnouncementPreview body={body || "Announcement text will appear here."} />
        </div>
      ) : null}
    </>
  );
}

function ResourceFields({
  title,
  body,
  category,
  resourceType,
  destinationUrl,
  onTitleChange,
  onBodyChange,
  onCategoryChange,
  onResourceTypeChange,
  onDestinationUrlChange,
}: {
  title: string;
  body: string;
  category: string;
  resourceType: string;
  destinationUrl: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onResourceTypeChange: (value: string) => void;
  onDestinationUrlChange: (value: string) => void;
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Label htmlFor="resource-title" className="text-xs font-bold uppercase tracking-wider text-foreground">
            Resource Title *
          </Label>
          <AiTextAssist
            value={title}
            onApply={onTitleChange}
            target="resource_description"
            context="Suggest or polish a clean resource title (e.g. Chapter 4 Slide Deck, CBA Membership Form)."
          />
        </div>
        <Input
          id="resource-title"
          required
          value={title}
          onChange={event => onTitleChange(event.target.value)}
          placeholder="e.g. Midterm Syllabus & Reference Resources"
          className="rounded-xl min-h-12 h-12 sm:h-11 text-xs sm:text-sm"
        />
      </div>
      <div>
        <Label htmlFor="resource-description" className="text-xs font-bold uppercase tracking-wider text-foreground">
          Description
        </Label>
        <AnnouncementEditor
          id="resource-description"
          label="Resource description"
          required
          value={body}
          onChange={onBodyChange}
          aiTarget="resource_description"
          aiContext={`${title || "Resource"}${category ? ` · ${category}` : ""}${resourceType ? ` · ${resourceType}` : ""}`}
          placeholder="Explain what this material is for and instructions on how to use it."
          helperText="Use headings, lists, quotes, and links to make it easy to scan."
          minHeightClassName="min-h-44"
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category Tag" htmlFor="resource-category">
          <Input
            id="resource-category"
            required
            value={category}
            onChange={event => onCategoryChange(event.target.value)}
            placeholder="e.g. Syllabus, Slide Deck, Quiz Link"
            className="rounded-xl min-h-12 h-12 sm:h-11 text-xs sm:text-sm"
          />
        </Field>
        <Field label="Platform / Source" htmlFor="resource-source-type">
          <select
            id="resource-source-type"
            value={resourceType}
            onChange={event => onResourceTypeChange(event.target.value)}
            className="min-h-12 h-12 sm:h-11 w-full rounded-xl border border-input bg-card px-3 text-xs sm:text-sm font-semibold text-foreground"
          >
            <option value="External link">External link</option>
            <option value="File attachment">File attachment</option>
            <option value="Google Drive">Google Drive</option>
            <option value="Google Forms">Google Forms</option>
            <option value="Facebook">Facebook</option>
            <option value="Zoom">Zoom</option>
            <option value="Image">Image</option>
          </select>
        </Field>
      </div>
      <Field label="Resource Destination Link" htmlFor="resource-destination">
        <Input
          id="resource-destination"
          required
          type="url"
          inputMode="url"
          value={destinationUrl}
          onChange={event => onDestinationUrlChange(event.target.value)}
          placeholder="https://"
          className="rounded-xl min-h-12 h-12 sm:h-11 text-xs sm:text-sm"
        />
        <p className="text-xs text-muted-foreground mt-1">This is the safe link classmates open. Uploading a file fills it automatically.</p>
      </Field>
    </>
  );
}

function QuestionFields({
  question,
  answer,
  tagsText,
  isOfficial,
  changeSummary,
  editing,
  onQuestionChange,
  onAnswerChange,
  onTagsChange,
  onOfficialChange,
  onSummaryChange,
  onAutoDraft,
  isDrafting,
}: {
  question: string;
  answer: string;
  tagsText: string;
  isOfficial: boolean;
  changeSummary: string;
  editing: boolean;
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
  onTagsChange: (value: string) => void;
  onOfficialChange: (value: boolean) => void;
  onSummaryChange: (value: string) => void;
  onAutoDraft?: () => void;
  isDrafting?: boolean;
}) {
  return (
    <>
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <Label htmlFor="question-title" className="text-xs font-bold uppercase tracking-wider text-foreground">
            Repeated Class Question *
          </Label>
          <AiTextAssist
            value={question}
            onApply={onQuestionChange}
            target="question_answer"
            context="Suggest or polish a clear question that students repeatedly ask."
          />
        </div>
        <Textarea
          id="question-title"
          required
          value={question}
          onChange={event => onQuestionChange(event.target.value)}
          className="min-h-24 rounded-xl text-xs sm:text-sm"
          placeholder="e.g. When is the deadline for project submission and where do we submit?"
        />
      </div>
      <QuestionAnswerControls
        question={question}
        answer={answer}
        onAnswerChange={onAnswerChange}
        tagsText={tagsText}
        onTagsTextChange={onTagsChange}
        isOfficial={isOfficial}
        onOfficialChange={onOfficialChange}
        changeSummary={changeSummary}
        onChangeSummaryChange={onSummaryChange}
        showChangeSummary={false}
        onAutoDraft={onAutoDraft}
        isDrafting={isDrafting}
      />
    </>
  );
}

function AttachmentTile({
  asset,
  label,
  image,
  onRemove,
}: {
  asset: AttachmentAsset;
  label: string;
  image: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-h-16 items-center gap-3 p-3">
        {image ? (
          <img src={asset.url} alt={asset.altText ?? ""} className="size-11 rounded-lg object-cover border border-border" />
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
            <FileText className="size-4.5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs sm:text-sm font-bold text-foreground">{asset.originalName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {label} · {formatFileSize(asset.byteSize)}
          </p>
        </div>
        <button
          type="button"
          aria-label={`Remove ${asset.originalName}`}
          onClick={onRemove}
          className="signal-action grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function UploadSlot({
  label,
  detail,
  accept,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  accept: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label
      className={`signal-action flex min-h-24 cursor-pointer flex-col justify-center rounded-xl border border-dashed border-border bg-secondary/30 p-4 transition-all ${
        disabled ? "pointer-events-none opacity-60" : "hover:border-primary/65 hover:bg-secondary/60"
      }`}
    >
      <span className="flex items-center gap-2 text-xs sm:text-sm font-bold text-foreground">
        <Upload className="size-4 text-primary" />
        {disabled ? "Uploading file…" : label}
      </span>
      <span className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{detail}</span>
      <input type="file" accept={accept} className="sr-only" disabled={disabled} onChange={onChange} />
    </label>
  );
}

function MediaFields({
  kind,
  socialAsset,
  attachmentAssets,
  imageAltText,
  busy,
  onImageAltTextChange,
  onUpload,
  onRemoveSocial,
  onRemoveAttachment,
}: {
  kind: ContentKind;
  socialAsset: AttachmentAsset | null;
  attachmentAssets: AttachmentAsset[];
  imageAltText: string;
  busy: boolean;
  onImageAltTextChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>, target: "social" | "attachment") => void;
  onRemoveSocial: () => void;
  onRemoveAttachment: (assetId: number | string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border/80 bg-secondary/30 p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Paperclip className="size-4" />
        </span>
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-foreground">Attachments &amp; Media Assets</h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            PNG, JPG, WebP, PDF, DOCX, XLSX, and TXT files up to 8 MB are supported for safe student viewing.
          </p>
        </div>
      </div>

      <Field label="Messenger Preview Card Image Alt (optional)" htmlFor="attachment-image-description">
        <Input
          id="attachment-image-description"
          value={imageAltText}
          onChange={event => onImageAltTextChange(event.target.value)}
          placeholder="Describe the preview card image for accessibility"
          className="rounded-xl"
        />
      </Field>

      <div className="mt-3">
        {socialAsset ? (
          <AttachmentTile asset={socialAsset} label="Messenger Preview Image" image onRemove={onRemoveSocial} />
        ) : (
          <UploadSlot
            label="Attach Messenger Preview Card"
            detail="Optional custom image for Facebook &amp; Messenger link cards."
            accept={assetAccepts(PUBLIC_IMAGE_MIME_TYPES)}
            disabled={busy}
            onChange={event => onUpload(event, "social")}
          />
        )}
      </div>

      {kind === "resources" ? (
        <div className="mt-4 border-t border-border/60 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-foreground">Attachments</p>
              <p className="text-[11px] text-muted-foreground">Attach up to 6 files per resource.</p>
            </div>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {attachmentAssets.length}/6
            </span>
          </div>

          <div className="space-y-2">
            {attachmentAssets.map(asset => (
              <AttachmentTile
                key={asset.id}
                asset={asset}
                label="Attachment"
                image={false}
                onRemove={() => onRemoveAttachment(asset.id)}
              />
            ))}
          </div>

          {attachmentAssets.length < 6 ? (
            <UploadSlot
              label="Upload File"
              detail="PDF, DOCX, XLSX, PPTX, or CSV file."
              accept={assetAccepts(RESOURCE_FILE_MIME_TYPES)}
              disabled={busy}
              onChange={event => onUpload(event, "attachment")}
            />
          ) : (
            <p className="rounded-xl border border-border/80 bg-secondary/40 p-3 text-center text-xs font-semibold text-muted-foreground">
              Maximum 6 attachments reached. Remove an attachment to upload another.
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ChangeSummary({
  value,
  onChange,
  onAutoDraft,
  isDrafting,
}: {
  value: string;
  onChange: (value: string) => void;
  onAutoDraft?: () => void;
  isDrafting?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="public-change-summary" className="text-xs font-bold uppercase tracking-wider text-foreground">
          Version Change Log Note (optional)
        </Label>
        {onAutoDraft ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAutoDraft}
            disabled={isDrafting}
            className="h-7 gap-1.5 px-2.5 text-xs text-primary font-medium hover:bg-primary/10 transition-colors"
          >
            {isDrafting ? <Loader2 className="size-3.5 animate-spin text-primary" /> : <Sparkles className="size-3.5 text-primary" />}
            {isDrafting ? "Drafting..." : "Auto-Draft with AI"}
          </Button>
        ) : null}
      </div>
      <Input
        id="public-change-summary"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="e.g. Corrected room number and added syllabus attachment"
        className="rounded-xl"
      />
      <p className="text-[11px] text-muted-foreground mt-0.5">Shown in the public Version History sidebar. Left blank, AI will auto-draft on save.</p>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-bold uppercase tracking-wider text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function IconPlaceholder({ kind }: { kind: ContentKind }) {
  const Icon = kind === "announcements" ? Megaphone : kind === "resources" ? BookOpen : CircleHelp;
  return <Icon className="mx-auto size-8 text-primary opacity-60" />;
}

function CrossPostFormSection({
  otherSubjects,
  selectedSubjectIds,
  onChange,
  isEditing,
}: {
  otherSubjects: Array<{ id: number; publicId: string; code: string; name: string; colorAccent?: string }>;
  selectedSubjectIds: Array<number | string>;
  onChange: (ids: Array<number | string>) => void;
  isEditing?: boolean;
}) {
  if (!otherSubjects.length) return null;
  const allSelected =
    otherSubjects.length > 0 &&
    otherSubjects.every(s => selectedSubjectIds.includes(s.id) || selectedSubjectIds.includes(s.publicId));

  const toggleSubject = (subId: number | string) => {
    if (selectedSubjectIds.includes(subId)) {
      onChange(selectedSubjectIds.filter(id => id !== subId));
    } else {
      onChange([...selectedSubjectIds, subId]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(otherSubjects.map(s => s.id));
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-secondary/25 p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
            <Layers className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              {isEditing ? "Sync Updates to Other Subjects" : "Cross-Post to Other Subjects"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isEditing
                ? "Synchronize these updates across matching content on other subjects without creating duplicates."
                : "Post this content across other subject desks in one go without creating duplicates."}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleAll}
          className="h-7 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10"
        >
          {allSelected ? "Deselect All" : "Select All Other Subjects"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {otherSubjects.map(sub => {
          const isSelected = selectedSubjectIds.includes(sub.id) || selectedSubjectIds.includes(sub.publicId);
          return (
            <div
              key={sub.id}
              onClick={() => toggleSubject(sub.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                isSelected
                  ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-sm"
                  : "border-border bg-card/60 text-muted-foreground hover:border-border hover:bg-secondary/50"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                readOnly
                className="size-4 rounded border-border text-primary focus:ring-primary pointer-events-none"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-foreground">{sub.code}</span>
                  {sub.colorAccent && (
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: sub.colorAccent }}
                    />
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{sub.name}</p>
              </div>
            </div>
          );
        })}
      </div>

      {selectedSubjectIds.length > 0 && (
        <p className="text-[11px] font-semibold text-primary flex items-center gap-1.5">
          <Check className="size-3.5" />
          Will also auto-publish across {selectedSubjectIds.length} other subject{selectedSubjectIds.length === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}

function CrossPostModal({
  isOpen,
  onClose,
  itemTitle,
  kind,
  otherSubjects,
  selectedSubjectIds,
  onToggleSubject,
  onSelectAll,
  publishDirectly,
  onTogglePublishDirectly,
  onConfirm,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  kind: ContentKind;
  otherSubjects: Array<{ id: number; publicId: string; code: string; name: string; colorAccent?: string }>;
  selectedSubjectIds: Array<number | string>;
  onToggleSubject: (id: number | string) => void;
  onSelectAll: () => void;
  publishDirectly: boolean;
  onTogglePublishDirectly: (val: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const singular = tabs.find(t => t.key === kind)?.singular || "Item";
  const allSelected =
    otherSubjects.length > 0 &&
    otherSubjects.every(s => selectedSubjectIds.includes(s.id) || selectedSubjectIds.includes(s.publicId));

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-xl bg-card/95 backdrop-blur-xl border-border/80 p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Layers className="size-5 text-primary" />
            Cross-Post {singular} to Other Subjects
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Source {singular}</p>
            <p className="text-sm font-bold text-foreground line-clamp-2">{itemTitle}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground">
                Select Destination Subjects ({selectedSubjectIds.length}/{otherSubjects.length})
              </Label>
              {otherSubjects.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onSelectAll}
                  className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>

            {otherSubjects.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                No other active subjects available to cross-post to.
              </p>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {otherSubjects.map(sub => {
                  const isSelected = selectedSubjectIds.includes(sub.id) || selectedSubjectIds.includes(sub.publicId);
                  return (
                    <div
                      key={sub.id}
                      onClick={() => onToggleSubject(sub.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition-all ${
                        isSelected
                          ? "border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40 shadow-sm"
                          : "border-border bg-card/60 text-muted-foreground hover:border-border hover:bg-secondary/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        readOnly
                        className="size-4 rounded border-border text-primary focus:ring-primary pointer-events-none"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-foreground">{sub.code}</span>
                        <span className="ml-2 text-xs text-muted-foreground truncate">{sub.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/70">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground">
              <input
                type="checkbox"
                checked={publishDirectly}
                onChange={e => onTogglePublishDirectly(e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-primary"
              />
              <span>Auto-publish in target subjects (recommended)</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/80">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isPending || selectedSubjectIds.length === 0}
              className="rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            >
              {isPending ? "Cross-Posting…" : `Cross-Post to ${selectedSubjectIds.length} Subject${selectedSubjectIds.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SignalContentList({
  kind,
  subjectId,
  items,
  loading,
  onPublish,
  onArchive,
  onRestore,
  onDelete,
  onCrossPost,
  pendingAction,
  subjectCode,
}: LocalContentListProps & { pendingAction: ContentRowAction }) {
  const list = items ?? [];
  const singular = tabs.find(tab => tab.key === kind)!.singular;
  const copy = async (path: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    toast.success("Public view-only link copied for Messenger");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="signal-kicker">Saved {kind}</p>
          <h2 className="signal-heading text-lg font-bold mt-0.5">Class Records</h2>
        </div>
        <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground border border-border">
          {list.length} {list.length === 1 ? singular : kind}
        </span>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="signal-inset py-12 text-center text-xs text-muted-foreground rounded-2xl animate-pulse">
            Loading {kind}…
          </div>
        ) : null}

        {list.map(item => {
          const state = item.publishState as "draft" | "published" | "archived";
          const title = kind === "questions" ? item.question : item.title;
          const detail =
            kind === "announcements"
              ? item.body
              : kind === "resources"
              ? `${item.category} · ${item.resourceType}${
                  item.attachments?.length ? ` · ${item.attachments.length} file${item.attachments.length === 1 ? "" : "s"}` : ""
                }`
              : item.answer;
          const sharePath =
            kind === "announcements"
              ? `/a/${item.publicId}`
              : kind === "resources"
              ? `/r/${item.publicId}`
              : `/q/${item.publicId}`;
          const action = pendingAction.id === item.id ? pendingAction.type : null;
          const rowBusy = Boolean(pendingAction.id && pendingAction.id !== -1 && pendingAction.id !== "");

          return (
            <article
              key={item.id}
              className="signal-record-card p-5 sm:p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/40 transition-all space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-foreground truncate">{title}</h3>
                    {kind === "questions" && item.isOfficial ? (
                      <span className="glow-badge-orange text-[10px] px-2 py-0.5 rounded-full font-bold">
                        Official Answer
                      </span>
                    ) : null}
                    {kind === "resources" && item.category ? (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {item.category}
                      </span>
                    ) : null}
                  </div>
                  {/* Card Description Hiding: Purge body description snippets from cards for uncluttered studio lists */}
                </div>

                <RecordStatusBadge tone={state === "published" ? "published" : state === "archived" ? "archived" : "draft"}>
                  {state}
                </RecordStatusBadge>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/70 text-xs">
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground font-mono text-[11px]">
                  <span>Version {item.version}</span>
                  {kind === "resources" && item.destinationUrl ? (
                    <a
                      href={item.destinationUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-primary hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      Destination Link
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {state !== "archived" ? (
                    <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
                      <Link href={`/app/subjects/${subjectId}/${kind}/edit/${item.id}`}>
                        <Pencil className="mr-1.5 size-3.5" />
                        Edit
                      </Link>
                    </Button>
                  ) : null}

                  {state !== "archived" && onCrossPost ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={rowBusy}
                      onClick={() => onCrossPost(item)}
                      className="rounded-xl text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <Layers className="mr-1.5 size-3.5" />
                      Cross-Post
                    </Button>
                  ) : null}

                  {state === "draft" ? (
                    <Button
                      size="sm"
                      aria-busy={action === "publish" || undefined}
                      disabled={rowBusy}
                      onClick={() => onPublish(item.id)}
                      className="rounded-xl font-bold bg-primary text-primary-foreground shadow-sm shadow-primary/20 text-xs"
                    >
                      {action === "publish" ? "Publishing…" : "Publish"}
                    </Button>
                  ) : null}

                  {state === "published" ? (
                    <>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs font-bold text-primary border-primary/30 hover:bg-primary/10"
                          >
                            <Share2 className="mr-1.5 size-3.5" />
                            Messenger Card
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl sm:max-w-3xl w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden bg-card border-border">
                          <DialogHeader className="p-4 sm:p-5 border-b border-border/80 sticky top-0 bg-card z-10 shrink-0">
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold text-foreground">
                              <Sparkles className="size-5 text-primary" />
                              Messenger Link Card &amp; Fast Share
                            </DialogTitle>
                          </DialogHeader>
                          <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1">
                            <SocialPreviewCard
                              type={kind === "announcements" ? "announcement" : kind === "resources" ? "resource" : "question"}
                              title={title || item.title || item.question || "Class Update"}
                              subjectCode={item.subjectCode || item.subject?.code || subjectCode}
                              date={toSafeIsoString(item.publishedAt) || toSafeIsoString(item.createdAt)}
                              description={detail || ""}
                              publicUrl={`${typeof window !== "undefined" ? window.location.origin : "https://supersec.mjbalubar.tech"}${sharePath || ""}`}
                              version={item.version || 1}
                              category={kind === "resources" ? item.category : undefined}
                              coverUrl={
                                item.socialAsset?.url ||
                                item.coverAsset?.url ||
                                item.attachments?.[0]?.url ||
                                (item.socialPreviewMediaAssetId ? `/api/media/${item.socialPreviewMediaAssetId}` : undefined)
                              }
                            />
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button asChild size="sm" variant="outline" className="rounded-xl text-xs font-semibold">
                        <a href={sharePath} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 size-3.5" />
                          View Shared
                        </a>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(sharePath)}
                        className="rounded-xl text-xs font-semibold text-primary hover:bg-primary/10"
                      >
                        <Copy className="mr-1.5 size-3.5" />
                        Copy Link
                      </Button>
                    </>
                  ) : null}

                  {state === "archived" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-busy={action === "restore" || undefined}
                      disabled={rowBusy}
                      onClick={() => onRestore(item.id)}
                      className="rounded-xl text-xs font-semibold"
                    >
                      <ArchiveRestore className="mr-1.5 size-3.5" />
                      {action === "restore" ? "Restoring…" : "Restore as draft"}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-busy={action === "archive" || undefined}
                      disabled={rowBusy}
                      onClick={() => onArchive(item.id)}
                      className="rounded-xl text-xs text-muted-foreground hover:text-destructive"
                      title="Move to Archive"
                    >
                      <Archive className="mr-1.5 size-3.5" />
                      {action === "archive" ? "Archiving…" : "Archive"}
                    </Button>
                  )}

                  {onDelete ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-busy={action === "delete" || undefined}
                      disabled={rowBusy}
                      onClick={() => onDelete(item)}
                      className="rounded-xl text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title="Delete permanently"
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}

        {!loading && !list.length ? (
          <div className="signal-panel p-10 text-center rounded-2xl border-t-2 border-primary space-y-3">
            <IconPlaceholder kind={kind} />
            <h3 className="text-sm font-bold text-foreground">No {kind} created yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Draft your first {singular.toLowerCase()} to keep your class updated and organized.
            </p>
            <Button asChild className="rounded-xl font-bold mt-2">
              <Link href={`/app/subjects/${subjectId}/${kind}/new`}>
                <Send className="mr-1.5 size-3.5" />
                Create {singular}
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

