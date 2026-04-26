import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { z } from "zod";

import type { ProviderName, ProviderLifecycleEvent } from "./provider-adapters";
import { writeTextFile } from "./fs-utils";

const PROVIDER_OUTPUT_EVENT_INTERVAL_MS = 30_000;
const runtimeProviderSchema = z.enum(["claude-code", "codex", "copilot"]);

const runtimeStreamPathsSchema = z
  .object({
    stdoutPath: z.string().min(1),
    stderrPath: z.string().min(1),
  })
  .strict();

const runtimeProgressPathsSchema = z
  .object({
    statusPath: z.string().min(1),
    progressPath: z.string().min(1),
  })
  .strict();

export const runtimeStatusStateSchema = z.enum([
  "running",
  "completed",
  "failed",
]);

export const runtimeProgressEventNameSchema = z.enum([
  "command-started",
  "provider-spawned",
  "first-output-received",
  "provider-output",
  "stalled",
  "provider-exit",
  "timeout",
  "completed",
  "failed",
  "initial-pass-started",
  "initial-pass-completed",
  "self-review-pass-started",
  "self-review-pass-completed",
  "verifier-started",
  "verifier-completed",
]);

const runtimeProgressMetadataSchema = z.record(z.string(), z.unknown());

export const runtimeProgressEventSchema = z
  .object({
    timestamp: z.string().min(1),
    command: z.string().min(1),
    phase: z.string().min(1),
    event: runtimeProgressEventNameSchema,
    summary: z.string().min(1),
    metadata: runtimeProgressMetadataSchema.optional(),
  })
  .strict();

export const runtimeStatusSchema = z
  .object({
    command: z.string().min(1),
    status: runtimeStatusStateSchema,
    phase: z.string().min(1),
    startedAt: z.string().min(1),
    updatedAt: z.string().min(1),
    lastOutputAt: z.string().min(1).nullable(),
    stalledAt: z.string().min(1).nullable().optional(),
    provider: runtimeProviderSchema,
    pid: z.number().int().positive().nullable(),
    cwd: z.string().min(1),
    timeoutMs: z.number().int().positive(),
    configuredStartupTimeoutMs: z.number().int().positive().optional(),
    configuredSilenceTimeoutMs: z.number().int().positive().optional(),
    artifactPath: z.string().min(1),
    streamPaths: runtimeStreamPathsSchema,
    progressPaths: runtimeProgressPathsSchema,
    lastEvent: runtimeProgressEventNameSchema,
    lastEventSummary: z.string().min(1),
    selfReviewPassesCompleted: z.number().int().nonnegative().optional(),
    selfReviewPassesPlanned: z.number().int().nonnegative().optional(),
    verifiersCompleted: z.number().int().nonnegative().optional(),
    verifiersPlanned: z.number().int().positive().optional(),
  })
  .strict();

export type RuntimeStatusState = z.infer<typeof runtimeStatusStateSchema>;
export type RuntimeProgressEventName = z.infer<
  typeof runtimeProgressEventNameSchema
>;
export type RuntimeProgressEvent = z.infer<typeof runtimeProgressEventSchema>;
export type RuntimeStatus = z.infer<typeof runtimeStatusSchema>;
export type RuntimeStreamPaths = RuntimeStatus["streamPaths"];
export type RuntimeProgressPaths = RuntimeStatus["progressPaths"];

export interface RuntimeProgressTrackerInput {
  command: string;
  phase: string;
  provider: ProviderName;
  cwd: string;
  timeoutMs: number;
  configuredStartupTimeoutMs?: number;
  configuredSilenceTimeoutMs?: number;
  artifactPath: string;
  streamPaths: RuntimeStreamPaths;
  progressPaths: RuntimeProgressPaths;
  selfReviewPassesCompleted?: number;
  selfReviewPassesPlanned?: number;
  verifiersCompleted?: number;
  verifiersPlanned?: number;
}

