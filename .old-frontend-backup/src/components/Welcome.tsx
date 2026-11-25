import { useRef, useState } from "react";
import {
  ArrowRight,
  Landmark,
  CreditCard,
  UsersRound,
  ArrowUpRight,
  LoaderCircle,
} from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "./ui/input-group";

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
export function WorkflowIntro() {
  return (
    <div className="workflow-intro">
      {[
        {
          title: "Clarify your idea",
          description:
            "Share what you’re building, for whom, and what it needs to do.",
        },
        {
          title: "Review requirements",
          description:
            "Review a structured specification you can validate and approve.",
        },
        {
          title: "Choose your workflow",
          description:
            "Get a development lifecycle with practical phases and review gates.",
        },
      ].map((s, i) => (
        <div className="intro-step" key={s.title}>
          <span className="step-number">0{i + 1}</span>
          <div>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
          </div>
          {i < 2 && <ArrowRight size={18} className="step-arrow" />}
        </div>
      ))}
    </div>
  );
}
export function Welcome({
  onStart,
  pending,
}: {
  onStart: (brief: string) => void;
  pending: boolean;
}) {
  const [brief, setBrief] = useState("");
  const input = useRef<HTMLTextAreaElement>(null);
  return (
    <section className="welcome">
      <div className="studio-hero">
        <div className="welcome-heading">
          <h1>
            From brief
            <br /> <em>to blueprint.</em>
          </h1>
          <p>
            Define what to build, how to test it, and which development workflow
            fits your project.
          </p>
        </div>
        <div className="blueprint-art" aria-hidden="true" />
      </div>
      <div className="intake-layout">
        <div className="intake-main">
          <div className="intake-heading">
            <label htmlFor="project-brief">Project brief</label>
            <span>Start with what you know.</span>
          </div>
          <form
            className="studio-composer"
            onSubmit={(e) => {
              e.preventDefault();
              if (!pending && brief.trim().length >= 10) onStart(brief.trim());
            }}
          >
            <InputGroup className="prompt-surface">
              <InputGroupTextarea
                ref={input}
                id="project-brief"
                minLength={10}
                maxLength={8000}
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={
                  "Describe what you’re building…\nInclude your users, key features, integrations, and constraints."
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.metaKey || event.ctrlKey) &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                required
                disabled={pending}
              />
              <InputGroupAddon align="block-end" className="prompt-actions">
                <span className="brief-length">
                  {brief.length.toLocaleString()} / 8,000
                </span>
                <InputGroupButton
                  type="submit"
                  size="sm"
                  variant="default"
                  disabled={pending || brief.trim().length < 10}
                >
                  {pending && (
                    <LoaderCircle data-icon="inline-start" className="spin" />
                  )}
                  {pending ? "Starting…" : "Start project"}
                  <ArrowUpRight data-icon="inline-end" />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </div>
        <aside className="studio-examples" aria-label="Example briefs">
          <h2>Example briefs</h2>
          <div>
            {examples.map((e) => (
              <button
                key={e.name}
                onClick={() => {
                  setBrief(e.brief);
                  input.current?.focus();
                }}
              >
                <e.icon size={19} />
                {e.name}
                <ArrowUpRight size={15} />
              </button>
            ))}
          </div>
        </aside>
      </div>
      <WorkflowIntro />
    </section>
  );
}
