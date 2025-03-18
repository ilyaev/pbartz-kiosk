import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { execCommand } from "@/utils/console";

export const backlightRegistry = new OpenAPIRegistry();
export const backlightRouter: Router = express.Router();

backlightRegistry.registerPath({
  method: "get",
  path: "/backlight",
  tags: ["Backlight"],
  responses: createApiResponse(z.null(), "Success"),
});

backlightRouter.get("/:value", async (req: Request, res: Response) => {
  try {
    let { value } = req.params;

    const valueInt = parseInt(value);

    let result = "";

    if (!valueInt) {
      const res = await execCommand("wlr-randr --output DSI-2 --off");
      result = res;
    } else {
      const res = await execCommand(`wlr-randr --output DSI-2 --on`);
      await execCommand(`sudo sh -c 'echo ${valueInt} > /sys/class/backlight/11-0045/brightness'`);
      result = res;
    }

    let serviceResponse = ServiceResponse.success("Backlight response", {
      success: true,
      value,
      result,
    });

    if (
      parseInt(value) < 0 ||
      parseInt(value) > 100 ||
      isNaN(parseInt(value))
    ) {
      serviceResponse = ServiceResponse.failure("Invalid backlight value", {
        success: false,
        value,
        result: "",
      });
    }

    return handleServiceResponse(serviceResponse, res);
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});
