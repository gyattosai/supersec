import React, { useRef, useState, DragEvent, ClipboardEvent } from "react";
import {
  Paperclip,
  Trash2,
  FileText,
  Download,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  formatFileSize,
  isPublicImageMimeType,
  MAX_PUBLIC_UPLOAD_BYTES,
  isSupportedPublicUploadMimeType,
} from "@shared/mediaPolicy";
import type { NoteAttachment } from "@shared/notes";

export interface RichNoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  attachments: NoteAttachment[];
  onAttachmentsChange: (attachments: NoteAttachment[]) => void;
  placeholder?: string;
  minHeightClassName?: string;
  subjectContext?: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function RichNoteEditor({
  content,
  onChange,
  attachments,
  onAttachmentsChange,
  placeholder = "Write your notes, lecture reviewer, meeting minutes, or study references with rich WYSIWYG formatting...",
  minHeightClassName = "min-h-[260px]",
  subjectContext,
}: RichNoteEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const uploadMedia = trpc.foundation.media.upload.useMutation();

  // Upload file helper
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const newAttachments: NoteAttachment[] = [];

    for (const file of fileArray) {
      if (file.size > MAX_PUBLIC_UPLOAD_BYTES) {
        toast.error(`"${file.name}" is larger than 8 MB limit.`);
        continue;
      }

      if (!isSupportedPublicUploadMimeType(file.type)) {
        toast.error(`"${file.name}" has an unsupported file format.`);
        continue;
      }

      try {
        const isImage = isPublicImageMimeType(file.type);
        const base64Data = await fileToDataUrl(file);

        const uploaded = await uploadMedia.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          base64Data,
          altText: isImage ? file.name : null,
          publicUse: true,
        });

        const attachment: NoteAttachment = {
          id: String(uploaded.id),
          name: uploaded.originalName || file.name,
          url: uploaded.url,
          mimeType: uploaded.mimeType || file.type,
          byteSize: uploaded.byteSize || file.size,
          type: isImage ? "image" : "file",
          uploadedAt: new Date().toISOString(),
        };

        newAttachments.push(attachment);

        // If it's an image, also auto-insert markdown image reference into content
        if (isImage) {
          onChange(`${content ? `${content}\n\n` : ""}![${file.name}](${uploaded.url})\n`);
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast.error(`Failed to upload "${file.name}".`);
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
      toast.success(`Attached ${newAttachments.length} file(s) successfully!`);
    }

    setIsUploading(false);
  };

  // Drag & drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste image handler
  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      handleUploadFiles(files);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter(a => a.id !== id));
    toast.success("Attachment removed.");
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`rounded-2xl border transition-all ${
        isDragOver
          ? "border-primary bg-primary/5 ring-2 ring-primary/40"
          : "border-border/80 bg-card shadow-xs"
      }`}
    >
      {/* WYSIWYG Editor Core */}
      <WysiwygEditor
        value={content}
        onChange={onChange}
        placeholder={placeholder}
        minHeightClassName={minHeightClassName}
        aiTarget="student_note"
        aiContext={subjectContext}
        onAttachClick={() => fileInputRef.current?.click()}
        isAttaching={isUploading}
        className="border-none shadow-none rounded-b-none"
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
        onChange={e => e.target.files && handleUploadFiles(e.target.files)}
        className="hidden"
      />

      {/* Upload Dropzone Footer Indicator */}
      {isDragOver && (
        <div className="p-4 text-center border-t border-primary/30 bg-primary/10 text-primary text-xs font-bold animate-pulse">
          Drop files or images here to attach immediately...
        </div>
      )}

      {/* Attachment Gallery & File Chips */}
      {attachments.length > 0 && (
        <div className="border-t border-border/80 bg-secondary/20 p-3.5 rounded-b-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Paperclip className="size-3 text-primary" /> Attachments & References ({attachments.length})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {attachments.map(att => (
              <div
                key={att.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border bg-card shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {att.type === "image" ? (
                    <div className="size-9 rounded-lg overflow-hidden shrink-0 border border-border bg-secondary">
                      <img src={att.url} alt={att.name} className="size-full object-cover" />
                    </div>
                  ) : (
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      <FileText className="size-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{att.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      {formatFileSize(att.byteSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="size-7 rounded-lg text-muted-foreground hover:text-primary"
                    title="Open / Download"
                  >
                    <a href={att.url} target="_blank" rel="noreferrer">
                      <Download className="size-3.5" />
                    </a>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove attachment"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
