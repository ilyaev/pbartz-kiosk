import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { pino } from "pino";
import { openAPIRouter } from "@/api-docs/openAPIRouter";
import { healthCheckRouter } from "@/api/healthCheck/healthCheckRouter";
import { userRouter } from "@/api/user/userRouter";
import { spotifyRouter } from "@/api/spotify/spotifyRouter";
import errorHandler from "@/common/middleware/errorHandler";
import rateLimiter from "@/common/middleware/rateLimiter";
import requestLogger from "@/common/middleware/requestLogger";
import { env } from "@/common/utils/envConfig";
import { geminiRouter } from "@/api/gemini/geminiRouter";
import { apodRouter } from "@/api/apod/apodRouter";
import { screenshotRouter } from "./api/screenshot/screenshotRouter";
import { financeRouter } from "./api/finance/financeRouter";
import { filesRouter } from "./api/files/filesRouter";
import { historyRouter } from "./api/history/historyRouter";
import session from "express-session";
import passport from "passport";
import { Strategy as SpotifyStrategy } from "passport-spotify";
import SpotifyWebApi from "spotify-web-api-node";
import DatabaseManager from "./utils/db";
import { backlightRouter } from "./api/backlight/backlightRouter";
import { captureRouter } from "./api/capture/captureRouter";
import { imageResizeRouter } from "./api/imageResize/imageResizeRouter";
import { sceneRouter } from "./api/scene/sceneRouter";

var spotifyApi = new SpotifyWebApi({});

var authCallbackPath = "/auth/spotify/callback";

const logger = pino({ name: "server start" });
const app: Express = express();

passport.use(
  new SpotifyStrategy(
    {
      clientID: process.env.CLIENT_ID + "",
      clientSecret: process.env.CLIENT_SECRET + "",
      callbackURL: "http://localhost:8080" + authCallbackPath,
    },
    function (
      accessToken: string,
      refreshToken: string,
      expires_in: number,
      profile: any,
      done: any
    ) {
      DatabaseManager.getInstance().saveSpotifySession(
        accessToken,
        refreshToken,
        expires_in,
        JSON.stringify(profile)
      );
      spotifyApi.setAccessToken(accessToken);
      process.nextTick(function () {
        return done(null, profile);
      });
    }
  )
);

app.use(session({ secret: "piosk", resave: true, saveUninitialized: true }));

app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/auth/spotify",
  passport.authenticate("spotify", {
    scope: [
      "user-read-email",
      "user-read-private",
      "user-library-read",
      "user-library-modify",
      "playlist-read-private",
      "playlist-modify-private",
      "playlist-modify-public",
      "user-read-playback-state",
      "user-read-currently-playing",
      "user-read-recently-played",
      "user-modify-playback-state",
      "user-top-read",
    ],
    showDialog: true,
  } as any)
);

app.get(
  authCallbackPath,
  passport.authenticate("spotify", { failureRedirect: "/login" }),
  function (req, res) {
    res.redirect("/");
  }
);

// Set the application to trust the reverse proxy
app.set("trust proxy", true);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(helmet());
app.use(rateLimiter);

// Request logging
app.use(requestLogger);

// Helper function to wrap async routes
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Routes
app.use("/health-check", asyncHandler(healthCheckRouter));
app.use("/users", asyncHandler(userRouter));
app.use("/gemini", asyncHandler(geminiRouter));
app.use("/apod", asyncHandler(apodRouter));
app.use("/spotify", asyncHandler(spotifyRouter));
app.use("/screenshot", asyncHandler(screenshotRouter));
app.use("/finance", asyncHandler(financeRouter));
app.use("/files", asyncHandler(filesRouter));
app.use("/history", asyncHandler(historyRouter));
app.use("/backlight", asyncHandler(backlightRouter));
app.use("/capture", asyncHandler(captureRouter));
app.use("/resize_image", asyncHandler(imageResizeRouter));
app.use("/scene", asyncHandler(sceneRouter));

// Swagger UI
app.use(openAPIRouter);

// Error handlers
app.use(errorHandler());

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj as any);
});

export { app, logger };
