"use client";
export function AnswerChoices({
  options,
  disabled,
  onChoose,
  selected,
}: {
  options: string[];
  disabled: boolean;
  onChoose: (value: string) => void;
  selected?: string;
}) {
  return (
    <div
      className={
        "answer-choices" +
        (options.some((v) => v.length > 65) ? " long-choices" : "")
      }
      role="group"
      aria-label="Answer choices"
    >
      {options.map((option, i) => (
        <button
          type="button"
          key={option}
          aria-label={option}
          aria-pressed={selected === option}
          disabled={disabled}
          onClick={() => onChoose(option)}
        >
          <span className="choice-letter" aria-hidden="true">
            {String.fromCharCode(65 + i)}
          </span>
          <span>{option}</span>
        </button>
      ))}
    </div>
  );
}
