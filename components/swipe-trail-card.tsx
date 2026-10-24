"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
} from "react";
export function SwipeTrailCard({
  children,
  busy,
  onPass,
  onAccept,
  label,
}: {
  children: ReactNode;
  busy: boolean;
  onPass: () => void;
  onAccept: () => void;
  label: string;
}) {
  const [offset, setOffset] = useState(0),
    [dragging, setDragging] = useState(false),
    [leaving, setLeaving] = useState(false);
  const origin = useRef<{ x: number; y: number; active: boolean } | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    card = useRef<HTMLElement>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    setOffset(0);
    setDragging(false);
    setLeaving(false);
    origin.current = null;
  }, [label]);
  function settle(direction: "left" | "right") {
    if (busy || leaving) return;
    origin.current = null;
    setDragging(false);
    setLeaving(true);
    setOffset(
      (direction === "left" ? -1 : 1) *
        (card.current?.clientWidth || 320) *
        1.2,
    );
    const action = direction === "left" ? onPass : onAccept;
    timer.current = setTimeout(() => {
      setOffset(0);
      setLeaving(false);
      action();
    }, 180);
  }
  function start(event: PointerEvent<HTMLElement>) {
    if (
      busy ||
      leaving ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button,a,input")
    )
      return;
    origin.current = { x: event.clientX, y: event.clientY, active: false };
  }
  function move(event: PointerEvent<HTMLElement>) {
    const gesture = origin.current;
    if (!gesture || busy || leaving) return;
    const dx = event.clientX - gesture.x,
      dy = event.clientY - gesture.y;
    if (!gesture.active) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        origin.current = null;
        return;
      }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      gesture.active = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    setOffset(Math.max(-300, Math.min(300, dx)));
  }
  function end(event: PointerEvent<HTMLElement>) {
    const gesture = origin.current;
    if (!gesture) return;
    origin.current = null;
    const dx = event.clientX - gesture.x;
    if (
      gesture.active &&
      Math.abs(dx) > Math.min(85, (card.current?.clientWidth || 320) * 0.24)
    )
      settle(dx < 0 ? "left" : "right");
    else {
      setOffset(0);
      setDragging(false);
    }
  }
  return (
    <div className="tr-trail-deck">
      <article
        ref={card}
        className={`tr-trail-hero tr-swipe-card ${dragging ? "tr-swipe-dragging" : ""} ${leaving ? "tr-swipe-leaving" : ""}`}
        style={{
          transform: `translate3d(${offset}px,0,0) rotate(${offset / 24}deg)`,
          opacity: leaving ? 0.25 : 1,
        }}
        tabIndex={0}
        aria-label={`${label}. Swipe left for another topic or right to start.`}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          origin.current = null;
          setOffset(0);
          setDragging(false);
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            settle(event.key === "ArrowLeft" ? "left" : "right");
          }
        }}
      >
        <span
          className={`tr-swipe-stamp ${offset < 0 ? "tr-swipe-pass" : "tr-swipe-accept"}`}
          style={{ opacity: Math.min(1, Math.abs(offset) / 65) }}
          aria-hidden="true"
        >
          {offset < 0 ? "NEXT TOPIC" : "LET'S GO"}
        </span>
        {children}
      </article>
    </div>
  );
}
