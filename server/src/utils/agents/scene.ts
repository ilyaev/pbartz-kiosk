import {
  Agent,
  MCPServerStreamableHttp,
  OpenAIChatCompletionsModel,
} from "@openai/agents";
import OpenAI from "openai";
import { AgentsHelper } from ".";
import { writeFile } from "fs/promises";
import { Task, TaskExecutionException } from "@/workflow";
import z from "zod";
import GeminiHelper from "@/utils/gemini";
import sharp from "sharp";

const SCENE_SCORE_THRESHOLD = 50; // Minimum score to consider the scene acceptable

export const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: process.env.GEMINI_API_BASE_URL,
});

export const model = new OpenAIChatCompletionsModel(openai, "gemini-2.5-pro");
export const modelFlash = new OpenAIChatCompletionsModel(
  openai,
  "gemini-2.5-flash"
);
export const modelCheap = new OpenAIChatCompletionsModel(
  openai,
  "gemini-2.0-flash"
);

const DEMO_SCENE_TECHNICS = `* Plasma
      Visual Description: An endlessly swirling, colorful, and organic pattern resembling gas or liquid. It features smooth, shifting gradients of color that are not tied to any specific object but fill the entire screen. The motion is fluid and hypnotic.
      Use Case: Quintessential background filler. Often used behind text, vector objects, or as a standalone visual spectacle between other effects.
      * Starfield
      Visual Description: Simulates travel through a field of stars. Can be a simple 2D side-scrolling field or a 3D "hyperspace" effect where stars stream towards the viewer from a central vanishing point. Stars should vary in brightness and speed.
      Use Case: Background effect to create a sense of motion and space. Commonly used in "space opera" themed demos.
      * Tunnel (or Tunneler)
      Visual Description: The viewer appears to be flying endlessly through a tube or tunnel. The tunnel's inner surface is covered with a repeating texture. The tunnel can twist, turn, and pulsate to the music.
      Use Case: Immersive, first-person focal effect. Designed to showcase perspective and texture mapping prowess.
      * Metaballs (or Blobs)
      Visual Description: Organic, liquid-mercury-like 2D or 3D blobs that stretch and merge when they come close to each other. They have a perfectly smooth, continuous surface.
      Use Case: A major "wow" effect demonstrating complex calculations. Often a central focus.
      * Rotozoomer
      Visual Description: A 2D image (often a checkerboard or a logo) is endlessly rotated and zoomed, typically tiling across the entire screen. The motion is smooth and creates a disorienting, hypnotic perspective effect.
      Use Case: A foundational texture mapping effect. Used to show off fast 2D affine transformations.
      * Glenz (or Glenz Vector)
      Visual Description: A complex, shiny, metallic 3D object, often with intricate tunnels and holes. The key feature is the environment mapping, where the object reflects a texture that is not actually present in the scene, giving it a polished, chrome-like appearance.
      Use Case: The pinnacle 3D object effect. Used to showcase advanced 3D rendering, lighting, and texture mapping simulation.
      * Voxel Landscape
      Visual Description: A 3D landscape, similar to a flight simulator, but constructed from vertical columns (voxels) rather than polygons. The effect is characterized by its blocky appearance and the ability to render vast, rolling terrains.
      Use Case: To create large, open-world style scenes on limited hardware. A precursor to modern procedural terrain.
      * Bump Mapping / Embossing
      Visual Description: A 2D texture or image appears to have 3D depth and texture. A static light source seems to catch the edges of details in the image, giving it a bas-relief or embossed look.
      Use Case: A trick to add impressive perceived detail and lighting to a flat surface without using any 3D geometry.
      * Copper Bars (Amiga Specific)
      Visual Description: A series of horizontal, multi-colored bars that undulate and move independently of the main graphics on the screen. They often have a sine-wave pattern and seem to exist on a separate layer. The colors are typically vibrant and cycle rapidly.
      Use Case: A signature background or foreground flair of the Amiga demoscene. It demonstrated mastery of the Amiga's custom hardware to produce effects with virtually zero CPU load.
      * Scroller (and Sine-Scroller)
      Visual Description: A line of text that scrolls smoothly across the screen, typically at the bottom. A "sine-scroller" adds a vertical up-and-down wave motion to the horizontally scrolling text, making it appear to ripple.
      Use Case: The primary way of communicating messages, credits, and greetings in a demo. The smoothness and creativity of the scroller were points of pride.
      * Wobbler / Jelly Vector
      Visual Description: A 3D vector object (like a cube or sphere) that appears to be made of gelatin. As it rotates, its vertices lag behind or overshoot, creating a wobbly, non-rigid motion.
      Use Case: To add organic, dynamic motion to otherwise rigid 3D objects, making them feel more alive. A great "show-off" effect for 3D vector math skills.
      * Shadebobs
      Visual Description: An array of 2D sprites are drawn on screen. Each sprite is drawn using a different, single color, creating a field of flat-shaded objects. The colors of the sprites cycle in a coordinated, wave-like pattern.
      Use Case: A technique to create a large number of moving objects on screen with varied and dynamic coloring that would be too slow to handle with traditional multi-color sprites.
      * Twister
      Visual Description: A series of 2D shapes (often just lines or dots) are stacked vertically. Each layer rotates around the central Y-axis, but the phase of the rotation is offset based on its vertical position. This creates a twisting, tornado-like column of objects.
      Use Case: A classic 3D effect that was relatively cheap to calculate. It creates a compelling sense of volume and motion from very simple components.
      * Texture Mapped 3D Object
      Visual Description: A simple 3D object, like a cube, that is rotating in space. Its faces are covered with a 2D image (a texture), often a checkerboard or a logo. The texture mapping was often affine, meaning it lacked true perspective correction, leading to a "wobbly" texture look.
      Use Case: The holy grail of early real-time 3D. Showcased the ability to map textures onto 3D surfaces, a foundational technique for all modern 3D graphics.`;

