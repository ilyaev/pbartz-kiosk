import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import { parseJson } from "./utils/json";

export class TaskExecutionException extends Error {
  command: { goto: number | string; input: any; retry?: boolean };
  constructor(command: { goto: number | string; input: any; retry?: boolean }) {
    super("COMMAND:" + JSON.stringify(command));
    this.name = "DebugCommandError";
    this.command = command;
  }
}

export interface Task {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PAUSED";
  currentStep: number;
  inputForCurrentStep: any;
  history: { step: number; output: any; timestamp: string }[];
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  outputFile?: string | null;
  score?: number | null;
  inputSeed?: string | null;
  inputSource?: string | null;
  inputSourceUrl?: string | null;
  findOutputByStep: (step: number | string) => string;
}

class TaskQueue {
  private db: Database.Database;
  private steps: AgentCallFunc[] | { [key: string]: AgentCallFunc };

  constructor(
    dbPath: string,
    steps: AgentCallFunc[] | { [key: string]: AgentCallFunc }
  ) {
    this.db = new Database(dbPath);
    this.steps = steps;
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // This is idempotent - it will only create the table if it doesn't exist.
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                currentStep INTEGER NOT NULL,
                inputForCurrentStep TEXT,
                history TEXT,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                retryCount INTEGER DEFAULT 0,
                outputFile TEXT DEFAULT NULL,
                score INTEGER DEFAULT NULL,
                inputSeed TEXT DEFAULT NULL,
                inputSource TEXT DEFAULT NULL,
                inputSourceUrl TEXT DEFAULT NULL
            );
        `);
  }

  /**
   * Starts a new chain of tasks and returns the unique task ID.
   */
  public startChain(initialInput: any): string {
    const taskId = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
            INSERT INTO tasks (id, status, currentStep, inputForCurrentStep, history, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

    stmt.run(
      taskId,
      "PENDING",
      0,
      JSON.stringify(initialInput),
      "[]", // Start with an empty history
      now,
      now
    );

    console.log(`[SYSTEM] New task chain started with ID: ${taskId}`);
    return taskId;
  }

  /**
   * Retrieves the current state of a task.
   */
  public getTaskStatus(taskId: string): Task | null {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE id = ?");
    const row: any = stmt.get(taskId);

    if (!row) {
      return null;
    }

    // Deserialize JSON fields
    return {
      ...row,
      inputForCurrentStep: JSON.parse(row.inputForCurrentStep),
      history: JSON.parse(row.history),
    };
  }

  /**
   * Finds a pending task and atomically locks it for processing by setting its status to 'RUNNING'.
   * This is the core of the worker's polling logic.
   */
  public findAndLockTask(): Task | null {
    // Using a transaction ensures that finding and updating the status is an atomic operation.
    // This prevents multiple workers from grabbing the same task in a concurrent environment.
    const findAndLock = this.db.transaction(() => {
      const findStmt = this.db.prepare(`
                SELECT * FROM tasks WHERE status = 'PENDING' ORDER BY createdAt ASC LIMIT 1
            `);
      const taskRow: any = findStmt.get();

      if (taskRow) {
        const updateStmt = this.db.prepare(`
                    UPDATE tasks SET status = 'RUNNING', updatedAt = ? WHERE id = ?
                `);
        updateStmt.run(new Date().toISOString(), taskRow.id);
        return taskRow;
      }
      return null;
    });

    const lockedTaskRow = findAndLock();
    if (!lockedTaskRow) {
      return null;
    }

    const history = parseJson(lockedTaskRow.history || "[]");

    return {
      ...lockedTaskRow,
      inputForCurrentStep: JSON.parse(lockedTaskRow.inputForCurrentStep),
      history,
      findOutputByStep: (step: number | string) => {
        const stepHistory = history.findLast((h: any) =>
          typeof step === "number" ? h.step === step : h.stepKey === step
        );
        return stepHistory ? stepHistory.output : null;
      },
    };
  }

  public updateGotoStep(
    taskId: string,
    gotoStep: number,
    history: any[],
    input: any,
    currentStep: number = 0,
    output: any = null,
    retry: number = 0,
    task: Task,
    stepKey: string
  ) {
    const newHistory = [
      ...history,
      {
        step: currentStep,
        stepKey,
        output,
        timestamp: new Date().toISOString(),
      },
    ];
    const stmt = this.db.prepare(`
            UPDATE tasks
            SET status = ?, currentStep = ?, inputForCurrentStep = ?, history = ?, updatedAt = ?, retryCount = ?, score = ?
            WHERE id = ?
        `);

    stmt.run(
      "PENDING", // Reset status to PENDING for the new step
      gotoStep,
      JSON.stringify(input),
      JSON.stringify(newHistory),
      new Date().toISOString(),
      retry,
      task.score, // Keep the same score
      taskId
    );
  }

  /**
   * Updates a task after a step has been successfully completed.
   */
  public updateTaskSuccess(
    taskId: string,
    currentStep: number,
    history: any[],
    output: any,
    input: any,
    task: Task,
    stepKey: string
  ) {
    const isLastStep =
      currentStep ===
      (typeof this.steps === "object"
        ? Object.keys(this.steps).length - 1
        : (this.steps as AgentCallFunc[]).length - 1);
    const newStatus = isLastStep ? "COMPLETED" : "PENDING";
    const newHistory = [
      ...history,
      {
        step: currentStep,
        stepKey: stepKey,
        input,
        output,
        timestamp: new Date().toISOString(),
      },
    ];

    const stmt = this.db.prepare(`
            UPDATE tasks
            SET status = ?, currentStep = ?, inputForCurrentStep = ?, history = ?, updatedAt = ?, score = ?, outputFile = ?, inputSeed = ?, inputSource = ?, inputSourceUrl = ?
            WHERE id = ?
        `);

    stmt.run(
      newStatus,
      currentStep + 1,
      JSON.stringify(output), // The output of this step is the input for the next
      JSON.stringify(newHistory),
      new Date().toISOString(),
      task.score,
      task.outputFile,
      task.inputSeed,
      task.inputSource,
      task.inputSourceUrl,
      taskId
    );
  }

  /**
   * Updates a task when a step has failed.
   */
  public updateTaskFailure(
    taskId: string,
    currentStep: number,
    history: any[],
    error: Error,
    stepKey: string
  ) {
    const newHistory = [
      ...history,
      {
        step: currentStep,
        stepKey,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    ];

    const stmt = this.db.prepare(`
            UPDATE tasks
            SET status = 'FAILED', history = ?, updatedAt = ?
            WHERE id = ?
        `);

    stmt.run(JSON.stringify(newHistory), new Date().toISOString(), taskId);
  }

  stop() {
    this.db
      .prepare(`UPDATE tasks SET status = 'PENDING' WHERE status = 'RUNNING'`)
      .run();
    this.db.close();
  }
}

export type AgentCallFunc = (input: any, task: Task) => Promise<any>;

export const workflow = (
  wfName: string,
  steps: AgentCallFunc[] | { [s: string]: AgentCallFunc },
  params: { maxRetries: number } = { maxRetries: 3 }
) => {
  const DB_PATH = `./workflow_${wfName}.sqlite`;
  const POLLING_INTERVAL_MS = 2000;

  const AGENT_CHAIN = steps;

  async function workerLoop(queue: TaskQueue) {
    console.log(`[WORKER] Starting ${wfName} workflow worker loop...`);

    while (true) {
      const task = queue.findAndLockTask();

      if (task) {
        let stepKey =
          typeof AGENT_CHAIN === "object"
            ? Object.keys(AGENT_CHAIN)[task.currentStep]
            : task.currentStep;

        console.log(`[WORKER] Picked up task ${task.id}, step ${stepKey}.`);

        const agentFunction =
          typeof AGENT_CHAIN === "object"
            ? (AGENT_CHAIN as { [key: string]: AgentCallFunc })[stepKey]
            : AGENT_CHAIN[stepKey];

        try {
          // Execute the current agent in the chain
          const output = await agentFunction(task.inputForCurrentStep, task);
          console.log(`[WORKER] Task ${task.id}, step ${stepKey} succeeded.`);

          // Update the task state for the next step
          queue.updateTaskSuccess(
            task.id,
            task.currentStep,
            task.history,
            output,
            task.inputForCurrentStep,
            task,
            stepKey + ""
          );
        } catch (error: any) {
          if (
            error instanceof TaskExecutionException &&
            task.retryCount < (params.maxRetries || 3)
          ) {
            console.error(
              `[WORKER] TaskExecutionException for task ${task.id}, step ${task.currentStep}: Goto step ${error.command.goto}`,
              error.message
            );

            let gotoStep =
              typeof error.command.goto === "number"
                ? error.command.goto
                : Object.keys(AGENT_CHAIN).indexOf(error.command.goto);

            queue.updateGotoStep(
              task.id,
              gotoStep,
              task.history,
              error.command.input,
              task.currentStep,
              "Goto step " +
                error.command.goto +
                " with input: " +
                error.command.input,
              task.retryCount + (error.command.retry ? 1 : 0),
              task,
              stepKey + ""
            );
          } else {
            console.error(
              `[WORKER] Task ${task.id}, step ${task.currentStep} FAILED:`,
              JSON.stringify(error.message).slice(0, 100)
            );

            // Mark the task as failed
            queue.updateTaskFailure(
              task.id,
              task.currentStep,
              task.history,
              error,
              stepKey + ""
            );
          }
        }
      } else {
        // No tasks to process, wait before polling again
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVAL_MS)
        );
      }
    }
  }

  const queue = new TaskQueue(DB_PATH, steps);

  const onCloseSignal = async () => {
    console.log(
      `[WORKER] sigint received, shutting down worker ${wfName} loop`
    );
    queue.stop();
  };
  process.on("SIGINT", onCloseSignal);
  process.on("SIGTERM", onCloseSignal);

  return {
    queue,
    start: () => {
      workerLoop(queue).catch((err) =>
        console.error("Worker loop crashed:", err)
      );
    },
    stop: () => {
      console.log("[WORKER] Stopping worker loop...");
    },
  };
};
