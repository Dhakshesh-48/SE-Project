import { useEffect, useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import type { Item } from "../lib/types";
export function Questions({
  item,
  pending,
  onReply,
}: {
  item: Item;
  pending: boolean;
  onReply: (body: unknown) => Promise<boolean>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Record<string, boolean>>({});
  const [sent, setSent] = useState(false);
  const questions = item.questions || [];
  const answered = Boolean(item.answers) || sent;
  useEffect(() => {
    if (item.answers) {
      setValues(
        Object.fromEntries(
          item.answers.map((a) => [a.questionId, a.value || ""]),
        ),
      );
      setCustom(
        Object.fromEntries(
          item.answers.map((a) => [
            a.questionId,
            Boolean(
              a.value &&
              !item.questions
                ?.find((q) => q.id === a.questionId)
                ?.options.some((o) => o.label === a.value),
            ),
          ]),
        ),
      );
    }
  }, [item.answers, item.questions]);
  return (
    <section className="question-panel">
      <div className="section-heading">
        <div>
          <h2>Let’s fill in the gaps.</h2>
          <p>
            A few details will help turn your brief into testable requirements.
          </p>
        </div>
        <span className="quiet-label">{questions.length} questions</span>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await onReply({
              itemId: item.id,
              answers: questions.map((q) => ({
                questionId: q.id,
                value: values[q.id]?.trim() || null,
              })),
            })
          )
            setSent(true);
        }}
      >
        {questions.map((q, i) => (
          <fieldset key={q.id} disabled={answered || pending}>
            <legend>
              <span className="question-index">0{i + 1}</span>
              {q.text}
            </legend>
            {q.why && <p className="question-why">{q.why}</p>}
            <div className="answer-options">
              {q.options.map((o) => (
                <label
                  key={o.label}
                  className={`answer-option ${!custom[q.id] && values[q.id] === o.label ? "chosen" : ""}`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={!custom[q.id] && values[q.id] === o.label}
                    onChange={() => {
                      setCustom((c) => ({ ...c, [q.id]: false }));
                      setValues((v) => ({ ...v, [q.id]: o.label }));
                    }}
                  />
                  <span>{o.label}</span>
                  {o.recommended && <small>Suggested</small>}
                </label>
              ))}
              <label
                className={`answer-option ${custom[q.id] ? "chosen" : ""}`}
              >
                <input
                  type="radio"
                  name={q.id}
                  checked={Boolean(custom[q.id])}
                  onChange={() => {
                    setCustom((c) => ({ ...c, [q.id]: true }));
                    setValues((v) => ({ ...v, [q.id]: "" }));
                  }}
                />
                <span>Write my own answer</span>
              </label>
            </div>
            {custom[q.id] && (
              <input
                className="custom-answer"
                aria-label={`Your answer to question ${i + 1}`}
                maxLength={500}
                value={values[q.id] || ""}
                placeholder="Add your answer…"
                onChange={(e) =>
                  setValues((v) => ({ ...v, [q.id]: e.target.value }))
                }
              />
            )}
          </fieldset>
        ))}
        <div className="form-actions">
          <p>
            {answered ? (
              <>
                <Check size={15} /> Answers submitted
              </>
            ) : (
              "You can leave a question unanswered to mark it as an open issue."
            )}
          </p>
          {!answered && (
            <button className="primary" disabled={pending}>
              {pending ? <LoaderCircle size={16} className="spin" /> : null}
              Create requirements
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