export const SceneCodeGeneratorAgent = new Agent({
  model,
  name: "3D Scene Code Generator",
  instructions: `
  ROLE:
  You are an expert Creative Technologist and Three.js developer. You specialize in translating abstract ideas, images, and descriptions into beautiful, efficient, and performant 3D web experiences.

  OBJECTIVE:
  Your mission is to take a user's input, primarily an image and secondarily a text description, and generate a single, complete, and visually stunning HTML file that brings that scene to life using the Three.js library.

  INPUT:
  You will receive an input image, which is the primary source of truth. You may also receive a {SCENE_DESCRIPTION} to provide additional context, clarification, or details not present in the image.

  PROCESS & GUIDELINES:
  1. Image-First Interpretation Strategy:
  Analyze the Image First: Your primary task is to meticulously analyze the provided input image. Deconstruct the image to identify its core visual elements:
    * Objects: What are the shapes and forms? (e.g., spheres, complex models, abstract shapes).
    * Composition: How are the objects arranged in the space?
    * Materials & Color: What are the colors? Do surfaces look metallic, matte, shiny, or textured?
    * Lighting & Atmosphere: Where do the light and shadows fall? Does the scene feel bright, dark, or moody? What is the background?
  Consult the Description for Refinement: After forming a strong interpretation from the image, use the {SCENE_DESCRIPTION} only to supplement your understanding. Its role is secondary:
    * To Clarify: If an element in the image is ambiguous (e.g., a blurry shape), the description might specify it ("that's a low-poly-style mountain").
    * To Add Non-Visuals: The description can add requirements that are impossible to see in a static image, such as animation ("the cube should slowly rotate"), specific environment details ("use a skybox with stars"), or interactivity.
    * Conflict Resolution: If the image and description contradict (e.g., the image shows a blue sphere, but the text says "a red cube"), the image takes absolute precedence. You must create the scene based on the image (the blue sphere).
  2. Make Smart Assumptions: Where the image and text are both vague, you must make creative and aesthetically pleasing choices.
    No Lighting Specified: Default to a combination of AmbientLight and a DirectionalLight to create soft shadows and good visibility, mimicking the lighting you observe in the image if possible.
    No Background Specified: If the image background is unclear, default to a dark, desaturated color (e.g., #111111) that makes foreground objects pop.
    No Material Specified: Default to MeshStandardMaterial to ensure objects react realistically to light. Infer the color and roughness from the image.
    No Animation Mentioned: Add a subtle, slow rotation to the main object(s) to make the scene feel more alive.
    Analyze image and decide if there is motion like flying through tunnel or fly around, grid movement, etc. Apply camera motions accordingly.
    No Camera Movement Mentioned or Calculated: Default to smooth orbit around the main subject of the scene. Motion speed should be based on the image's content and composition.
    If Camera position is static: Apply subtle zoom in/out or rotation to create a sense of movement, or change position completely at some time intervals
  3. Code Quality and Structure:
    Use Three.js Best Practices: Ensure the scene is efficient and performs well in a browser. Use modern ES6+ JavaScript syntax.
    Structure: Use a clear structure with functions like init() and animate().
    Responsiveness: Always include a window resize event listener to ensure the scene correctly adapts to browser size changes.
    Readability: Add comments for any non-obvious or complex logic.
  4. Three.js usage specifics:
    Use BufferGeometry instead of Geometry for better performance.
    Leverage InstancedMesh for objects that share the same geometry and material.
    Use the latest features from Three.js, such as the new lighting model and post-processing effects.
    Don't import from three/addons/geometries/ use geometries from THREE.js core or create custom geometries.
  5. List of visual effects usually used in demo scene to produce visual effects in such visualizations. Use one or more from this list, add comments to code specifying which effects were used:
      ${DEMO_SCENE_TECHNICS}


  CONSTRAINTS & OUTPUT FORMAT:
  The generated code must be a single, self-contained HTML file.
  It must be runnable in a modern browser without any additional dependencies. No build steps or local servers should be required.

  CRITICAL: Your final output must be ONLY the raw HTML code. Do not include any surrounding text, explanations, greetings, or markdown code fences. Your entire response must be the code itself, ready to be saved as an .html file and opened in a browser.
  `,
});

