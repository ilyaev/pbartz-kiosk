import { GenerativeModel, GoogleGenerativeAI } from "@google/generative-ai";

export default class GeminiHelper {
  static genAI: GoogleGenerativeAI;
  static model: GenerativeModel;

  static async prompt(
    str: string,
    files: string[] = [] as string[]
  ): Promise<string> {
    if (!GeminiHelper.genAI) {
      GeminiHelper.genAI = new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY || ""
      );
      GeminiHelper.model = GeminiHelper.genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
      });
    }

    const content = [str] as any[];

    if (files.length > 0) {
      files.reverse().forEach((file) => {
        content.unshift({
          inlineData: {
            data: file,
            mimeType: "image/png",
          },
        });
      });
    }

    const result = await GeminiHelper.model.generateContent(content);
    return result.response.text();
  }
}
