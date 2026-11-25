import { useEffect, useState } from "react";
import { Activity, AlertCircle, X } from "lucide-react";
import { request, useProject } from "@/lib/useProject";
import { AppSidebar } from "@/components/app-sidebar";
import { Home, steps } from "@/components/home";
import { ProjectView, Stepper } from "@/components/project-view";
import { SpanRow } from "@/components/activity";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function App() {
  const project = useProject();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [help, setHelp] = useState(false);
  const [activity, setActivity] = useState(false);

  useEffect(() => {
    let disposed = false;
    const check = () =>
      request("/health")
        .then(() => !disposed && setHealthy(true))
        .catch(() => !disposed && setHealthy(false));
    check();
    const timer = setInterval(check, 30000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);

  const spans = project.items.flatMap((i) => i.steps || []);
  const tokens = spans.reduce((n, s) => n + s.tokens, 0);

  return (
    <TooltipProvider delayDuration={300}>
      <SidebarProvider className="h-svh">
        <AppSidebar
          history={project.history}
          id={project.id}
          healthy={healthy}
          onOpen={project.open}
          onRemove={project.remove}
          onHelp={() => setHelp(true)}
        />
        <SidebarInset className="min-h-0 overflow-hidden">
          <header className="flex h-14 shrink-0 items-center gap-2 px-3">
            <SidebarTrigger className="text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {project.id ? project.title || "Project" : ""}
            </span>
            {project.id && <Stepper stage={project.stage} />}
            {project.id && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => setActivity(true)}
              >
                <Activity />
                <span className="hidden sm:inline">Activity</span>
              </Button>
            )}
          </header>

          {project.error && (
            <div className="mx-auto w-full max-w-[760px] px-4">
              <Alert variant="destructive" className="rounded-2xl pr-10">
                <AlertCircle />
                <AlertDescription>{project.error}</AlertDescription>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="absolute top-2.5 right-2.5"
                  aria-label="Dismiss error"
                  onClick={project.clearError}
                >
                  <X />
                </Button>
              </Alert>
            </div>
          )}

          <div className={project.id ? "min-h-0 flex-1" : "min-h-0 flex-1 overflow-y-auto"}>
            {project.id ? (
              <ProjectView
                key={project.id}
                items={project.items}
                stage={project.stage}
                agents={project.agents}
                pending={project.pending}
                brief={project.brief}
                onReply={project.reply}
              />
            ) : (
              <Home onStart={project.start} pending={project.pending} />
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Sheet open={activity} onOpenChange={setActivity}>
        <SheetContent className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Project activity</SheetTitle>
            <SheetDescription>
              {spans.length} steps · {tokens.toLocaleString()} tokens — retrievals and model calls recorded by the backend.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-1.5 overflow-y-auto p-4">
            {spans.length ? (
              spans.map((s, i) => <SpanRow key={i} span={s} />)
            ) : (
              <p className="text-sm text-muted-foreground">Completed steps will appear here.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">From idea to a clear plan</DialogTitle>
            <DialogDescription>
              BearBots brings a requirements analyst and a development planner together in one guided chat.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs text-background">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="space-y-2 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">You’re in control.</strong> Review the requirements and ask for
              changes before continuing. Generated documents are drafts; regulatory interpretations and final
              decisions need qualified human review.
            </p>
            <p>
              Recent project titles are saved in this browser. Live sessions stay in backend memory and reset when the
              backend restarts.
            </p>
          </div>
          <DialogFooter>
            <Button className="rounded-full" onClick={() => setHelp(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
