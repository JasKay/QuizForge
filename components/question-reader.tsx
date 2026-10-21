"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
export function QuestionReader({
  text,
  startedAt,
  endsAt,
  offset,
  onComplete,
}: {
  text: string;
  startedAt: string | null;
  endsAt: string | null;
  offset: number;
  onComplete: () => void;
}) {
  const timeOffset = useRef(offset).current;
  const words = text.split(/\s+/),
    [spoken, setSpoken] = useState(0),
    [tap, setTap] = useState(false),
    [fallback, setFallback] = useState(false),
    [retry, setRetry] = useState(0);
  const done = useRef(onComplete);
  done.current = onComplete;
  useEffect(() => {
    let disposed = false,
      finished = false,
      started = false,
      visual = false,
      timer: ReturnType<typeof setTimeout> | undefined,
      probe: ReturnType<typeof setTimeout> | undefined;
    const finish = () => {
      if (disposed || finished) return;
      finished = true;
      setSpoken(words.length);
      done.current();
    };
    const from = startedAt ? Date.parse(startedAt) : Date.now() + timeOffset,
      to = endsAt ? Date.parse(endsAt) : from + (words.length / 2.6) * 1000;
    const tick = () => {
      if (!visual || disposed) return;
      const fraction = Math.max(
        0,
        Math.min(1, (Date.now() + timeOffset - from) / Math.max(1, to - from)),
      );
      setSpoken(Math.floor(fraction * words.length));
      if (fraction >= 1) finish();
    };
    let utterance: SpeechSynthesisUtterance | null = null;
    if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      visual = true;
      setFallback(true);
    } else {
      utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.onstart = () => {
        if (disposed) return;
        started = true;
        setTap(false);
        setFallback(false);
      };
      utterance.onboundary = (e) => {
        if (disposed) return;
        setSpoken(
          text.slice(0, e.charIndex).trim().split(/\s+/).filter(Boolean)
            .length + 1,
        );
      };
      utterance.onend = finish;
      utterance.onerror = () => {
        if (disposed) return;
        visual = true;
        setFallback(true);
        setTap(false);
        tick();
      };
      timer = setTimeout(
        () => {
          if (disposed || !utterance) return;
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          probe = setTimeout(() => {
            if (!disposed && !started && !finished) setTap(true);
          }, 2000);
        },
        Math.max(0, from - Date.now() - timeOffset),
      );
    }
    const interval = setInterval(tick, 100);
    tick();
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(probe);
      clearInterval(interval);
      if (utterance) window.speechSynthesis.cancel();
    };
  }, [text, startedAt, endsAt, timeOffset, retry]);
  return (
    <div className="question-reading-overlay" aria-label="Question being read">
      <div className="reading-label">
        <Volume2 size={17} />
        <span>{fallback ? "Reading question" : "Listen to the question"}</span>
        <i />
      </div>
      <h2>
        {words.map((word, i) => (
          <span key={i} className={i < spoken ? "word-read" : ""}>
            {word}{" "}
          </span>
        ))}
      </h2>
      {tap ? (
        <button
          className="trivia-primary"
          onClick={() => setRetry((n) => n + 1)}
        >
          Tap to hear question
          <Volume2 size={17} />
        </button>
      ) : (
        <p>
          {fallback
            ? "Audio unavailable. Follow the highlighted words."
            : "Buzzers open after reading."}
        </p>
      )}
    </div>
  );
}
