import { ArrowUp, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@/components/ai-elements/prompt-input";
import { cn } from "@/lib/utils";

/**
 * Grok-style rounded composer. Must be rendered inside a PromptInputProvider
 * so callers (suggestions, examples) can set its text.
 */
export function Composer({
  onSubmit,
  placeholder,
  pending,
  disabled,
  minLength = 1,
  maxLength,
  tools,
  autoFocus,
  className,
}: {
  onSubmit: (text: string) => Promise<unknown> | void;
  placeholder: string;
  pending?: boolean;
  disabled?: boolean;
  minLength?: number;
  maxLength?: number;
  tools?: ReactNode;
  autoFocus?: boolean;
  className?: string;
}) {
  const { textInput } = usePromptInputController();
  const text = textInput.value.trim();
  const ready = !pending && !disabled && text.length >= minLength;

  return (
    <PromptInput
      onSubmit={async ({ text }) => {
        const value = text.trim();
        if (value.length < minLength || pending || disabled) throw new Error("not ready");
        const ok = await onSubmit(value);
        if (ok === false) throw new Error("rejected"); // keep the text for a retry
      }}
      className={cn(
        "[&_[data-slot=input-group]]:rounded-[28px] [&_[data-slot=input-group]]:border-border [&_[data-slot=input-group]]:bg-background",
        "[&_[data-slot=input-group]]:shadow-[0_2px_12px_-4px_rgb(0_0_0/0.08)] [&_[data-slot=input-group]]:has-[textarea:focus]:border-foreground/25",
        "[&_[data-slot=input-group]]:has-[textarea:focus]:ring-0",
        className,
      )}
    >
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          className="min-h-14 px-5 pt-4 text-[15px] placeholder:text-muted-foreground/70"
        />
      </PromptInputBody>
      <PromptInputFooter className="px-3 pb-3">
        <PromptInputTools className="text-xs text-muted-foreground">
          {tools}
        </PromptInputTools>
        <PromptInputSubmit
          disabled={!ready}
          className="size-9 rounded-full"
          aria-label="Send"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </PromptInputSubmit>
      </PromptInputFooter>
    </PromptInput>
  );
}