export class RuntimeProgressTracker {
  private status: RuntimeStatus;
  private writeChain = Promise.resolve();
  private firstOutputReceived = false;
  private lastProviderOutputEventAt: number | null = null;

  private constructor(status: RuntimeStatus) {
    this.status = status;
  }

  static async start(
    input: RuntimeProgressTrackerInput
  ): Promise<RuntimeProgressTracker> {
    await Promise.all([
      mkdir(dirname(input.progressPaths.statusPath), { recursive: true }),
      mkdir(dirname(input.progressPaths.progressPath), { recursive: true }),
    ]);

    const timestamp = new Date().toISOString();
    const tracker = new RuntimeProgressTracker(
      runtimeStatusSchema.parse({
        command: input.command,
        status: "running",
        phase: input.phase,
        startedAt: timestamp,
        updatedAt: timestamp,
        lastOutputAt: null,
        provider: input.provider,
        pid: null,
        cwd: input.cwd,
        timeoutMs: input.timeoutMs,
        ...(typeof input.configuredStartupTimeoutMs === "number"
          ? {
              configuredStartupTimeoutMs: input.configuredStartupTimeoutMs,
            }
          : {}),
        ...(typeof input.configuredSilenceTimeoutMs === "number"
          ? {
              configuredSilenceTimeoutMs: input.configuredSilenceTimeoutMs,
            }
          : {}),
        artifactPath: input.artifactPath,
        streamPaths: input.streamPaths,
        progressPaths: input.progressPaths,
        lastEvent: "command-started",
        lastEventSummary: `${input.command} started.`,
        ...(typeof input.selfReviewPassesCompleted === "number"
          ? {
              selfReviewPassesCompleted: input.selfReviewPassesCompleted,
            }
          : {}),
        ...(typeof input.selfReviewPassesPlanned === "number"
          ? {
              selfReviewPassesPlanned: input.selfReviewPassesPlanned,
            }
          : {}),
        ...(typeof input.verifiersCompleted === "number"
          ? {
              verifiersCompleted: input.verifiersCompleted,
            }
          : {}),
        ...(typeof input.verifiersPlanned === "number"
          ? {
              verifiersPlanned: input.verifiersPlanned,
            }
          : {}),
      })
    );

    await tracker.recordEvent({
      phase: input.phase,
      event: "command-started",
      summary: `${input.command} started.`,
    });

    return tracker;
  }

  async flush(): Promise<void> {
    await this.writeChain;
  }

  recordEvent(input: {
    phase?: string;
    event: RuntimeProgressEventName;
    summary: string;
    metadata?: Record<string, unknown>;
    status?: RuntimeStatusState;
    patch?: Partial<Omit<RuntimeStatus, "streamPaths" | "progressPaths">>;
    lastOutputAt?: string | null;
  }): Promise<void> {
    const timestamp = new Date().toISOString();

    return this.enqueue(async () => {
      if (input.phase) {
        this.status.phase = input.phase;
      }
      if (input.status) {
        this.status.status = input.status;
      }
      if (input.patch) {
        Object.assign(this.status, input.patch);
      }
      if (typeof input.lastOutputAt !== "undefined") {
        this.status.lastOutputAt = input.lastOutputAt;
      }

      this.status.updatedAt = timestamp;
      this.status.lastEvent = input.event;
      this.status.lastEventSummary = input.summary;

      await appendFile(
        this.status.progressPaths.progressPath,
        `${JSON.stringify(
          runtimeProgressEventSchema.parse({
            timestamp,
            command: this.status.command,
            phase: this.status.phase,
            event: input.event,
            summary: input.summary,
            ...(input.metadata ? { metadata: input.metadata } : {}),
          })
        )}\n`
      );
      await this.writeStatus();
    });
  }

  markCompleted(
    summary: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return this.recordEvent({
      phase: "finalizing",
      event: "completed",
      summary,
      metadata,
      status: "completed",
    });
  }

