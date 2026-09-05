import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  UserPlus,
  CalendarCheck,
  Megaphone,
  HelpCircle,
  BookOpen,
  Copy,
  ExternalLink,
  Plus,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

export interface SubjectQuickActionsProps {
  subjectId: string | number;
  publicId?: string;
  publishState?: "draft" | "published";
  compact?: boolean;
}

export function SubjectQuickActions({
  subjectId,
  publicId,
  publishState = "draft",
  compact = false,
}: SubjectQuickActionsProps) {
  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!publicId) {
      toast.error("Public page link is not yet available for this subject");
      return;
    }
    const url = `${window.location.origin}/s/${publicId}`;
    navigator.clipboard.writeText(url);
    toast.success("Public subject page link copied to clipboard!");
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`flex flex-col gap-2.5 pt-3 border-t border-border/70 ${
        compact ? "text-xs" : ""
      }`}
      onClick={e => e.stopPropagation()}
    >
      {/* 1. Create Group */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Plus className="size-3 text-primary" /> Create
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold hover:border-primary/50 hover:bg-primary/5"
            onClick={handleLinkClick}
          >
            <Link href={`/app/subjects/${subjectId}/students`}>
              <UserPlus className="mr-1.5 size-3 text-sky-400" />
              New Student
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold hover:border-primary/50 hover:bg-primary/5"
            onClick={handleLinkClick}
          >
            <Link href={`/app/subjects/${subjectId}/attendance`}>
              <CalendarCheck className="mr-1.5 size-3 text-amber-400" />
              New Attendance
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold hover:border-primary/50 hover:bg-primary/5"
            onClick={handleLinkClick}
          >
            <Link href={`/app/subjects/${subjectId}/announcements/new`}>
              <Megaphone className="mr-1.5 size-3 text-amber-500" />
              New Announcement
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold hover:border-primary/50 hover:bg-primary/5"
            onClick={handleLinkClick}
          >
            <Link href={`/app/subjects/${subjectId}/questions/new`}>
              <HelpCircle className="mr-1.5 size-3 text-purple-400" />
              New Q&amp;A
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 px-2.5 rounded-lg text-xs font-semibold hover:border-primary/50 hover:bg-primary/5"
            onClick={handleLinkClick}
          >
            <Link href={`/app/subjects/${subjectId}/resources/new`}>
              <BookOpen className="mr-1.5 size-3 text-emerald-400" />
              New Resource
            </Link>
          </Button>
        </div>
      </div>

      {/* 2. Copy / View Group */}
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <Share2 className="size-3 text-emerald-400" /> Copy / View
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {publicId ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCopyLink}
                className="h-7 px-2.5 rounded-lg text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10"
              >
                <Copy className="mr-1.5 size-3 text-primary" />
                Public Subject Page Link
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-7 px-2.5 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/10"
                onClick={handleLinkClick}
              >
                <a href={`/s/${publicId}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 size-3" />
                  View Public Subject Page
                </a>
              </Button>
            </>
          ) : (
            <span className="text-[11px] text-muted-foreground italic">
              Public link available after publishing
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
