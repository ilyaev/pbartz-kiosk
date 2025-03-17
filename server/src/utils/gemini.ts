import {
  GenerativeModel,
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

export default class GeminiHelper {
  static genAI: GoogleGenerativeAI;
  static model: GenerativeModel;

  static async prompt(
    str: string,
    files: string[] = [] as string[],
    images: string[] | undefined = undefined
  ): Promise<string> {
    GeminiHelper.genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY || ""
    );
    GeminiHelper.model = GeminiHelper.genAI.getGenerativeModel({
      safetySettings: !images
        ? undefined
        : [
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_NONE,
            },
          ],
      generationConfig: !images
        ? undefined
        : ({
            responseModalities: ["Text", "Image"],
          } as any),
      model: images
        ? process.env.GEMINI_MODEL_IMAGE || "gemini-1.5-flash"
        : process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });

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
    const texts = [];
    for (const part of result.response.candidates![0].content.parts) {
      if (part.text) {
        texts.push(part.text);
      } else if (part.inlineData) {
        const imageData = part.inlineData.data;
        images && images.push(imageData);
      }
    }
    return images ? images[0] || "" : result.response.text();
  }
}
