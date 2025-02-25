import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import GeminiHelper from "@/utils/gemini";
import DatabaseManager from "@/utils/db";
import { parseJson } from "@/utils/json";
import moment from "moment-timezone";
import zodToJsonSchema from "zod-to-json-schema";

export const historyRegistry = new OpenAPIRegistry();
export const historyRouter: Router = express.Router();

historyRegistry.registerPath({
  method: "get",
  path: "/history",
  tags: ["History"],
  responses: createApiResponse(z.null(), "Success"),
});

historyRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const schema = z
      .array(
        z.object({
          section: z.string(),
          item: z.string().or(z.null()).describe("List item from section"),
          text: z
            .string()
            .or(z.null())
            .describe("Text of section if there are no list items"),
          image_url: z.string().or(z.null()).describe("Image url of section"),
          image_caption: z
            .string()
            .or(z.null())
            .describe("Image caption of section"),
        })
      )
      .describe(
        "Sections from Wikipedia Main page. Contains items and texts. Sections are 'on_this_day', 'in_the_news', 'did_you_know', 'todays_featured_article', 'todays_featured_picture' or as is if not in this list"
      );

    const jsonSchema = zodToJsonSchema(schema, "History").definitions!.History;

    const db = DatabaseManager.getInstance();
    const currentDate = moment().format("YYYY-MM-DD");
    const key = "history-" + currentDate;

    let record = await db.getPrompt({ key });

    if (record && record.id) {
      const ai = parseJson(record.response);

      const serviceResponse = ServiceResponse.success("History response", {
        date: currentDate,
        ai: ai,
      });

      return handleServiceResponse(serviceResponse, res);
    } else {
      const page = await fetch("https://en.wikipedia.org/wiki/Main_Page").then(
        (res) => res.text()
      );

      const prompt = `
      Here is HTML of webpage - Wikipedia Main page.
      Find all sections on page like 'On This Day', 'In the news', 'Did You know...', 'From today's featured article', 'Today's featured picture'
      and return JSON with list items from those sections. JSON schema: ${JSON.stringify(
        jsonSchema
      )}.
      Page html: ${page}
    `;

      const aires = await GeminiHelper.prompt(prompt);

      await db.savePrompt({
        prompt,
        response: aires,
        key,
        category: "history",
      });

      const serviceResponse = ServiceResponse.success("History response", {
        date: currentDate,
        ai: parseJson(aires),
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
