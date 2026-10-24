"use client";
import {
  Children,
  cloneElement,
  Fragment,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type FormHTMLAttributes,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function flattenScreens(
  children: ReactNode,
  prefix = "screen",
): ReactNode[] {
  return Children.toArray(children).flatMap((child, index) => {
    const key =
      prefix + "/" + (isValidElement(child) ? (child.key ?? index) : index);
    if (
      isValidElement<{ children?: ReactNode }>(child) &&
      child.type === Fragment
    )
      return flattenScreens(child.props.children, key);
    return [isValidElement(child) ? cloneElement(child, { key }) : child];
  });
}
export function useAppViewport() {
  useEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height || innerHeight;
      document.documentElement.style.setProperty(
        "--app-height",
        `${Math.round(height)}px`,
      );
      document.documentElement.style.setProperty(
        "--app-top",
        `${Math.round(viewport?.offsetTop || 0)}px`,
      );
      document.documentElement.dataset.keyboard = String(
        innerHeight - height > 120,
      );
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
    };
  }, []);
}
export function ViewportPages({
  children,
  validate = false,
  label = "Page",
  resetKey,
}: {
  children: ReactNode;
  validate?: boolean;
  label?: string;
  resetKey?: string;
}) {
  const items = useMemo(
    () =>
      flattenScreens(children).filter(
        (c) => c !== false && c !== null && c !== "",
      ),
    [children],
  );
  const area = useRef<HTMLDivElement>(null),
    [groups, setGroups] = useState<number[][]>([[]]),
    [page, setPage] = useState(0),
    [measured, setMeasured] = useState(false);
  useEffect(() => setPage(0), [resetKey]);
  useLayoutEffect(() => {
    const element = area.current;
    if (!element) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const limit = element.clientHeight;
        const nodes = [...element.children] as HTMLElement[];
        const next: number[][] = [];
        let current: number[] = [],
          used = 0;
        nodes.forEach((node, index) => {
          const height = Math.ceil(node.getBoundingClientRect().height);
          if (used > 0 && used + height > limit + 1) {
            next.push(current);
            current = [];
            used = 0;
          }
          current.push(index);
          used += height;
        });
        if (current.length) next.push(current);
        if (!next.length) next.push([]);
        setGroups((old) =>
          JSON.stringify(old) === JSON.stringify(next) ? old : next,
        );
        setPage((old) => Math.min(old, next.length - 1));
        setMeasured(true);
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    [...element.children].forEach((child) => observer.observe(child));
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [items.length]);
  const current = groups[Math.min(page, groups.length - 1)] || [];
  function next() {
    if (validate && area.current) {
      for (const index of current) {
        const fields = area.current.children[index]?.querySelectorAll<
          HTMLInputElement | HTMLSelectElement
        >("input,select,textarea");
        for (const field of fields || []) {
          if (!field.checkValidity()) {
            field.reportValidity();
            return;
          }
        }
      }
    }
    setPage((p) => Math.min(p + 1, groups.length - 1));
  }
  return (
    <div className="bz-pages">
      <div
        className="bz-pages-window"
        ref={area}
        onInvalidCapture={(event) => {
          const wrapper = (event.target as HTMLElement).closest<HTMLElement>(
            "[data-page-item]",
          );
          if (wrapper) {
            const index = Number(wrapper.dataset.pageItem);
            const group = groups.findIndex((g) => g.includes(index));
            if (group !== page) setPage(group);
          }
        }}
      >
        {items.map((child, index) => (
          <div
            key={isValidElement(child) ? child.key || index : index}
            data-page-item={index}
            className={`bz-page-item ${measured && !current.includes(index) ? "bz-page-away" : ""}`}
            inert={measured && !current.includes(index) ? true : undefined}
          >
            {child}
          </div>
        ))}
      </div>
      <div
        className={`bz-page-controls ${groups.length < 2 ? "bz-page-controls-empty" : ""}`}
        aria-label={`${label} navigation`}
      >
        {groups.length > 1 && (
          <>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label={`Previous ${label.toLowerCase()}`}
            >
              <ChevronLeft size={17} />
              Back
            </button>
            <span aria-live="polite">
              {page + 1}
              <i> / {groups.length}</i>
            </span>
            <button
              type="button"
              disabled={page === groups.length - 1}
              onClick={next}
              aria-label={`Next ${label.toLowerCase()}`}
            >
              Next
              <ChevronRight size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
export function ViewportForm({
  children,
  ...props
}: FormHTMLAttributes<HTMLFormElement>) {
  return (
    <form {...props} className={`${props.className || ""} bz-viewport-form`}>
      <ViewportPages validate label="Step">
        {children}
      </ViewportPages>
    </form>
  );
}
