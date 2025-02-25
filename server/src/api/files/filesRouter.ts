import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import fs from "fs";
import path from "path";

export const filesRegistry = new OpenAPIRegistry();
export const filesRouter: Router = express.Router();

filesRegistry.registerPath({
  method: "get",
  path: "/files",
  tags: ["Files"],
  responses: createApiResponse(z.null(), "Success"),
});

filesRouter.get("/:bucket/:fileName", (req: Request, res: Response) => {
  try {
    const fileName = path.basename(req.params.fileName);
    const bucket = req.params.bucket;

    const filePath = path.join(
      process.env.CACHE_FILES_BASE_PATH || "",
      bucket || "",
      fileName
    );

    if (fs.existsSync(filePath)) {
      res.sendFile(fileName, {
        root:
          process.env.CACHE_FILES_BASE_PATH +
          (bucket !== "index" ? `${bucket}/` : ""),
        headers: {
          "cross-origin-resource-policy": "same-site",
        },
      });
    } else {
      res.status(404).send("File not found");
    }
  } catch (e) {
    res.status(500).send("Error: " + e);
  }
});
