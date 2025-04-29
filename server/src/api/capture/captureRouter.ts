import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { execCommand } from "@/utils/console";

export const captureRegistry = new OpenAPIRegistry();
export const captureRouter: Router = express.Router();

captureRegistry.registerPath({
  method: "get",
  path: "/capture",
  tags: ["capture"],
  responses: createApiResponse(z.null(), "Success"),
});

captureRouter.get("/:value", async (req: Request, res: Response) => {
  try {
    let { value } = req.params;

    const valueInt = parseInt(value);

    let result = "";

    if (!valueInt) {
      const res = await execCommand("amixer get 'Capture'");
      result = (getLeftCapturePercentage(res) || '-1').replace('%','');
    } else {
      const res = await execCommand(`amixer set 'Capture' ${valueInt}%`);
      result = res;
    }

    let serviceResponse = ServiceResponse.success("capture response", {
      success: true,
      value,
      result,
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


function getLeftCapturePercentage(amixerOutput: string) {
  const regex = /^\s*Front Left:.*?\[(\d+%)\]/m;

  const match = amixerOutput.match(regex);

  if (match && match[1]) {
    return match[1];
  } else {
    return null;
  }
}