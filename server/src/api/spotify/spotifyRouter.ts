import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Request, type Response, type Router } from "express";
import { z } from "zod";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { handleServiceResponse } from "@/common/utils/httpHandlers";
import SpotifyHelper from "@/utils/spotify";
import zodToJsonSchema from "zod-to-json-schema";
import GeminiHelper from "@/utils/gemini";
import DatabaseManager from "@/utils/db";
import { parseJson } from "@/utils/json";
import { WikiHelper } from "@/utils/wiki";
import { cacheFile, cacheFileExists } from "@/utils/cache";

export const spotifyRegistry = new OpenAPIRegistry();
export const spotifyRouter: Router = express.Router();

spotifyRegistry.registerPath({
  method: "get",
  path: "/spotify",
  tags: ["Spotify"],
  responses: createApiResponse(z.null(), "Success"),
});

spotifyRouter.get("/wiki", async (_req: Request, res: Response) => {
  try {
    const track = _req.query.track as string;
    const artist = _req.query.artist as string;
    const album = _req.query.album as string;

    const summary = await WikiHelper.spotifyTrackContext(track, artist, album);

    const serviceResponse = ServiceResponse.success(
      "Wikipedia response",
      summary
    );
    return handleServiceResponse(serviceResponse, res);
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});

spotifyRouter.get("/cover", async (req: Request, res: Response) => {
  const trackId = req.query.trackId as string;
  const imageUrl = req.query.imageUrl as string;
  const animation = req.query.animation as string;

  try {
    if (!trackId || !imageUrl) {
      throw new Error("Missing required parameters");
    }

    const db = DatabaseManager.getInstance();
    const record = await db.getPrompt({
      key: trackId,
      category: "spotify-track",
    });

    if (!record) {
      throw new Error("No record found");
    }

    const recordCover = await db.getPrompt({
      key: trackId,
      category: "spotify-track-cover",
    });

    if (recordCover && recordCover.id) {
      const item = parseJson(recordCover.response);
      const ideaIndex = Math.floor(Math.random() * item.ideas.length);
      const idea = item.ideas[ideaIndex].idea;

      const cacheFileName = `${trackId}_${ideaIndex}${
        animation ? "_anim" : ""
      }.png`;

      if (!cacheFileExists(cacheFileName, "cover")) {
        const imageContent = await fetch(imageUrl)
          .then((res) => res.blob())
          .then((blob) => blob.arrayBuffer())
          .then((buffer) => Buffer.from(buffer).toString("base64"));

        const prompt = animation
          ? `Attached is a music album cover. Generate two distinct images, representing frame 1 and frame 2 of a safe-for-viewing animation.
          The animation concept is described here: (${idea}). Ensure that the animation idea builds upon the original album cover's theme and artistic style. Frame 1 should be a modified version of the original image
          to ensure safety, and Frame 2 should show a further change or progression based on the animation idea. Please provide both image outputs
          separately`
          : `Here is music album cover in attached image. Generate image which is safe for viewing by modifying attached image using this idea description: "${idea}"`;

        const images = [] as string[];
        const apiResponse = await GeminiHelper.prompt(
          prompt,
          [imageContent],
          images
        );

        if (!apiResponse) {
          throw new Error("No response from Gemini");
        }

        const buffer = Buffer.from(apiResponse, "base64");
        const fileName = cacheFile(buffer, cacheFileName, "cover");

        if (images[1]) {
          const buffer2 = Buffer.from(images[1], "base64");
          const fileName2 = cacheFile(
            buffer2,
            cacheFileName.replace(".png", "_2.png"),
            "cover"
          );

          if (!fileName2) {
            throw new Error("Error saving file");
          }
        }

        if (!fileName) {
          throw new Error("Error saving file");
        }
      }

      const serviceResponse = ServiceResponse.success("Spotify response", {
        response: item,
        idea,
        imageUrl: "files/cover/" + cacheFileName,
        imageUrl2: animation
          ? "files/cover/" + cacheFileName.replace(".png", "_2.png")
          : undefined,
      });

      return handleServiceResponse(serviceResponse, res);
    }

    const json = parseJson(record.response);

    if (!json.quotes || json.quotes.length === 0) {
      throw new Error("No quotes found");
    }

    let quotes = json.quotes;
    if (json.passages && json.passages.length > 0) {
      quotes = quotes.concat(json.passages).sort(() => Math.random() - 0.5);
    }

    const schema = z.object({
      ideas: z
        .array(
          z.object({
            idea: z.string().describe("Idea for the image modification"),
            quote: z.string().describe("Quote that inspired the idea"),
          })
        )
        .describe("Ideas for the image modifications"),
    });

    const imageContent = await fetch(imageUrl)
      .then((res) => res.blob())
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer).toString("base64"));

    const jsonSchema = zodToJsonSchema(schema, "Track").definitions!.Track;

    const prompt = `
      Here is music album cover in attached image.
      I have several quotes from literature, movies or philosophy that I want to use to create a visual representation of the track.
      I need some ideas for modifications to the album cover image based on those quotes. Create 5 different ideas for modifications to the album cover image based on the quotes.
      Return JSON with array of ideas.
      Quotes: ${JSON.stringify(quotes)}
      JSON schema: ${JSON.stringify(jsonSchema)}
    `;

    const apiResponse = await GeminiHelper.prompt(prompt, [imageContent]);

    const response = parseJson(apiResponse);

    if (response) {
      await db.savePrompt({
        prompt: prompt.trim(),
        response: apiResponse,
        key: trackId,
        category: "spotify-track-cover",
      });
    } else {
      throw new Error("No response from Gemini");
    }

    const serviceResponse = ServiceResponse.success("Spotify response", {
      response: response,
    });
    return handleServiceResponse(serviceResponse, res);
  } catch (e: any) {
    const serviceResponse = ServiceResponse.failure(
      "Error",
      e.message || e.toString()
    );
    return handleServiceResponse(serviceResponse, res);
  }
});