  markFailed(
    summary: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return this.recordEvent({
      phase: "finalizing",
      event: "failed",
      summary,
      metadata,
      status: "failed",
    });
  }

  async updateSnapshot(input: {
    patch?: Partial<Omit<RuntimeStatus, "streamPaths" | "progressPaths">>;
    lastOutputAt?: string | null;
  }): Promise<void> {
    const timestamp = new Date().toISOString();

    return this.enqueue(async () => {
      if (input.patch) {
        Object.assign(this.status, input.patch);
      }
      if (typeof input.lastOutputAt !== "undefined") {
        this.status.lastOutputAt = input.lastOutputAt;
      }
      this.status.updatedAt = timestamp;
      await this.writeStatus();
    });
  }

  handleProviderLifecycle(event: ProviderLifecycleEvent): void {
    switch (event.type) {
      case "provider-spawned": {
        void this.recordEvent({
          event: "provider-spawned",
          summary:
            typeof event.pid === "number"
              ? `Provider spawned with pid ${event.pid}.`
              : "Provider spawned.",
          metadata:
            typeof event.pid === "number"
              ? {
                  pid: event.pid,
                }
              : undefined,
          patch: {
            pid: event.pid,
          },
        });
        return;
      }
      case "output": {
        const lastOutputAt = event.timestamp;
        if (!this.firstOutputReceived) {
          this.firstOutputReceived = true;
          this.lastProviderOutputEventAt = Date.parse(event.timestamp);
          void this.recordEvent({
            event: "first-output-received",
            summary: `First provider ${event.stream} output received.`,
            metadata: {
              stream: event.stream,
            },
            lastOutputAt,
          });
          return;
        }

        const currentEventAt = Date.parse(event.timestamp);
        if (
          this.lastProviderOutputEventAt === null ||
          currentEventAt - this.lastProviderOutputEventAt >=
            PROVIDER_OUTPUT_EVENT_INTERVAL_MS
        ) {
          this.lastProviderOutputEventAt = currentEventAt;
          void this.recordEvent({
            event: "provider-output",
            summary: `Provider ${event.stream} output continues.`,
            metadata: {
              stream: event.stream,
            },
            lastOutputAt,
          });
          return;
        }

        void this.updateSnapshot({
          lastOutputAt,
        });
        return;
      }
      case "timeout": {
        void this.recordEvent({
          event: "timeout",
          summary: `Provider timed out after ${event.elapsedMs}ms.`,
          metadata: {
            elapsedMs: event.elapsedMs,
            configuredTimeoutMs: event.configuredTimeoutMs,
          },
          status: "failed",
        });
        return;
      }
      case "stalled": {
        void this.recordEvent({
          event: "stalled",
          summary: `Provider stalled after ${event.silenceMs}ms without output.`,
          metadata: {
            silenceMs: event.silenceMs,
            configuredSilenceTimeoutMs: event.configuredSilenceTimeoutMs,
            configuredStartupTimeoutMs: event.configuredStartupTimeoutMs,
          },
          status: "failed",
          patch: {
            stalledAt: event.timestamp,
          },
        });
        return;
      }
      case "provider-exit": {
        void this.recordEvent({
          event: "provider-exit",
          summary:
            typeof event.exitCode === "number"
              ? `Provider exited with code ${event.exitCode}.`
              : "Provider exited.",
          metadata: {
            exitCode: event.exitCode,
            signal: event.signal,
            elapsedMs: event.elapsedMs,
            configuredTimeoutMs: event.configuredTimeoutMs,
          },
        });
      }
    }
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    this.writeChain = this.writeChain.then(task, task);
    return this.writeChain;
  }

  private async writeStatus(): Promise<void> {
    await writeTextFile(
      this.status.progressPaths.statusPath,
      `${JSON.stringify(runtimeStatusSchema.parse(this.status), null, 2)}\n`
    );
  }
}
