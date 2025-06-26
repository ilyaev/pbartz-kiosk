import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import mime from "mime-types";

export const imageResizeRegistry = new OpenAPIRegistry();
export const imageResizeRouter: Router = express.Router();

imageResizeRegistry.registerPath({
  method: "get",
  path: "/",
  tags: ["resize_image"],
  responses: createApiResponse(z.null(), "Success"),
});

imageResizeRouter.get("/url", async (req: Request, res: Response) => {
  try {
    const url = Object.keys(req.query)[0] || "";
    const fileName = path.basename(url);
    if (url.indexOf("image/") === -1) {
      throw new Error("Invalid url parameter");
    }

    const originalPath = path.join(
      process.env.CACHE_FILES_BASE_PATH || "",
      "cover",
      fileName + ".png"
    );

    const path256 = path.join(
      process.env.CACHE_FILES_BASE_PATH || "",
      "cover",
      fileName + "_256.png"
    );

    let buffer: Buffer<ArrayBufferLike>;

    if (fs.existsSync(path256)) {
      res.setHeader("Content-Type", "image/png");
      res.send(fs.readFileSync(path256));
    } else {
      if (fs.existsSync(originalPath)) {
        buffer = fs.readFileSync(originalPath);
      } else {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch image from url: ${response.statusText}`
          );
        }
        const arrayBuffer = await response.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(originalPath, buffer);
      }

      const { data, info } = await sharp(buffer)
        .resize(256, 256, {
          fit: "cover",
          position: "centre",
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      if (info.width !== 256 || info.height !== 256) {
        throw new Error(
          `Expected dimensions 256x256 but got ${info.width}x${info.height}`
        );
      }

      const pngBuffer = await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png()
        .toBuffer();

      fs.writeFileSync(path256, pngBuffer);

      res.setHeader("Content-Type", "image/png");
      res.send(pngBuffer);
    }
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});

imageResizeRouter.get(
  "/file/:folder/:file",
  async (req: Request, res: Response) => {
    try {
      let { folder, file } = req.params;
      if (!folder || !file) {
        throw new Error("Folder and file parameters are required");
      }

      const fileName = path.basename(file);
      const bucket = folder;

      const filePath = path.join(
        process.env.CACHE_FILES_BASE_PATH || "",
        bucket || "",
        fileName
      );

      if (!fs.existsSync(filePath)) {
        throw new Error("File not found");
      }

      const { data, info } = await sharp(filePath)
        .resize(256, 256, {
          fit: "cover",
          position: "centre",
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

      if (info.width !== 256 || info.height !== 256) {
        throw new Error(
          `Expected dimensions 256x256 but got ${info.width}x${info.height}`
        );
      }

      const pngBuffer = await sharp(data, {
        raw: {
          width: info.width,
          height: info.height,
          channels: info.channels,
        },
      })
        .png()
        .toBuffer();

      res.setHeader(
        "Content-Type",
        mime.lookup(filePath) || "application/octet-stream"
      );
      res.send(pngBuffer);
    } catch (e) {
      const serviceResponse = ServiceResponse.failure("Error", {
        success: false,
        error: e,
      });
      return handleServiceResponse(serviceResponse, res);
    }
  }
);
