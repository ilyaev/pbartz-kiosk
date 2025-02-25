import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { symbol, z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import PuppeteerHelper from "@/utils/puppeteer";
import GeminiHelper from "@/utils/gemini";
import DatabaseManager from "@/utils/db";
import zodToJsonSchema from "zod-to-json-schema";
import { parseJson } from "@/utils/json";

export const financeRegistry = new OpenAPIRegistry();
export const financeRouter: Router = express.Router();

financeRegistry.registerPath({
  method: "get",
  path: "/finance",
  tags: ["Finance"],
  responses: createApiResponse(z.null(), "Success"),
});

financeRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const schema = z.object({
      stocks: z
        .array(
          z.object({
            symbol: z.string(),
            name: z.string(),
            price: z.number(),
            change: z.number().or(z.null()),
            percentChange: z.number().or(z.null()),
            group: z.enum([
              "market_trends",
              "most_followed",
              "interested_in",
              "other",
            ]),
          })
        )
        .describe(
          "Companies stocks dynamics. Ignore companies where change and percentChange is unknown"
        ),
      news: z.array(
        z.object({
          source: z.string(),
          headline: z.string(),
          timeAgo: z.string(),
          symbol: z
            .string()
            .describe("In news find symbol of company it's about"),
        })
      ),
    });

    const jsonSchema = zodToJsonSchema(schema, "Finances").definitions!
      .Finances;

    const prompt = `
      I am a financial analyst and want to build a dashboard with major fintech news and movements.
      Here is a screenshot of a website with some information related to the current state of finances in the world.
      Return JSON with all the information you can fetch from it.
      This information will be used to show data on the dashboard.
      JSON schema: ${JSON.stringify(jsonSchema)}
    `
      .split("\n")
      .join(" ")
      .trim();

    const db = DatabaseManager.getInstance();
    const record = await db.getPrompt({
      key: "dashboard",
      category: "finance",
    });

    let apiResponse = "";

    if (record && record.id) {
      const now = new Date();
      const updated = new Date(record.updated);
      const timeDifferenceMinutes =
        (now.getTime() - updated.getTime()) / (1000 * 60);
      if (timeDifferenceMinutes < 60) {
        apiResponse = record.response;
      }
    }

    if (!apiResponse) {
      const screenshot = await PuppeteerHelper.getScreenshot(
        "https://www.google.com/finance"
      );

      apiResponse = await GeminiHelper.prompt(prompt, [
        screenshot?.content || "",
      ]);

      await db.savePrompt({
        prompt: prompt.trim(),
        response: apiResponse,
        key: "dashboard",
        category: "finance",
      });
    }

    const serviceResponse = ServiceResponse.success("Finance API response", {
      prompt,
      response: parseJson(apiResponse) as z.infer<typeof schema>,
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
