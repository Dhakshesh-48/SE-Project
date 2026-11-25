import { CircleHelp, MessageSquare, MoreHorizontal, SquarePen, Trash2 } from "lucide-react";
import type { Project } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

function group(created: number) {
  const day = 86_400_000;
  const age = Date.now() - created;
  if (age < day) return "Today";
  if (age < 7 * day) return "Previous 7 days";
  return "Older";
}

export function AppSidebar({
  history,
  id,
  healthy,
  onOpen,
  onRemove,
  onHelp,
}: {
  history: Project[];
  id: string | null;
  healthy: boolean | null;
  onOpen: (id: string | null) => void;
  onRemove: (id: string) => void;
  onHelp: () => void;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const go = (pid: string | null) => {
    onOpen(pid);
    if (isMobile) setOpenMobile(false);
  };
  const groups = history.reduce<Record<string, Project[]>>((acc, p) => {
    (acc[group(p.created)] ||= []).push(p);
    return acc;
  }, {});

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => go(null)}
              className="gap-2.5"
              tooltip="BearBots"
            >
              <Logo className="size-8" />
              <span className="text-[17px] font-semibold tracking-tight">BearBots</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => go(null)} tooltip="New project">
              <SquarePen />
              <span>New project</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onHelp} tooltip="How it works">
              <CircleHelp />
              <span>How it works</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {history.length === 0 ? (
          <p className="px-4 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Your projects will show up here.
          </p>
        ) : (
          Object.entries(groups).map(([label, items]) => (
            <SidebarGroup key={label} className="group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel>{label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((p) => (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton
                        isActive={p.id === id}
                        onClick={() => go(p.id)}
                        title={p.title}
                      >
                        <MessageSquare className="text-muted-foreground" />
                        <span>{p.title}</span>
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction showOnHover>
                            <MoreHorizontal />
                            <span className="sr-only">More</span>
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onRemove(p.id)}
                          >
                            <Trash2 />
                            Remove from list
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={healthy ? "Backend connected" : "Backend offline"}
              className="cursor-default hover:bg-transparent active:bg-transparent"
            >
              <div className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                P
                <span
                  className={cn(
                    "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-sidebar",
                    healthy === null
                      ? "bg-muted-foreground/40"
                      : healthy
                        ? "bg-emerald-500"
                        : "bg-red-500",
                  )}
                />
              </div>
              <div className="grid text-left leading-tight">
                <span className="text-sm font-medium">Local workspace</span>
                <span className="text-xs text-muted-foreground">
                  {healthy === null
                    ? "Connecting…"
                    : healthy
                      ? "Backend connected"
                      : "Backend offline"}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
