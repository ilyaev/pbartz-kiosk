import {
  Agent,
  MCPServerStreamableHttp,
  Runner,
  RunResult,
  setTracingDisabled,
  UserMessageItem,
} from "@openai/agents";

export {
  SceneIdeaGeneratorAgent,
  SceneCodeGeneratorAgent,
  SceneDescriptionGeneratorAgent,
  SceneScreenshotAgent,
  SceneScreenshotAnalyzerAgent,
} from "./scene";

setTracingDisabled(true);

const runner = new Runner({
  tracingDisabled: false,
  traceId: "scene-generator-agent",
});

export class AgentsHelper {
  static lastResponse?: RunResult<undefined, any>;

  static getResponseImages(): { data: string; mimeType: string }[] {
    if (!this.lastResponse) {
      return [];
    }
    const images: { data: string; mimeType: string }[] = [];
    for (const item of this.lastResponse.state._generatedItems as any) {
      if (
        item.output &&
        item.output.length > 0 &&
        typeof item.output[0] === "object"
      ) {
        item.output.forEach((output: any) => {
          if (output.type === "image" && output.data) {
            images.push(output);
          }
        });
      }
    }
    return images;
  }

  static async run(
    agent: Agent<unknown, any>,
    input: string,
    images?: { data: string; mimeType: string }[]
  ): Promise<string> {
    try {
      if (agent.mcpServers && agent.mcpServers.length > 0) {
        for (let mcpServer of agent.mcpServers) {
          if (mcpServer instanceof MCPServerStreamableHttp) {
            await mcpServer.connect();
          }
        }
      }

      let response: RunResult<undefined, any>;

      if (images && images.length > 0) {
        const params = [] as UserMessageItem[];
        const content: UserMessageItem["content"] = [];
        for (const image of images) {
          content.push({
            type: "input_image",
            image: `data:${image.mimeType};base64,${image.data}`,
          });
        }
        content.push({
          type: "input_text",
          text: input,
        });

        const item: UserMessageItem = {
          role: "user",
          content: content,
        };

        params.push(item);

        response = await runner.run(agent, params as any);
        this.lastResponse = response;
      } else {
        response = await runner.run(agent, input);
        this.lastResponse = response;
      }

      if (agent.mcpServers && agent.mcpServers.length > 0) {
        for (let mcpServer of agent.mcpServers) {
          if (mcpServer instanceof MCPServerStreamableHttp) {
            await mcpServer.close();
          }
        }
      }

      return response.finalOutput as string;
    } catch (error) {
      console.error("Error occurred while running agent:", error);
      throw error;
    }
  }
}
