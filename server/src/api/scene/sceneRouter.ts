import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";

import { Task, TaskExecutionException, workflow } from "@/workflow";
import { SceneAgentsWorkflow } from "@/utils/agents/scene";

export const sceneRegistry = new OpenAPIRegistry();
export const sceneRouter: Router = express.Router();

const workflowApp = workflow("scene", SceneAgentsWorkflow, { maxRetries: 2 });
workflowApp.start();

const waitFor = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const debugWorkflow = workflow(
  "debug",
  {
    step1: async (input: string) => {
      console.log("Debugging input 1:", input);
      await waitFor(1000); // Simulate some processing time
      return `Debugged: ${input}`;
    },
    step2: async (input: string, task: Task) => {
      console.log("Debugging input 2:", input);
      await waitFor(1000); // Simulate some processing time
      console.log(
        "Current task status:",
        task.status,
        task.findOutputByStep("step1")
      );
      return `Debugged: ${input}`;
    },
    step3: async (input: string) => {
      console.log("Debugging input 3:", input);
      await waitFor(1000); // Simulate some processing time
      return `Debugged: ${input}`;
    },
    step4: async (input: string) => {
      console.log("Debugging input 4:", input);
      await waitFor(1000); // Simulate some processing time
      if (Math.random() < 0.7) {
        throw new TaskExecutionException({
          goto: "step1",
          input: "Starting debug workflow",
          retry: true,
        });
      } else {
        return `Final output: ${input}`;
      }
    },
  },
  {
    maxRetries: 5,
  }
);

debugWorkflow.start();

sceneRegistry.registerPath({
  method: "get",
  path: "/",
  tags: ["scene"],
  responses: createApiResponse(z.null(), "Success"),
});

sceneRouter.get("/debug", async (req: Request, res: Response) => {
  const taskID = debugWorkflow.queue.startChain("INPUT");
  const serviceResponse = ServiceResponse.success("Scene API response", {
    success: true,
    taskID,
  });
  return handleServiceResponse(serviceResponse, res);
});

sceneRouter.get("/debugstatus", async (req: Request, res: Response) => {
  const taskID = req.query.taskID as string;

  if (!taskID) {
    const serviceResponse = ServiceResponse.failure("Task ID is required", {
      statusCode: 400,
    });
    return handleServiceResponse(serviceResponse, res);
  }

  const task = debugWorkflow.queue.getTaskStatus(taskID);
  if (!task) {
    const serviceResponse = ServiceResponse.failure("Task not found", {
      statusCode: 404,
    });
    return handleServiceResponse(serviceResponse, res);
  }

  const serviceResponse = ServiceResponse.success("Task status retrieved", {
    task,
  });
  return handleServiceResponse(serviceResponse, res);
});

sceneRouter.get("/taskstatus", async (req: Request, res: Response) => {
  const taskID = req.query.taskID as string;

  if (!taskID) {
    const serviceResponse = ServiceResponse.failure("Task ID is required", {
      statusCode: 400,
    });
    return handleServiceResponse(serviceResponse, res);
  }

  const task = workflowApp.queue.getTaskStatus(taskID);
  if (!task) {
    const serviceResponse = ServiceResponse.failure("Task not found", {
      statusCode: 404,
    });
    return handleServiceResponse(serviceResponse, res);
  }

  const serviceResponse = ServiceResponse.success("Task status retrieved", {
    task,
  });
  return handleServiceResponse(serviceResponse, res);
});

sceneRouter.get("/task", async (req: Request, res: Response) => {
  const prompt = (req.query.prompt as string) || "";
  const taskID = workflowApp.queue.startChain(prompt);
  const serviceResponse = ServiceResponse.success("Scene API response", {
    success: true,
    taskID,
  });

  return handleServiceResponse(serviceResponse, res);
});
