import { CreditCard, Landmark, UsersRound } from "lucide-react";
import {
  PromptInputProvider,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";
import { Composer } from "@/components/composer";
import { Logo } from "@/components/logo";

const examples = [
  {
    name: "Digital banking",
    icon: Landmark,
    brief:
      "Build a digital banking application for retail customers in India. Include secure login, account balances, fund transfers, transaction history and audit logs. Integrate with the core banking system and support 1,000 concurrent users.",
  },
  {
    name: "Payment platform",
    icon: CreditCard,
    brief:
      "Build a payment platform for small businesses in India. Merchants need payment links, transaction reconciliation, refunds and reporting. Integrate with a payment gateway, use role-based access and maintain an audit trail.",
  },
  {
    name: "Customer onboarding",
    icon: UsersRound,
    brief:
      "Build a bank customer onboarding application with KYC verification, secure document storage and audit logs. Support 10,000 customers, dual approval by onboarding and compliance staff, and integration with the existing customer management system.",
  },
];

export const steps = [
  {
    title: "Clarify",
    description: "The analyst reads your brief and asks about the gaps.",
  },
  {
    title: "Specify",
    description: "Get a requirements spec with acceptance criteria and test traces.",
  },
  {
    title: "Plan",
    description: "The planner picks a lifecycle with phases and review gates.",
  },
];

function Examples() {
  const { textInput } = usePromptInputController();
  return (
    <Suggestions className="mx-auto">
      {examples.map((e) => (
        <Suggestion
          key={e.name}
          suggestion={e.brief}
          onClick={(brief) => {
            textInput.setInput(brief);
            document.querySelector<HTMLTextAreaElement>("textarea[name=message]")?.focus();
          }}
          className="h-9 gap-2 border-border bg-background px-4 font-normal text-foreground/80 shadow-none hover:bg-muted"
        >
          <e.icon className="size-4 text-muted-foreground" />
          {e.name}
        </Suggestion>
      ))}
    </Suggestions>
  );
}

export function Home({
  onStart,
  pending,
}: {
  onStart: (brief: string) => Promise<unknown>;
  pending: boolean;
}) {
  return (
    <PromptInputProvider>
      <div className="flex min-h-full flex-col items-center justify-center px-4 pb-[12vh] pt-10">
        <div className="flex w-full max-w-[760px] flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <Logo className="size-11 rounded-xl" />
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[34px]">
              What are we building today?
            </h1>
            <p className="max-w-md text-[15px] text-muted-foreground">
              Describe your project. BearBots turns it into testable requirements
              and a development workflow that fits.
            </p>
          </div>

          <Composer
            autoFocus
            onSubmit={onStart}
            pending={pending}
            minLength={10}
            maxLength={8000}
            placeholder="Describe what you're building — users, key features, integrations, constraints…"
            className="w-full"
          />

          <Examples />

          <ol className="grid w-full gap-3 pt-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border bg-muted/40 p-4">
                <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
                  <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-[11px] text-background">
                    {i + 1}
                  </span>
                  {s.title}
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </PromptInputProvider>
  );
}
