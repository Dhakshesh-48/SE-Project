import { useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  Loader2,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type { Item } from "@/lib/types";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Composer } from "@/components/composer";
import { Delegation } from "@/components/activity";
import { Questions } from "@/components/questions";
import { SdlcDocument, SrsDocument } from "@/components/documents";
import { cn } from "@/lib/utils";

type Echo = { id: string; after: string | null; text: string };

const STEPS = [
  { name: "Brief", stages: ["intake"] },
  { name: "Clarify", stages: ["clarify"] },
  { name: "Requirements", stages: ["srs", "handoff"] },
  { name: "Workflow", stages: ["sdlc", "review"] },
];

function Stepper({ stage }: { stage: string }) {
  const current = stage === "done" ? STEPS.length : STEPS.findIndex((s) => s.stages.includes(stage));
  return (
    <ol className="hidden items-center gap-1 text-xs md:flex" aria-label="Progress">
      {STEPS.map((s, i) => (
        <li key={s.name} className="flex items-center gap-1">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1",
              i < current && "text-muted-foreground",
              i === current && "bg-muted font-medium text-foreground",
              i > current && "text-muted-foreground/60",
            )}
          >
            {i < current ? (
              <Check className="size-3" />
            ) : (
              <span className={cn("size-1.5 rounded-full", i === current ? "bg-foreground" : "bg-border")} />
            )}
            {s.name}
          </span>
          {i < STEPS.length - 1 && <span className="h-px w-3 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

export { Stepper };

function Approval({
  item,
  pending,
  onReply,
}: {
  item: Item;
  pending: boolean;
  onReply: (body: unknown) => Promise<boolean>;
}) {
  const [sent, setSent] = useState("");
  const status = item.status && item.status !== "pending" ? item.status : sent;

  if (status) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {status === "allowed" ? (
          <>
            <CircleCheck className="size-4 text-emerald-600" />
            Approved — requirements handed to the SDLC planner.
          </>
        ) : (
          <>
            <PencilLine className="size-4" />
            Revision requested.
          </>
        )}
      </div>
    );
  }

  async function submit(decision: string) {
    if (await onReply({ itemId: item.id, decision })) setSent(decision);
  }

  return (
    <div className="w-full rounded-3xl border bg-background p-5 shadow-[0_2px_16px_-6px_rgb(0_0_0/0.08)] sm:p-6">
      <div className="flex gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <ShieldCheck className="size-[18px]" />
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="text-[15px] font-semibold">{item.title || "Ready for the next step?"}</h3>
          <p className="text-sm text-muted-foreground">
            {item.subtitle || "Send the requirements to the planner for a lifecycle recommendation."}
          </p>
        </div>
      </div>
      {item.breakdown && item.breakdown.length > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {item.breakdown.map(([k, v]) => (
            <div key={k} className="flex flex-col-reverse rounded-2xl bg-muted/60 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-4 flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs text-muted-foreground">{item.footnote}</p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" className="flex-1 rounded-full" disabled={pending} onClick={() => submit("revise")}>
            <PencilLine />
            Request changes
          </Button>
          <Button className="flex-1 rounded-full" disabled={pending} onClick={() => submit("allowed")}>
            {pending && <Loader2 className="animate-spin" />}
            Approve & continue
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <Message from="user">
      <MessageContent className="max-w-[85%] whitespace-pre-wrap rounded-3xl! px-5! py-3! text-[15px] leading-relaxed">
        {text}
      </MessageContent>
    </Message>
  );
}

function workingText(stage: string) {
  if (stage === "intake") return "Reading your brief and retrieving references…";
  if (stage === "sdlc" || stage === "handoff") return "Evaluating lifecycle options…";
  return "Drafting requirements from your answers…";
}

export function ProjectView({
  items,
  stage,
  agents,
  pending,
  brief,
  onReply,
}: {
  items: Item[];
  stage: string;
  agents: string[];
  pending: boolean;
  brief?: string;
  onReply: (body: unknown) => Promise<boolean>;
}) {
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const lastApproval = [...items].reverse().find((i) => i.kind === "approval");
  const lastId = items.at(-1)?.id ?? null;
  const awaitingRevision =
    lastApproval?.status === "revise" && !echoes.some((e) => e.id === `rev-${lastApproval.id}`);
  const done = stage === "done";
  const working = agents.length > 0 && !done;

  async function send(text: string) {
    const ok = await onReply({ text });
    if (ok)
      setEchoes((e) => [
        ...e,
        { id: awaitingRevision ? `rev-${lastApproval!.id}` : `msg-${Date.now()}`, after: lastId, text },
      ]);
    return ok;
  }

  const echoesAfter = (id: string | null) =>
    echoes.filter((e) => e.after === id).map((e) => <UserBubble key={e.id} text={e.text} />);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-[760px] gap-6 px-4 pb-10 pt-8">
          {brief && <UserBubble text={brief} />}
          {echoesAfter(null)}
          {items.map((item) => (
            <div key={item.id} className="contents">
              <Row item={item} pending={pending} onReply={onReply} />
              {echoesAfter(item.id)}
            </div>
          ))}
          {working && (
            <div role="status" className="flex items-center gap-3 text-sm">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="font-medium">{agents.includes("analyst") ? "Analyst" : "Planner"}</span>
              <Shimmer className="text-sm">{workingText(stage)}</Shimmer>
            </div>
          )}
          {items.length === 0 && (
            <div role="status" className="flex items-center gap-3 text-sm">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <Shimmer className="text-sm">Opening your project…</Shimmer>
            </div>
          )}
          {done && items.some((i) => i.kind === "sdlc") && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <CircleCheck className="size-4 text-emerald-600" />
              Your project plan is ready for review.
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-4 rounded-full shadow-md" />
      </Conversation>

      <div className="mx-auto w-full max-w-[760px] px-4 pb-4">
        <PromptInputProvider>
          <Composer
            onSubmit={send}
            pending={pending}
            disabled={done}
            maxLength={2000}
            placeholder={
              done
                ? "This run is finished — start a new project from the sidebar."
                : awaitingRevision
                  ? "Describe what should change in the requirements…"
                  : "Message BearBots…"
            }
          />
        </PromptInputProvider>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Generated documents are drafts. Regulatory interpretations need qualified human review.
        </p>
      </div>
    </div>
  );
}

function Row({
  item,
  pending,
  onReply,
}: {
  item: Item;
  pending: boolean;
  onReply: (body: unknown) => Promise<boolean>;
}) {
  switch (item.kind) {
    case "bot":
      return (
        <Message from="assistant" className="max-w-full">
          <MessageContent className="text-[15px] leading-relaxed">
            <MessageResponse>{item.text || ""}</MessageResponse>
          </MessageContent>
        </Message>
      );
    case "event":
      return item.strong ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-4 items-center justify-center rounded-full bg-muted">
            <Check className="size-2.5" />
          </span>
          {item.text}
          <span className="font-medium text-foreground">{item.strong}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {item.text}
        </div>
      );
    case "delegation":
      return <Delegation item={item} />;
    case "questions":
      return <Questions item={item} pending={pending} onReply={onReply} />;
    case "srs":
      return item.srs ? <SrsDocument srs={item.srs} /> : null;
    case "sdlc":
      return item.sdlc ? <SdlcDocument sdlc={item.sdlc} /> : null;
    case "approval":
      return <Approval item={item} pending={pending} onReply={onReply} />;
    case "notice":
      return (
        <Alert className="rounded-2xl border-amber-200 bg-amber-50/60 text-amber-950">
          <ShieldAlert className="text-amber-700!" />
          <AlertTitle>{item.title}</AlertTitle>
          <AlertDescription className="text-amber-900/80">{item.text}</AlertDescription>
        </Alert>
      );
    default:
      return null;
  }
}
