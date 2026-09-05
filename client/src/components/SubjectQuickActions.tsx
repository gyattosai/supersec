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
  ArrowRight,
  MoreHorizontal,
  ChevronDown,
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
      {/* Primary & Shortcut Triggers */}
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
          onClick={handleStopPropagation}
        >
          <Link href={`/app/subjects/${subjectId}`}>
            Enter Workspace <ArrowRight className="ml-1.5 size-3.5" />
          </Link>
        </Button>

        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 px-2.5 rounded-lg text-xs font-semibold hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-400"
          onClick={handleStopPropagation}
          title="Roll Call / Attendance Desk"
        >
          <Link href={`/app/subjects/${subjectId}/attendance`}>
            <CalendarCheck className="mr-1.5 size-3.5 text-amber-400" />
            Roll Call
          </Link>
        </Button>
      </div>

      {/* Compact Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={handleStopPropagation}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="size-3.5 mr-1" />
            Actions
            <ChevronDown className="size-3 ml-1 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={handleStopPropagation}>
          <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Create Content
          </DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/app/subjects/${subjectId}/students`} className="flex items-center gap-2 cursor-pointer" onClick={handleStopPropagation}>
              <UserPlus className="size-4 text-sky-400" />
              <span>New Student</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/app/subjects/${subjectId}/attendance`} className="flex items-center gap-2 cursor-pointer" onClick={handleStopPropagation}>
              <CalendarCheck className="size-4 text-amber-400" />
              <span>New Attendance</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/app/subjects/${subjectId}/announcements/new`} className="flex items-center gap-2 cursor-pointer" onClick={handleStopPropagation}>
              <Megaphone className="size-4 text-amber-500" />
              <span>New Announcement</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/app/subjects/${subjectId}/questions/new`} className="flex items-center gap-2 cursor-pointer" onClick={handleStopPropagation}>
              <HelpCircle className="size-4 text-purple-400" />
              <span>New Q&amp;A</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/app/subjects/${subjectId}/resources/new`} className="flex items-center gap-2 cursor-pointer" onClick={handleStopPropagation}>
              <BookOpen className="size-4 text-emerald-400" />
              <span>New Resource</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
            Public Portal
          </DropdownMenuLabel>
          {publicId ? (
            <>
              <DropdownMenuItem onClick={handleCopyLink} className="flex items-center gap-2 cursor-pointer text-primary focus:text-primary">
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
