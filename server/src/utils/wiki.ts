import wiki from "wikipedia";

export class WikiHelper {
  static async spotifyTrackContext(
    track: string,
    artist: string,
    album: string
  ) {
    try {
      const query = `${track} by ${artist} from album ${album}`;
      const res = await wiki.search(query);
      const pageId = res.results.reduce(
        (acc, curr) => {
          if (!acc && curr.title.toLowerCase().includes(track.toLowerCase())) {
            return curr.pageid;
          }
          if (!acc && curr.title.toLowerCase().includes(artist.toLowerCase())) {
            return curr.pageid;
          }
          if (!acc && curr.title.toLowerCase().includes(album.toLowerCase())) {
            return curr.pageid;
          }
          return acc;
        },
        res.results.length ? res.results[0].pageid : 0
      );
      return pageId ? (await wiki.page(pageId)).content() : "";
    } catch (error) {
      console.error("Error fetching Wikipedia content:", error);
      return "";
    }
  }
}
