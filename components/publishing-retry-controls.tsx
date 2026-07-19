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

function findRetryButtons() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>(
      ".publishing-layout .publish-row > button",
    ),
  ).filter((button) => button.textContent?.includes(RETRY_BUTTON_TEXT));
}

export function PublishingRetryControls() {
  const [heading, setHeading] = useState<HTMLElement | null>(null);
  const [retryableCount, setRetryableCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const syncWithPublishingPage = useCallback(() => {
    const nextHeading = findPublishingHeading();
    const retryButtons = findRetryButtons();

    for (const button of retryButtons) {
      button.setAttribute(
        "title",
        "Try this post again. Only failed channels will be retried.",
      );
      button.setAttribute("aria-label", "Try this post again");
    }

    setHeading((current) => (current === nextHeading ? current : nextHeading));
    setRetryableCount(retryButtons.length);
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
      `Try ${retryableCount} failed ${retryableCount === 1 ? "post" : "posts"} again? Already-published channels will not be reposted.`,
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
          ? `${queued} queued · ${failed} still failed`
          : queued
            ? `${queued} ${queued === 1 ? "post" : "posts"} queued`
            : "No failed posts remain",
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
      <style>{`
        .publishing-layout .panel-heading {
          flex-wrap: wrap;
        }

        .publishing-layout .panel-heading > div:first-child {
          margin-right: auto;
        }

        .publishing-layout .panel-heading > .button.ghost {
          order: 3;
        }

        .publishing-retry-actions {
          order: 2;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .publishing-retry-actions .button {
          min-height: 42px;
          border-color: #e6001e;
          border-radius: 10px;
          padding: 0 16px;
          color: #fff;
          background: #e6001e;
          box-shadow: 0 6px 15px rgba(230, 0, 30, 0.16);
          font-size: 12px;
          font-weight: 750;
          white-space: nowrap;
        }

        .publishing-retry-actions .button:hover:not(:disabled) {
          border-color: #bd0019;
          background: #bd0019;
          transform: translateY(-1px);
        }

        .publishing-retry-actions .button:focus-visible,
        .publish-row > .button.secondary.small:focus-visible {
          outline: 3px solid rgba(230, 0, 30, 0.2);
          outline-offset: 2px;
        }

        .publishing-retry-feedback {
          max-width: 230px;
          border-radius: 999px;
          padding: 6px 10px;
          color: #4f5d6c;
          background: #f1f3f5;
          font-size: 10px;
          font-weight: 650;
          line-height: 1.3;
          text-align: right;
        }

        .publish-row > .button.secondary.small {
          grid-column: 2 / -1 !important;
          justify-self: start;
          min-width: 132px;
          min-height: 40px;
          gap: 7px;
          border: 1px solid #e6001e;
          border-radius: 10px;
          padding: 0 15px;
          color: #e6001e;
          background: #fff;
          box-shadow: 0 4px 12px rgba(230, 0, 30, 0.08);
          font-size: 0;
          white-space: nowrap;
        }

        .publish-row > .button.secondary.small::after {
          content: "Try again";
          font-size: 12px;
          font-weight: 750;
        }

        .publish-row > .button.secondary.small:hover:not(:disabled) {
          color: #fff;
          background: #e6001e;
          transform: translateY(-1px);
        }

        .publish-row > .button.secondary.small:disabled {
          cursor: wait;
          opacity: 0.58;
        }

        .publish-row > .button.secondary.small:disabled::after {
          content: "Retrying…";
        }

        @media (max-width: 760px) {
          .publishing-layout .panel-heading {
            align-items: stretch;
          }

          .publishing-layout .panel-heading > div:first-child {
            flex-basis: 100%;
          }

          .publishing-retry-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .publishing-retry-actions .button,
          .publishing-layout .panel-heading > .button.ghost {
            flex: 1;
          }

          .publishing-retry-feedback {
            max-width: none;
            flex-basis: 100%;
            text-align: left;
          }

          .publish-row > .button.secondary.small {
            grid-column: 1 / -1 !important;
            width: 100%;
            justify-self: stretch;
          }
        }
      `}</style>
      {heading
        ? createPortal(
            <div className="publishing-retry-actions">
              {feedback ? (
                <span
                  className="publishing-retry-feedback"
                  role="status"
                  aria-live="polite"
                >
                  {feedback}
                </span>
              ) : null}
              <button
                className="button"
                disabled={pending || retryableCount === 0}
                onClick={retryAll}
                title={
                  retryableCount
                    ? "Try every failed post again without reposting successful channels"
                    : "No failed posts to retry"
                }
              >
                <RotateCcw className={pending ? "spin" : undefined} size={16} />
                {pending
                  ? "Retrying…"
                  : retryableCount
                    ? `Retry all failed (${retryableCount})`
                    : "No failed posts"}
              </button>
            </div>,
            heading,
          )
        : null}
    </>
  );
}
