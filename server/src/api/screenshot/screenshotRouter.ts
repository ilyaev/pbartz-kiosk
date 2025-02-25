import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import PuppeteerHelper from "@/utils/puppeteer";

export const screenshotRegistry = new OpenAPIRegistry();
export const screenshotRouter: Router = express.Router();

screenshotRegistry.registerPath({
  method: "get",
  path: "/screenshot",
  tags: ["Screenshot"],
  responses: createApiResponse(z.null(), "Success"),
});

screenshotRouter.get("/", async (req: Request, res: Response) => {
  try {
    const base64Image = await PuppeteerHelper.getScreenshot(
      req.query.url + "",
      req.query.timeout ? parseInt(req.query.timeout + "") : undefined
    );
    const serviceResponse = ServiceResponse.success("Screenshot response", {
      image: base64Image,
    });
    return handleServiceResponse(serviceResponse, res);
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});
