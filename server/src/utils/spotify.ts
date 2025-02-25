import moment from "moment-timezone";
import DatabaseManager from "./db";
import SpotifyWebApi from "spotify-web-api-node";

export default class SpotifyHelper {
  private static instance: SpotifyHelper;

  public static profile: any;

  private constructor() {}

  static async getSpotify(): Promise<SpotifyWebApi | null> {
    const db = DatabaseManager.getInstance();
    try {
      const session = await db.getSpotifyAccessToken();
      const spotify = new SpotifyWebApi({
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: session.refresh_token,
        accessToken: session.access_token,
      });
      SpotifyHelper.profile = JSON.parse(session.profile);
      if (moment().isAfter(moment(session.expires))) {
        const data = await spotify.refreshAccessToken();
        spotify.setAccessToken(data.body.access_token);
        await db.saveSpotifySession(
          data.body.access_token,
          session.refresh_token,
          data.body.expires_in,
          session.profile
        );
      }
      return spotify;
    } catch (error) {
      return null;
    }
  }
}
