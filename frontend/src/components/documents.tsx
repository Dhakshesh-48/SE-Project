import { useState } from "react";
import type { ReactNode } from "react";
import {
  ChevronRight,
  Download,
  FileText,
  Layers,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import type { SDLC, SRS } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function DocumentCard({
  icon,
  kicker,
  title,
  summary,
  file,
  data,
  stats,
  children,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  summary: string;
  file: string;
  data: unknown;
  stats?: { label: string; value: number }[];
  children: ReactNode;
}) {
  return (
    <section className="w-full overflow-hidden rounded-3xl border bg-background shadow-[0_2px_16px_-6px_rgb(0_0_0/0.08)]">
      <header className="flex items-start gap-3 border-b bg-muted/30 px-5 py-4 sm:px-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{kicker}</p>
          <h2 className="truncate text-base font-semibold">{title}</h2>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => download(file, data)}>
              <Download />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download {file}</TooltipContent>
        </Tooltip>
      </header>
      <div className="space-y-4 px-5 pt-4 sm:px-6">
        <p className="text-sm leading-relaxed text-foreground/80">{summary}</p>
        {stats && (
          <div className="flex flex-wrap gap-2">
            {stats.map((s) => (
              <span key={s.label} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                <strong className="font-semibold text-foreground">{s.value}</strong> {s.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="px-5 pb-5 pt-3 sm:px-6">{children}</div>
    </section>
  );
}

const priorityStyle: Record<string, string> = {
  must: "bg-red-50 text-red-700 border-red-200",
  high: "bg-red-50 text-red-700 border-red-200",
  should: "bg-amber-50 text-amber-700 border-amber-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  could: "bg-sky-50 text-sky-700 border-sky-200",
  low: "bg-sky-50 text-sky-700 border-sky-200",
};

function sourceLabel(source: string) {
  if (source === "brief") return "Project brief";
  if (source === "answer") return "Your answer";
  if (source === "NEEDS-VALIDATION") return "Needs validation";
  return source.replace("#chunk-", " · passage ").replace(".txt", "").replaceAll("-", " ");
}

function DocTabs({ tabs, children }: { tabs: { value: string; label: ReactNode }[]; children: ReactNode }) {
  return (
    <Tabs defaultValue={tabs[0].value} className="gap-4">
      <TabsList className="h-9 rounded-full bg-muted p-1">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="rounded-full px-3 text-[13px]">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-5 text-xs font-medium uppercase tracking-wider text-muted-foreground first:mt-0">{children}</h3>;
}

export function SrsDocument({ srs }: { srs: SRS }) {
  const [filter, setFilter] = useState("All");
  const categories = ["All", ...new Set(srs.requirements.map((r) => r.category))];
  const rows = srs.requirements.filter((r) => filter === "All" || r.category === filter);
  const reviewCount = srs.findings.length + srs.openIssues.length;

  return (
    <DocumentCard
      icon={<FileText className="size-5" />}
      kicker="Software requirements specification"
      title={srs.title}
      summary={srs.summary}
      file="bearbots-requirements.json"
      data={srs}
      stats={[
        { label: "requirements", value: srs.requirements.length },
        { label: "test traces", value: srs.traceability.length },
        { label: "review items", value: reviewCount },
      ]}
    >
      <DocTabs
        tabs={[
          { value: "req", label: "Requirements" },
          {
            value: "review",
            label: (
              <>
                Quality review
                {reviewCount > 0 && (
                  <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] text-background">{reviewCount}</span>
                )}
              </>
            ),
          },
          { value: "trace", label: "Traceability" },
        ]}
      >
        <TabsContent value="req" className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{rows.length} shown</span>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger size="sm" className="w-44 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "All" ? "All categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="divide-y rounded-2xl border">
            {rows.map((r) => (
              <Collapsible key={r.id} className="group/req">
                <CollapsibleTrigger className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
                  <code className="mt-0.5 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{r.id}</code>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug">{r.statement}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{r.category}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0 rounded-full font-normal", priorityStyle[r.priority.toLowerCase()])}
                  >
                    {r.priority}
                  </Badge>
                  <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/req:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 bg-muted/30 px-4 py-3 pl-[4.25rem] text-sm">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Acceptance criterion</p>
                  <p className="leading-relaxed">{r.acceptance}</p>
                  <Badge variant="secondary" className="rounded-full font-normal">
                    <FileText className="size-3" />
                    {sourceLabel(r.source)}
                  </Badge>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="review" className="text-sm">
          {srs.findings.length === 0 && (
            <p className="text-muted-foreground">No automated quality findings. Source interpretation still needs human review.</p>
          )}
          {srs.findings.length > 0 && (
            <div className="space-y-2">
              {srs.findings.map((f, i) => (
                <div key={i} className="flex gap-3 rounded-2xl border px-4 py-3">
                  <Badge variant="outline" className="h-fit shrink-0 rounded-full">{f.type}</Badge>
                  <p className="leading-relaxed">{f.text}</p>
                </div>
              ))}
            </div>
          )}
          <BulletSection title="Open issues" items={srs.openIssues} />
          <BulletSection title="Assumptions" items={srs.assumptions} />
          {srs.risks.length > 0 && (
            <>
              <SectionTitle>Risks</SectionTitle>
              <div className="space-y-2">
                {srs.risks.map((r, i) => (
                  <p key={i} className="leading-relaxed">
                    <strong className="font-medium">{r.title}</strong>
                    <span className="text-muted-foreground"> — {r.text}</span>
                  </p>
                ))}
              </div>
            </>
          )}
          {srs.stakeholders.length > 0 && (
            <>
              <SectionTitle>Stakeholders</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {srs.stakeholders.map((s) => (
                  <Badge key={s} variant="secondary" className="rounded-full font-normal">{s}</Badge>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="trace">
          <p className="mb-3 text-sm text-muted-foreground">Each requirement links to a proposed test and its acceptance check.</p>
          <div className="overflow-hidden rounded-2xl border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-24 pl-4">Requirement</TableHead>
                  <TableHead className="w-28">Test</TableHead>
                  <TableHead>Acceptance check</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {srs.traceability.map((t) => (
                  <TableRow key={t.req + t.test}>
                    <TableCell className="pl-4 align-top">
                      <code className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium">{t.req}</code>
                    </TableCell>
                    <TableCell className="align-top font-mono text-xs">{t.test}</TableCell>
                    <TableCell className="whitespace-normal text-sm leading-relaxed">{t.check}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </DocTabs>
    </DocumentCard>
  );
}

function BulletSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      <ul className="list-disc space-y-1.5 pl-5 leading-relaxed marker:text-muted-foreground">
        {items.map((v, i) => (
          <li key={i}>{v}</li>
        ))}
      </ul>
    </>
  );
}

const levelStyle: Record<string, string> = {
  high: "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function SdlcDocument({ sdlc }: { sdlc: SDLC }) {
  return (
    <DocumentCard
      icon={<Layers className="size-5" />}
      kicker="Recommended development lifecycle"
      title={sdlc.chosen}
      summary={sdlc.justification}
      file="bearbots-workflow.json"
      data={sdlc}
      stats={[
        { label: "phases", value: sdlc.workflow.length },
        { label: "models compared", value: sdlc.ranking.length },
        { label: "decision factors", value: sdlc.factors.length },
      ]}
    >
      <DocTabs
        tabs={[
          { value: "workflow", label: "Workflow" },
          { value: "models", label: "Model comparison" },
          { value: "factors", label: "Decision factors" },
        ]}
      >
        <TabsContent value="workflow">
          <ol className="relative">
            {sdlc.workflow.map((p, i) => (
              <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                {i < sdlc.workflow.length - 1 && (
                  <span className="absolute left-[13px] top-8 bottom-0 w-px bg-border" aria-hidden />
                )}
                <span className="z-10 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background text-xs font-medium">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-2.5 pt-0.5">
                  <h4 className="text-sm font-semibold">{p.phase}</h4>
                  <p className="text-sm leading-relaxed text-foreground/80">{p.activities}</p>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">People</dt>
                      <dd>{p.roles}</dd>
                    </div>
                    <div className="rounded-xl bg-muted/50 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Deliverables</dt>
                      <dd>{p.deliverables}</dd>
                    </div>
                  </dl>
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    <span>{p.gate}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Covers {p.reqs}</p>
                </div>
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="models" className="space-y-2">
          <p className="mb-3 text-sm text-muted-foreground">
            Relative scores from fixed decision weights — not probabilities.
          </p>
          {sdlc.ranking.map((r, i) => (
            <div
              key={r.model}
              className={cn("rounded-2xl border px-4 py-3", i === 0 && "border-foreground/30 bg-muted/30")}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i === 0 ? <Trophy className="size-3.5" /> : i + 1}
                </span>
                <strong className="flex-1 text-sm font-medium">{r.model}</strong>
                <span className="text-sm font-semibold tabular-nums">
                  {r.score}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </span>
              </div>
              <div className="ml-9 mt-2 space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", i === 0 ? "bg-foreground" : "bg-foreground/30")}
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{r.why}</p>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="factors">
          <div className="divide-y rounded-2xl border">
            {sdlc.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{f.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {f.implication}
                    {f.cites && <> · {f.cites}</>}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 rounded-full font-normal", levelStyle[f.value.toLowerCase()])}
                >
                  {f.value}
                </Badge>
              </div>
            ))}
          </div>
        </TabsContent>
      </DocTabs>
    </DocumentCard>
  );
}
