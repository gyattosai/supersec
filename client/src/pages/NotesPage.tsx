import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { NotesWorkspaceCard } from "@/components/NotesWorkspaceCard";
import { Button } from "@/components/ui/button";
import { StickyNote, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotesPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Workspace Header */}
        <WorkspacePageHeader
          eyebrow="Secretary Desk"
          title="Notes & Study References"
          description="Take rich-text notes with full markdown formatting, attach lecture files and images, organize by subject, and copy formatted notes to Messenger."
          action={
            <div className="flex items-center gap-2.5">
              <Button asChild variant="outline" className="rounded-xl border-border bg-card/60 shadow-xs">
                <Link href="/app">
                  <ArrowLeft className="mr-1.5 size-4" /> Back to Overview
                </Link>
              </Button>
            </div>
          }
        />

        {/* Full-Page Notes Workspace Component */}
        <NotesWorkspaceCard />
      </section>
    </DashboardLayout>
  );
}