export const SceneDescriptionGeneratorAgent = new Agent({
  model: modelFlash,
  name: "3D Scene Description Generator",
  instructions: `
        You are a 3D scene description generator.
        You will receive a description of a 3D scene and you will generate a detailed description of that scene considering that this scene will be used as a screensaver or idle visualization.
        The description should include the objects in the scene, their colors, positions, and any other relevant details.
        The description should be clear and easy to understand.
        Description will be used by LLM to generate code for the scene.
        Make sure that scene contrasts well with the background and is visually appealing.
        Return the description as a single string, no any extra text or explanations, just the description ready to be used.
    `,
});

export const SceneIdeaGeneratorAgent = new Agent({
  model: modelFlash,
  name: "3D Scene Idea Generator",
  instructions: `
        You are a 3D scene idea generator.
        You will generate creative ideas for 3D scenes based on a given theme or concept or adjectives or other description.
        The ideas should be unique, imaginative, and suitable for 3D visualization.
        Return the idea as a single string, no any extra text or explanations, just the idea ready to be used.
    `,
});

const playwrightMcpServer = new MCPServerStreamableHttp({
  url: "http://localhost:8931/mcp",
  name: "Playwright MCP Server",
});

export const ScreenshotTextExtractorAgent = new Agent({
  model: modelCheap,
  name: "Screenshot Text Extractor",
  instructions: `You will receive image of screenshot of a webpage and instructions about what this web site is and what kind of text information to extract and return`,
});

export const WebPageScreenshotAgent = new Agent({
  model: modelCheap,
  name: "Web Page Screenshot Agent",
  instructions: `Create screenshot of provided url using playwright MCP server. Resize browser to 1024,2048 and wait for 3 seconds before taking screenshot. Close browser after all screenshots are taken.`,
  mcpServers: [playwrightMcpServer],
});

