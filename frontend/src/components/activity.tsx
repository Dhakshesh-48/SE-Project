import { ArrowRight, Bot, ChevronRight, Database, Workflow } from "lucide-react";
import type { Item, Span } from "@/lib/types";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function SpanRow({ span }: { span: Span }) {
  return (
    <Collapsible className="group/span rounded-xl border bg-background">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs">
        {span.kind === "llm" ? (
          <Bot className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <Database className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{span.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {(span.end - span.start).toFixed(1)}s
          {span.tokens > 0 && <> · {span.tokens.toLocaleString()} tok</>}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/span:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t px-3 py-2.5">
        {(["input", "output"] as const).map((k) => (
          <div key={k}>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k}</p>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-2.5 font-mono text-[11px] leading-relaxed">
              {span[k] || "—"}
            </pre>
          </div>
        ))}
        {span.error && <p className="text-xs text-destructive">{span.error}</p>}
      </CollapsibleContent>
    </Collapsible>
  );
}

const nice = (who: string) => ((who === "pico" || who === "bearbots") ? "BearBots" : who[0].toUpperCase() + who.slice(1));

/** Agent hand-offs, shown like a model's chain of thought. */
export function Delegation({ item }: { item: Item }) {
  const steps = item.steps || [];
  const messages = item.messages || [];
  return (
    <ChainOfThought className="max-w-none">
      <ChainOfThoughtHeader>
        Agent activity · {messages.length} messages{steps.length > 0 && `, ${steps.length} steps`}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {messages.map((m, i) => (
          <ChainOfThoughtStep
            key={i}
            icon={Workflow}
            label={
              <span className="inline-flex items-center gap-1 text-xs font-medium">
                {nice(m.from)}
                <ArrowRight className="size-3" />
                {nice(m.to)}
              </span>
            }
            description={<span className="text-sm text-foreground/80">{m.text}</span>}
          />
        ))}
        {steps.length > 0 && (
          <ChainOfThoughtStep icon={Bot} label={<span className="text-xs font-medium">Model calls & retrievals</span>}>
            <div className="space-y-1.5">
              {steps.map((s, i) => (
                <SpanRow key={i} span={s} />
              ))}
            </div>
          </ChainOfThoughtStep>
        )}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
