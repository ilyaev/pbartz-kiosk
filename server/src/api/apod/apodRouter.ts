import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import GeminiHelper from "@/utils/gemini";
import DatabaseManager from "@/utils/db";
import { parseJson } from "@/utils/json";
import { cacheImage } from "@/utils/cache";
import moment from "moment-timezone";

export const apodRegistry = new OpenAPIRegistry();
export const apodRouter: Router = express.Router();

apodRegistry.registerPath({
  method: "get",
  path: "/apod",
  tags: ["APOD"],
  responses: createApiResponse(z.null(), "Success"),
});

apodRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const db = DatabaseManager.getInstance();
    const currentDate = moment().format("YYYY-MM-DD");
    const key = "apod-" + currentDate;

    let record = await db.getPrompt({ key });

    if (Math.random() > 0.6) {
      record = await db.getRandomPrompt("apod");
    }

    if (record && record.id) {
      const ai = parseJson(record.response);

      const imageUrl = await cacheImage(
        (ai.imageUrl.indexOf("http") === -1
          ? process.env.APOD_IMAGE_BASE_URL
          : "") + ai.imageUrl,
        process.env.APOD_FILES_BUCKET
      );

      ai.imageUrl = imageUrl;

      const serviceResponse = ServiceResponse.success("APOD response", {
        date: currentDate,
        ai: ai,
      });

      return handleServiceResponse(serviceResponse, res);
    } else {
      const page = await fetch("https://apod.nasa.gov/apod/").then((res) =>
        res.text()
      );

      const prompt =
        "Here is HTML of webpage - Astronomy Picture of the Day. Find url of image with alt text 'See Explanation.' and retrun JSON with this url and short description of this picture based on information found in this webpage. This description will be showed in photo frame and should have entertaining purpose. Make 5 variants of such description and return array of it. JSON structure - imageUrl, descriptions. Webpage html: " +
        page;

      const aires = await GeminiHelper.prompt(prompt);

      await db.savePrompt({
        prompt,
        response: aires,
        key,
        category: "apod",
      });

      const serviceResponse = ServiceResponse.success("APOD response", {
        date: currentDate,
        ai: aires,
      });
      return handleServiceResponse(serviceResponse, res);
    }
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});