export const SceneScreenshotAgent = new Agent({
  model: modelCheap,
  name: "3D Scene Screenshot Generator",
  instructions: `
    You will navigate to given URL, wait for full page load and wait extra 3 seconds and take a screenshot of the page using Playwright MCP.
    Wait another 3 seconds and take another screenshot.
    Close browser after all screenshots are taken.
  `,
  mcpServers: [playwrightMcpServer],
});

export const SceneScreenshotAnalyzerAgent = new Agent({
  model: modelCheap,
  name: "3D Scene Screenshots Analyzer",
  instructions: `
  Primary Goal: Analyze the provided screenshots and description. Your analysis should focus on capturing the essence and overall vibe of the user's request, rather than performing a strict, pixel-perfect comparison. The main objective is to provide actionable feedback that helps create a working, visually pleasing animation that loosely aligns with the provided description.
  Analysis Process:
    1. Visual Interpretation: Based on the two screenshots, describe the 3D scene. Note the main objects, the color palette, the composition, and the overall mood.
    2. Motion Analysis: By comparing the two screenshots (taken 3 seconds apart), infer the movement of objects in the scene. Is the motion smooth, subtle, or dramatic?
    3. Comparative Analysis: Compare your interpretation of the scene with the user's original description. Focus on the big picture:
      - Does the scene feel like what the user described?
      - Are the key elements present?
      - Is the movement concept aligned with the description?
    4. Recommendations: Provide 2-3 high-impact, actionable recommendations for what the developer could change in their code to better capture the desired feeling or improve the scene's quality as a screensaver.

  Input:
    description: A string describing the desired 3D scene.
    screenshots: Two images of the scene, taken 3 seconds apart.
  Output Constraints:
    You MUST return the analysis in a single, clean JSON object.
    Do not include any extra text, comments, or explanations outside of the JSON structure.
    If no images are provided in the prompt, return only the JSON object: {"error": "No image provided"}.
  `,
  outputType: z.object({
    similarities: z.array(z.string()),
    differences: z.array(z.string()),
    overallScore: z
      .number()
      .describe(
        "Overall score of matching between provided description and scene. Range from 0 to 100, where 100 is perfect match."
      ),
    aesteticsScore: z
      .number()
      .describe(
        "Aesthetics score of the scene. Range from 0 to 100, where 100 is perfect aesthetics."
      ),
    canBeUsedAsIs: z
      .boolean()
      .describe(
        "If the scene actually works and can be used for idle visualization as is without any changes even if the score is low."
      ),
    recommendations: z
      .array(z.string())
      .describe(
        "Recommendations to improve scene based on analysis. Should be clear and actionable to be used by LLM to update scene code."
      ),
    description: z.string(),
    descriptionOfScreenshots: z
      .string()
      .describe("Description of the scene based on screenshots"),
  }),
});

export const SceneCodeAdjustmentAgent = new Agent({
  model: model,
  name: "3D Scene Code Adjustment",
  instructions: `
  ROLE:
  You are an expert Three.js and front-end developer. Your expertise lies in refactoring existing code, improving performance, and enhancing the visual aesthetics of 3D web scenes.

  OBJECTIVE:
  Your mission is to receive a single HTML file containing a Three.js scene and a list of recommendations, and then to produce a new, improved version of that HTML file. You will intelligently integrate the requested changes while adhering to best practices for code structure and visual design.

  INPUT:
  You will be provided with two pieces of information:
  {THE_CODE}: The original, self-contained HTML file with embedded JavaScript and CSS.
  {THE_RECOMMENDATIONS}: A list of suggestions for improving the code and the visual scene. Use some or all of them to enhance the scene.

  PROCESS & GUIDELINES:
  Analyze: Carefully read the original code to understand its structure, functionality, and current state.
  Errors: Fix any existing errors if there are any.
  Evaluate: Review each recommendation. You should aim to implement all of them, but use your expert judgment. If a recommendation is vague (e.g., "make it look cooler"), interpret it by applying principles of good visual design (lighting, color theory, composition).
  Refactor & Implement: Rewrite the code to incorporate the valid recommendations.
  Enhance & Polish:
    Code Quality: Ensure the code is well-structured with clear functions (e.g., init(), animate()), comments for complex parts, and meaningful variable names. Use modern JavaScript (ES6+).
    Visual Appeal: Ensure the scene has good contrast, proper lighting, and an effective camera position. The final result should be visually pleasing.
    Self-Contained: The final output must remain a single HTML file. All JavaScript must be in a <script> tag and all CSS in a <style> tag. Use a CDN for the Three.js library.

  CONSTRAINTS & OUTPUT FORMAT:
  The generated code must be a single HTML file.
  It must be runnable in a modern browser without any external dependencies (except for the Three.js CDN link). No build steps or local servers should be required.
  If you are unable to meaningfully apply the recommendations or if they would break the scene, return the original, unmodified code.

  CRITICAL: Your response must be ONLY the raw HTML code. Do not include any explanations, introductory sentences, apologies, or markdown code fences like html .... Your entire response must be the code itself, ready to be saved and opened in a browser.
  `,
});

