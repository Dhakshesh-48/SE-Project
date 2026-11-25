import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, PenLine, Sparkles } from "lucide-react";
import type { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** One clarifying question at a time, then a single submission to the backend. */
export function Questions({
  item,
  pending,
  onReply,
}: {
  item: Item;
  pending: boolean;
  onReply: (body: unknown) => Promise<boolean>;
}) {
  const questions = item.questions || [];
  const [values, setValues] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [sent, setSent] = useState(false);
  const answered = Boolean(item.answers) || sent;

  useEffect(() => {
    if (!item.answers) return;
    setValues(Object.fromEntries(item.answers.map((a) => [a.questionId, a.value || ""])));
  }, [item.answers]);

  if (answered) {
    return (
      <div className="ml-auto flex w-full max-w-[85%] flex-col gap-2 rounded-3xl bg-secondary px-5 py-4 text-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Check className="size-3.5" />
          Answered {questions.length} questions
        </div>
        <dl className="grid gap-2.5">
          {questions.map((q) => (
            <div key={q.id}>
              <dt className="text-muted-foreground">{q.text}</dt>
              <dd className="font-medium">
                {values[q.id]?.trim() || (
                  <span className="font-normal italic text-muted-foreground">Skipped — kept as an open issue</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  const q = questions[index];
  if (!q) return null;
  const last = index === questions.length - 1;
  const pick = (label: string) => {
    setCustom((c) => ({ ...c, [q.id]: false }));
    setValues((v) => ({ ...v, [q.id]: label }));
  };

  async function submit() {
    const ok = await onReply({
      itemId: item.id,
      answers: questions.map((x) => ({ questionId: x.id, value: values[x.id]?.trim() || null })),
    });
    if (ok) setSent(true);
  }

  return (
    <div className="w-full overflow-hidden rounded-3xl border bg-background shadow-[0_2px_16px_-6px_rgb(0_0_0/0.08)]">
      <Progress value={((index + 1) / questions.length) * 100} className="h-1 rounded-none bg-muted [&>div]:bg-foreground" />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium uppercase tracking-wider">
            Question {index + 1} of {questions.length}
          </span>
          <div className="flex gap-1">
            {questions.map((x, i) => (
              <button
                key={x.id}
                type="button"
                aria-label={`Go to question ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  i === index ? "bg-foreground" : values[x.id] ? "bg-foreground/40" : "bg-border",
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-[17px] font-medium leading-snug">{q.text}</h3>
          {q.why && <p className="text-sm text-muted-foreground">{q.why}</p>}
        </div>

        <div role="radiogroup" aria-label={q.text} className="grid gap-2">
          {q.options.map((o) => {
            const chosen = !custom[q.id] && values[q.id] === o.label;
            return (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={chosen}
                disabled={pending}
                onClick={() => pick(o.label)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                  chosen ? "border-foreground bg-foreground/[0.03]" : "hover:bg-muted/60",
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                    chosen && "border-foreground bg-foreground text-background",
                  )}
                >
                  {chosen && <Check className="size-2.5" strokeWidth={3} />}
                </span>
                <span className="flex-1">{o.label}</span>
                {o.recommended && (
                  <Badge variant="secondary" className="gap-1 rounded-full font-normal">
                    <Sparkles className="size-3" />
                    Suggested
                  </Badge>
                )}
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={Boolean(custom[q.id])}
            onClick={() => {
              setCustom((c) => ({ ...c, [q.id]: true }));
              setValues((v) => ({ ...v, [q.id]: "" }));
            }}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-left text-sm text-muted-foreground transition-colors",
              custom[q.id] ? "border-foreground text-foreground" : "hover:bg-muted/60",
            )}
          >
            <PenLine className="size-4" />
            Write my own answer
          </button>
          {custom[q.id] && (
            <Input
              autoFocus
              aria-label={`Your answer to question ${index + 1}`}
              maxLength={500}
              value={values[q.id] || ""}
              placeholder="Type your answer…"
              className="h-11 rounded-2xl px-4"
              onChange={(e) => setValues((v) => ({ ...v, [q.id]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !last) setIndex(index + 1);
              }}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            <ArrowLeft />
            Back
          </Button>
          <div className="flex items-center gap-2">
            {!last && (
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => {
                  setValues((v) => ({ ...v, [q.id]: "" }));
                  setIndex(index + 1);
                }}
              >
                Skip
              </Button>
            )}
            {last ? (
              <Button className="rounded-full" disabled={pending} onClick={submit}>
                {pending && <Loader2 className="animate-spin" />}
                Create requirements
                <ArrowRight />
              </Button>
            ) : (
              <Button className="rounded-full" onClick={() => setIndex(index + 1)}>
                Next
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Unanswered questions are recorded as open issues in the spec.
        </p>
      </div>
    </div>
  );
}
