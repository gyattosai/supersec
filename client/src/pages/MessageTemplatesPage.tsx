import DashboardLayout from "@/components/DashboardLayout";
import { WorkspacePageHeader } from "@/components/WorkspacePageHeader";
import { MessageTemplatesCard } from "@/components/MessageTemplatesCard";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function MessageTemplatesPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl space-y-6 pb-12">
        {/* Workspace Header */}
        <WorkspacePageHeader
          eyebrow="Secretary Toolkit"
          title="Messenger Templates & Fast Snippets"
          description="Create, customize, and copy perfectly formatted Messenger announcements, roll-call links, Zoom proof reminders, and excuse letter notices in 1 click."
          action={
            <div className="flex items-center gap-2.5">
              <Button asChild variant="outline" className="rounded-xl border-border bg-card/60 shadow-xs">
                <Link href="/app">
                  <ArrowLeft className="mr-1.5 size-4" /> Back to Overview
                </Link>
              </Button>
              <Button asChild className="rounded-xl bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20">
                <a href="https://www.messenger.com" target="_blank" rel="noreferrer">
                  <Send className="mr-1.5 size-4" /> Open Messenger
                </a>
              </Button>
            </div>
          }
        />

        {/* Full-Page Message Templates Component */}
        <MessageTemplatesCard />
      </section>
    </DashboardLayout>
  );
}
