import { useContext, type ContextType } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { OwnerAuthContext } from "@/components/providers/owner-auth-context.ts";
import { getOwner } from "@/lib/api/auth.ts";
import {
  getCurrentFocusSession,
  saveFocusSessionNote,
  startFocusSession,
  switchFocusSession,
  transitionFocusSession,
  type FocusSession,
} from "@/lib/api/project-focus.ts";
import {
  assertOnline,
  reconcileFocusSession,
  refreshFocus,
} from "./focus-data.ts";

export type FocusIntent =
  | {
      action: "start";
      taskId: string;
      key: string;
      expectedActiveId: null;
    }
  | {
      action: "switch";
      taskId: string;
      key: string;
      expectedActiveId: string;
      noteUpdate?: FocusIntentNoteUpdate;
    }
  | {
      action: "pause";
      session: FocusSession;
      noteUpdate?: FocusIntentNoteUpdate;
    }
  | {
      action: "resume" | "finish";
      session: FocusSession;
      verify?: boolean;
    };

export interface FocusIntentNoteUpdate {
  sessionId: string;
  note: string | null;
  expectedUpdatedAt: string;
}

export interface FocusNoteIntent {
  sessionId: string;
  note: string | null;
  expectedUpdatedAt: string;
}

async function assertFocusOwner(auth: ContextType<typeof OwnerAuthContext>) {
  if (auth?.owner) {
    const owner = await getOwner();
    if (owner.username !== auth.owner.username) {
      await auth.checkSession();
      throw new Error(
        "The signed-in account changed. Review this account's work before continuing.",
      );
    }
  }
}

/** Retain the exact intent/key for explicit retries after unknown outcomes. */
export async function executeFocusIntent(intent: FocusIntent, replay = false) {
  assertOnline();
  const current = await getCurrentFocusSession();
  if (intent.action === "start") {
    // A matching-key replay may return an already active record.
    if ((!replay || current?.task_id !== intent.taskId) && current !== null)
      throw new Error(
        "Active work changed in another tab. Refresh and choose again; no new transition was sent.",
      );
    return startFocusSession({
      task_id: intent.taskId,
      idempotency_key: intent.key,
    });
  }
  if (intent.action === "switch") {
    // A committed switch can be retried with the same key after the response
    // was lost; the server will replay it even though the target is now active.
    if (
      (!replay || current?.task_id !== intent.taskId) &&
      current?.id !== intent.expectedActiveId
    ) {
      throw new Error(
        "The active session changed in another tab. Refresh and review the current session before switching.",
      );
    }
    const base = {
      task_id: intent.taskId,
      idempotency_key: intent.key,
      expected_active_session_id: intent.expectedActiveId,
    };
    if (!intent.noteUpdate) return switchFocusSession(base);
    if (intent.noteUpdate.sessionId !== intent.expectedActiveId)
      throw new Error(
        "The note draft belongs to a different FocusSession. Review current work before switching.",
      );
    return switchFocusSession({
      ...base,
      resume_note: intent.noteUpdate.note,
      expected_updated_at: intent.noteUpdate.expectedUpdatedAt,
    });
  }
  if (!replay && intent.action === "pause" && current?.id !== intent.session.id)
    throw new Error(
      "This session is no longer active. Refresh before saving a pause note.",
    );
  if (intent.action === "resume" && current && current.id !== intent.session.id)
    throw new Error(
      "Another session is active. Return to that work or pause it before resuming.",
    );
  if (intent.action === "pause") {
    if (!intent.noteUpdate)
      return transitionFocusSession(intent.session.id, "pause");
    if (intent.noteUpdate.sessionId !== intent.session.id)
      throw new Error(
        "The note draft belongs to a different FocusSession. Refresh before pausing.",
      );
    return transitionFocusSession(intent.session.id, "pause", {
      resume_note: intent.noteUpdate.note,
      expected_updated_at: intent.noteUpdate.expectedUpdatedAt,
    });
  }
  return transitionFocusSession(intent.session.id, intent.action);
}

export function useFocusAction() {
  const client = useQueryClient();
  const auth = useContext(OwnerAuthContext);
  return useMutation({
    mutationKey: ["projects", "focus", "write"],
    retry: false,
    // Do not use Query's default paused/offline mutation queue.
    networkMode: "always",
    mutationFn: async ({
      intent,
      replay,
    }: {
      intent: FocusIntent;
      replay?: boolean;
    }) => {
      assertOnline();
      await assertFocusOwner(auth);
      return executeFocusIntent(intent, replay);
    },
    onSettled: () => refreshFocus(client),
  });
}

export function useFocusNoteAction() {
  const client = useQueryClient();
  const auth = useContext(OwnerAuthContext);
  return useMutation({
    mutationKey: ["projects", "focus", "note-write"],
    retry: false,
    networkMode: "always",
    mutationFn: async (intent: FocusNoteIntent) => {
      assertOnline();
      await assertFocusOwner(auth);
      return saveFocusSessionNote({
        id: intent.sessionId,
        resume_note: intent.note,
        expected_updated_at: intent.expectedUpdatedAt,
      });
    },
    onSuccess: (session) => reconcileFocusSession(client, session),
    onSettled: () => refreshFocus(client),
  });
}