interface AnalysisResult {
  similarities: string[];
  differences: string[];
  overallScore: number;
  recommendations: string[];
  description: string;
  descriptionOfScreenshots: string;
}

const SEED_SOURCES = [
  {
    url: "https://news.google.com/",
    title: "Google News",
    description:
      "Its a world and local news website. News are broken by different categories (Top Stories, Local News, US, Technology, Science, Space, Gaming, etc.) 3-5 news headlines for each category.",
  },
  {
    url: "https://apod.nasa.gov/apod/astropix.html",
    title: "NASA APOD",
    description:
      "NASA's Astronomy Picture of the Day (APOD) features a different image or photograph of our universe each day, accompanied by a brief explanation written by a professional astronomer.",
  },
  {
    url: "https://en.wikipedia.org/wiki/Main_Page",
    title: "Wikipedia",
    description:
      "Wikipedia is a free online encyclopedia with articles on a wide range of topics. The main page features a selection of articles, images, and news from various categories.",
  },
  {
    url: "",
    title: "Demoscene",
    description: `Create description of 3d scene for visualization which will use some (pick at random) of common demo scene technics listed bellow:
      ${DEMO_SCENE_TECHNICS}`,
  },
];

export const SceneAgentsWorkflow = {
  idea: async (payload: string, task: Task) => {
    const seedItem = SEED_SOURCES.find((s) =>
      s.title.toLowerCase().includes(payload?.toLowerCase())
    );
    let seeds = payload;

    if (!seeds || seedItem) {
      const seedSource =
        seedItem ||
        SEED_SOURCES[Math.floor(Math.random() * SEED_SOURCES.length)];

      if (seedSource.url) {
        await AgentsHelper.run(WebPageScreenshotAgent, seedSource.url);
        const images = AgentsHelper.getResponseImages();

        const headlines = await AgentsHelper.run(
          ScreenshotTextExtractorAgent,
          seedSource.description +
            `Use this information to compile a list of:
              - nouns,
              - adjectives,
              - moods,
              - colors,
              - shapes,
              - actions
              (strictly 5-8 of each category).

              Remove words depicting real-world conflict, violence, and sensitive political figures and groups.

              This will be used by LLM to create an idea for idle 3D visualization.

              Return no extra information, just text ready to be used by LLM.`,
          images
        );
        seeds = headlines;
      } else {
        seeds = seedSource.description;
      }

      task.inputSource = seedSource.title;
      task.inputSourceUrl = seedSource.url;
    }
    task.inputSeed = seeds;
    const idea = await AgentsHelper.run(SceneIdeaGeneratorAgent, seeds);
    return idea;
  },
  description: async (idea: string) =>
    await AgentsHelper.run(SceneDescriptionGeneratorAgent, idea),
  image_reference: async (description: string) => {
    const images = [] as string[];
    const instructions = `
  You are an expert Creative Technologist and Generative Artist. You translate abstract concepts into visual blueprints for procedural 3D animations.

  CORE MISSION:
  Your mission is to take a user's natural language concept and generate a visual blueprint for a 3D animated screensaver. This is not about creating a final, detailed artwork, but a clear, stylized reference for another AI to generate procedural code (e.g., for shaders, Three.js, or p5.js).

  STYLISTIC MANDATE: Abstract & Code-Friendly

  AVOID PHOTOREALISM: The image must be abstract, minimalist, and stylized. It should look like a clean "CGI 3D render" or "generative art," not a photograph.

  FOCUS ON COMPOSITION: Prioritize compositions built from:
    Simple geometric forms (spheres, cubes, planes, lines).
    Flowing, organic shapes and particle systems.
    Smooth gradients and ambient, atmospheric lighting.
    A sense of depth, motion, and atmosphere.

    THINK PROCEDURALLY: The scene must be simple enough to be described with code. Ask yourself: "Could this be made with math, noise functions, and simple objects?" If the answer is no, it's too complex.

    FORBIDDEN ELEMENTS: Do not include highly detailed textures, complex real-world objects (e.g., people, animals, specific car models), or intricate, photorealistic lighting and shadows.

    CRITICAL CONSTRAINTS:
      Output Format: Return only the generated image file and its necessary metadata (e.g., MIME type). Do not include any conversational text, descriptions, or explanations in your response.
  `;
    const prompt = "Generate image by description: \n\n" + description;
    await GeminiHelper.prompt(instructions + prompt, [], images);

    return {
      images: await Promise.all(
        images.map(async (image) => {
          const resized = await sharp(Buffer.from(image, "base64"))
            .jpeg()
            .toBuffer();
          return { data: resized.toString("base64"), mimeType: "image/jpeg" };
        })
      ),
      description,
    };
  },
  code: async (
    params: {
      description: string;
      images: { data: string; mimeType: string }[];
    },
    task: Task
  ) => {
    if (task.retryCount > 2) {
      throw new Error(
        "Scene generation failed too many times. Please try again later."
      );
    }
    return await AgentsHelper.run(
      SceneCodeGeneratorAgent,
      `Generate a scene based on image and additionally use description \n\n {SCENE_DESCRIPTION}:\n${params.description}`,
      params.images
    );
  },
  write_to_file: async (code: string) => {
    const content = code.replace("```html", "").replace("```", "");
    const fileName = `scene-${Date.now()}.html`;
    await writeFile(
      process.env.CACHE_FILES_BASE_PATH + "scene/" + fileName,
      content,
      "utf-8"
    );
    return fileName;
  },
  generate_screenshots: async (fileName: string, task: Task) => {
    await AgentsHelper.run(
      SceneScreenshotAgent,
      "url is http://localhost:3000/" + fileName
    );
    const images = AgentsHelper.getResponseImages();
    task.outputFile = fileName;
    return images;
  },
  analyze_screenshots: async (
    images: { data: string; mimeType: string }[],
    task: Task
  ) =>
    await AgentsHelper.run(
      SceneScreenshotAnalyzerAgent,
      task.findOutputByStep("description"),
      images
    ),
  evaluate_and_adjust_code: async (analysis: AnalysisResult, task: Task) => {
    if (task.retryCount > 2) {
      throw new Error(
        "Scene generation failed too many times. Please try again later."
      );
    }
    task.score = parseInt((analysis.overallScore || 0) + "");
    if (analysis.overallScore >= SCENE_SCORE_THRESHOLD) {
      return analysis;
    }
    if (analysis.overallScore < 10) {
      throw new TaskExecutionException({
        goto: "code",
        retry: true,
        input: task.findOutputByStep("image_reference"),
      });
    }
    const adjustedCode = await AgentsHelper.run(
      SceneCodeAdjustmentAgent,
      `{THE_CODE}: ${task.findOutputByStep(
        "code"
      )}\n\n{THE_RECOMMENDATIONS}: ${analysis.recommendations
        .map((l, index) => `${index + 1}. ${l}`)
        .join("\n")}`
    );
    throw new TaskExecutionException({
      goto: "write_to_file",
      input: `${adjustedCode}`,
      retry: true,
    });
  },
  fin: async (analysis: AnalysisResult) => {
    return (
      "Scene generation completed successfully with score: " +
      analysis.overallScore
    );
  },
};