spotifyRouter.get("/state", async (_req: Request, res: Response) => {
  try {
    const spotify = await SpotifyHelper.getSpotify();

    if (!spotify) {
      res.redirect("/auth/spotify");
      return;
    }

    const me = await spotify.getMyCurrentPlaybackState();

    const serviceResponse = ServiceResponse.success(
      "Spotify response",
      me.body
    );
    return handleServiceResponse(serviceResponse, res);
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});

spotifyRouter.get("/track", async (req: Request, res: Response) => {
  try {
    const trackId = req.query.trackId as string;
    const track = req.query.track as string;
    const artist = req.query.artist;
    const imageUrl = req.query.imageUrl as string;
    const album = req.query.album;

    if (!trackId || !track || !artist || !imageUrl || !album) {
      const serviceResponse = ServiceResponse.failure(
        "Missing required parameters",
        "All parameters are required"
      );
      return handleServiceResponse(serviceResponse, res);
    }

    const db = DatabaseManager.getInstance();

    const record = await db.getPrompt({
      key: trackId,
      category: "spotify-track",
    });

    if (record && record.id) {
      const serviceResponse = ServiceResponse.success("Track played", {
        trackId,
        track,
        artist,
        imageUrl,
        album,
        response: parseJson(record.response),
      });
      return handleServiceResponse(serviceResponse, res);
    }

    const imageContent = await fetch(imageUrl)
      .then((res) => res.blob())
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer).toString("base64"));

    const schema = z.object({
      tempo_bpm: z
        .number()
        .optional()
        .describe(`Tempo of the song "${track} by "${artist}" in BPM`),
      image: z.object({
        moods: z.array(z.string()).describe("Moods of the image"),
        description: z
          .string()
          .describe(
            "Description of the image. Analyze what is on the image, but be creative, description should be interesting and easy to read"
          ),
        colors: z.object({
          primary: z.string().describe("Primary color in image. Hex format"),
          secondary: z
            .string()
            .describe("Secondary color in image. Hex format"),
          background: z
            .string()
            .describe("Background color in image. Hex format"),
          primaryToWriteOnOverlay: z
            .string()
            .describe("Primary Color to write on overlay. Hex format"),
          secondaryToWriteOnOverlay: z
            .string()
            .describe("Secondary Color to write on overlay. Hex format"),
          overlayColor: z.string().describe("Overlay color. Hex format"),
          overlayOpacity: z
            .number()
            .describe("Overlay opacity. Number between 0 and 1"),
        }),
      }),
      quotes: z
        .array(z.string())
        .describe(
          "Array of quotes to display on the screen. Quotes should be from literature, movies, books or philosophy and should be related to the track, artist, content of album cover image or description"
        ),
      facts: z
        .array(z.string())
        .describe(
          "Array of facts to display on the screen. Facts should be about artist, track, album, genre or even movie if it's a soundtrack."
        ),
      passages: z
        .array(z.string())
        .describe(
          "Array of brief passages from literature related to the track in format 'Author: Title - Passage'"
        ),
      summary: z.string().optional().describe("Summary of passed context"),
    });

    const jsonSchema = zodToJsonSchema(schema, "Track").definitions!.Track;

    const wiki =
      (await WikiHelper.spotifyTrackContext(track, artist + "", album + "")) ||
      "No context, use your own data";

    const prompt = `There is track playing on audio player.
  It's "${track}" by "${artist}". Album is "${album}".
  What is the tempo for song "${track}" by "${artist}"? return it in 'tempo_bpm' field.
  Here is the album cover in attached image.
  Analyze the image and provide description of the image, guess the moods (maximum 3) of the image.
  primary and secondary colors, background color of image,
  primary and secondary colors to write on overlay for best visibility. Provide color and opacity of overlay.
  Also provide some quotes (5-10) from literature, movies or philosophy to accompany this track to show on screen, quotes should be related to the track name, content of album cover image or description.
  Provide some interesting passages from literature relevant to the track name, content of album cover image or description.
  Finally, provide some interesting facts about the artist or the track. Return JSON with all this information. JSON schema: ${JSON.stringify(
    jsonSchema
  )}

  Text with summary of track and/or artist as context for facts and quotes: "${wiki}"

  Mood can be one of the following: ${JSON.stringify(moods)}

  `;

    const apiResponse = await GeminiHelper.prompt(prompt, [imageContent]);
    await db.savePrompt({
      prompt: prompt.trim(),
      response: apiResponse,
      key: trackId,
      category: "spotify-track",
    });

    const serviceResponse = ServiceResponse.success("Track played", {
      trackId,
      track,
      artist,
      imageUrl,
      album,
      response: parseJson(apiResponse),
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

spotifyRouter.get("/me", async (_req: Request, res: Response) => {
  try {
    const spotify = await SpotifyHelper.getSpotify();

    if (!spotify) {
      res.redirect("/auth/spotify");
      return;
    }

    const me = await spotify.getMe();

    const serviceResponse = ServiceResponse.success(
      "Spotify response",
      me.body
    );
    return handleServiceResponse(serviceResponse, res);
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});

spotifyRouter.get("/token", async (_req: Request, res: Response) => {
  try {
    const spotify = await SpotifyHelper.getSpotify();

    if (!spotify) {
      res.redirect("/auth/spotify");
      return;
    }

    const serviceResponse = ServiceResponse.success(
      "Spotify response",
      spotify.getAccessToken()
    );
    return handleServiceResponse(serviceResponse, res);
  } catch (e) {
    const serviceResponse = ServiceResponse.failure("Error", {
      success: false,
      error: e,
    });
    return handleServiceResponse(serviceResponse, res);
  }
});

const moods = {
  moodLists: [
    {
      name: "Beginner List",
      moods: [
        "Admiration",
        "Amused",
        "Angry",
        "Anxious",
        "Awed",
        "Awkward",
        "Belonging",
        "Bored",
        "Calm",
        "Confused",
        "Content",
        "Curious",
        "Disappointed",
        "Disgusted",
        "Distrustful",
        "Embarrassed",
        "Empathetic",
        "Engaged",
        "Enjoyment",
        "Envy",
        "Excited",
        "Fear",
        "Frustrated",
        "Grateful",
        "Guilty",
        "Happy",
        "Hopeless",
        "Inadequate",
        "Insignificant",
        "Interested",
        "Joyful",
        "Longing",
        "Love",
        "Nostalgic",
        "Optimistic",
        "Overwhelmed",
        "Sad",
        "Satisfied",
        "Scared",
        "Stressed",
        "Surprised",
        "Sympathetic",
        "Triumphant",
        "Worried",
      ],
    },
    {
      name: "Discrete Emotion Theory (12 emotions)",
      moods: [
        "Interest",
        "Joy",
        "Surprise",
        "Sadness",
        "Anger",
        "Disgust",
        "Contempt",
        "Self-hostility",
        "Fear",
        "Shame",
        "Shyness",
        "Guilt",
      ],
    },
    {
      name: "Aristotle's Theory (9 emotions)",
      moods: [
        "Anger",
        "Friendship",
        "Fear",
        "Shame",
        "Kindness",
        "Pity",
        "Indignation",
        "Envy",
        "Love",
      ],
    },
    {
      name: "Expanded List (15 emotions)",
      moods: [
        "Aesthetic experience",
        "Anger",
        "Anxiety",
        "Compassion",
        "Depression",
        "Envy",
        "Fright",
        "Gratitude",
        "Guilt",
        "Happiness",
        "Hope",
        "Jealousy",
        "Love",
        "Pride",
        "Relief",
        "Sadness",
        "Shame",
      ],
    },
    {
      name: "27 Categories of Emotion",
      moods: [
        "Admiration",
        "Adoration",
        "Aesthetic appreciation",
        "Amusement",
        "Anger",
        "Anxiety",
        "Awe",
        "Awkwardness",
        "Boredom",
        "Calmness",
        "Confusion",
        "Craving",
        "Disgust",
        "Empathic pain",
        "Entrancement",
        "Excitement",
        "Fear",
        "Horror",
        "Interest",
        "Joy",
        "Nostalgia",
        "Relief",
        "Romance",
        "Sadness",
        "Satisfaction",
        "Sexual desire",
        "Surprise",
      ],
    },
  ],
};
