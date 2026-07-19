"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw } from "lucide-react";

type RetryAllResult = {
  queued?: number;
  failed?: number;
  total?: number;
  error?: string;
};

const RETRY_BUTTON_TEXT = "Retry failed targets";

function findPublishingHeading() {
  return document.querySelector<HTMLElement>(
    ".publishing-layout .data-panel > .panel-heading",
  );
}

function countRetryButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      ".publishing-layout .publish-row > button",
    ),
  ).filter((button) => button.textContent?.includes(RETRY_BUTTON_TEXT)).length;
}

export function PublishingRetryControls() {
  const [heading, setHeading] = useState<HTMLElement | null>(null);
  const [retryableCount, setRetryableCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const syncWithPublishingPage = useCallback(() => {
    const nextHeading = findPublishingHeading();
    setHeading((current) => (current === nextHeading ? current : nextHeading));
    setRetryableCount(countRetryButtons());
  }, []);

  useEffect(() => {
    syncWithPublishingPage();
    const observer = new MutationObserver(syncWithPublishingPage);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => observer.disconnect();
  }, [syncWithPublishingPage]);

  async function retryAll() {
    if (pending || retryableCount === 0) return;
    const confirmed = window.confirm(
      `Retry failed platform targets for ${retryableCount} ${retryableCount === 1 ? "post" : "posts"}? Already-published targets will not be reposted.`,
    );
    if (!confirmed) return;

    setPending(true);
    setFeedback("");
    try {
      const response = await fetch("/api/posts/retry-all", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as RetryAllResult;
      if (!response.ok) {
        throw new Error(body.error || "Could not retry failed posts.");
      }

      const queued = body.queued ?? 0;
      const failed = body.failed ?? 0;
      setFeedback(
        failed
          ? `${queued} queued; ${failed} could not be queued.`
          : queued
            ? `${queued} ${queued === 1 ? "retry" : "retries"} queued.`
            : "No failed posts remain.",
      );

      const refreshButton = Array.from(
        heading?.querySelectorAll<HTMLButtonElement>("button") ?? [],
      ).find((button) => button.textContent?.trim() === "Refresh");
      refreshButton?.click();
      window.setTimeout(syncWithPublishingPage, 350);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Could not retry failed posts.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <style jsx global>{`
        .publish-row > .button.secondary.small {
          grid-column: 2 / -1;
          justify-self: start;
          min-width: 166px;
          white-space: nowrap;
        }
        .publishing-retry-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }
        .publishing-retry-feedback {
          max-width: 220px;
          color: var(--muted);
          font-size: 10px;
          line-height: 1.35;
          text-align: right;
        }
        @media (max-width: 760px) {
          .publishing-layout .panel-heading {
            flex-wrap: wrap;
          }
          .publishing-retry-actions {
            width: 100%;
            flex-wrap: wrap;
          }
          .publishing-retry-actions .button {
            flex: 1;
          }
          .publishing-retry-feedback {
            max-width: none;
            flex-basis: 100%;
            text-align: left;
          }
          .publish-row > .button.secondary.small {
            grid-column: 1 / -1;
            width: 100%;
          }
        }
      `}</style>
      {heading
        ? createPortal(
            <div className="publishing-retry-actions">
              {feedback ? (
                <span className="publishing-retry-feedback" role="status">
                  {feedback}
                </span>
              ) : null}
              <button
                className="button secondary"
                disabled={pending || retryableCount === 0}
                onClick={retryAll}
                title={
                  retryableCount
                    ? "Retry every failed post without reposting successful targets"
                    : "No failed posts to retry"
                }
              >
                <RotateCcw className={pending ? "spin" : undefined} size={16} />
                {pending
                  ? "Retrying…"
                  : `Retry all failed${retryableCount ? ` (${retryableCount})` : ""}`}
              </button>
            </div>,
            heading,
          )
        : null}
    </>
  );
}
