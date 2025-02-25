import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";

import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const geminiRegistry = new OpenAPIRegistry();
export const geminiRouter: Router = express.Router();

geminiRegistry.registerPath({
  method: "get",
  path: "/gemini",
  tags: ["Gemini"],
  responses: createApiResponse(z.null(), "Success"),
});

geminiRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Explain how AI works";

    const result = await model.generateContent(prompt);
    console.log(result.response.text());

    const serviceResponse = ServiceResponse.success("Gemini API response", {
      prompt,
      response: result.response.text(),
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
