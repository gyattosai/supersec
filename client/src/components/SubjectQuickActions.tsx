import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  UserPlus,
  Users,
  CalendarCheck,
  Megaphone,
  HelpCircle,
  BookOpen,
  Copy,
  ExternalLink,
  ArrowRight,
  ChevronDown,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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

  const handleStopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/70 ${
        compact ? "text-xs" : ""
      }`}
      onClick={handleStopPropagation}
    >
      {/* Primary Workspace CTA */}
      <Button
        asChild
        size="sm"
        className="h-8 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
        onClick={handleStopPropagation}
      >
        <Link href={`/app/subjects/${subjectId}`}>
          Enter Workspace <ArrowRight className="ml-1.5 size-3.5" />
        </Link>
      </Button>

      {/* Unified Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={handleStopPropagation}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 rounded-xl text-xs font-semibold border-border/80 text-foreground hover:bg-secondary"
          >
            Actions
            <ChevronDown className="size-3 ml-1.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onClick={handleStopPropagation}>
          {/* Section 1: Live Sessions */}
          <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Live Sessions
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/attendance`}
              className="flex items-center gap-2 cursor-pointer text-amber-400 focus:text-amber-400"
              onClick={handleStopPropagation}
            >
              <Zap className="size-4 text-amber-400" />
              <span>Take Attendance / Roll Call</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Section 2: Roster & Students */}
          <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Roster &amp; Students
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/students`}
              className="flex items-center gap-2 cursor-pointer text-sky-400 focus:text-sky-400"
              onClick={handleStopPropagation}
            >
              <Users className="size-4 text-sky-400" />
              <span>Master Roster</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/students`}
              className="flex items-center gap-2 cursor-pointer text-sky-400 focus:text-sky-400"
              onClick={handleStopPropagation}
            >
              <UserPlus className="size-4 text-sky-400" />
              <span>New Student</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Section 3: Create Content */}
          <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Create Content
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/attendance`}
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleStopPropagation}
            >
              <CalendarCheck className="size-4 text-amber-400" />
              <span>New Attendance Session</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/announcements/new`}
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleStopPropagation}
            >
              <Megaphone className="size-4 text-amber-500" />
              <span>New Announcement</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/questions/new`}
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleStopPropagation}
            >
              <HelpCircle className="size-4 text-purple-400" />
              <span>New Q&amp;A</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href={`/app/subjects/${subjectId}/resources/new`}
              className="flex items-center gap-2 cursor-pointer"
              onClick={handleStopPropagation}
            >
              <BookOpen className="size-4 text-emerald-400" />
              <span>New Resource</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Section 4: Public Portal */}
          <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Public Portal
          </DropdownMenuLabel>
          {publicId ? (
            <>
              <DropdownMenuItem
                onClick={handleCopyLink}
                className="flex items-center gap-2 cursor-pointer text-primary focus:text-primary"
              >
                <Copy className="size-4 text-primary" />
                <span>Copy Public Link</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/s/${publicId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer text-emerald-400 focus:text-emerald-400"
                  onClick={handleStopPropagation}
                >
                  <ExternalLink className="size-4 text-emerald-400" />
                  <span>View Public Page</span>
                </a>
              </DropdownMenuItem>
            </>
          ) : (
            <div className="px-2 py-1.5 text-[11px] text-muted-foreground italic">
              Link available after publishing
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
