/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component } from "react";
import { SpotifyAudioAnalysis, SpotifyPlaybackState } from "./utils/types";
import { TrackSync } from "./utils/track_sync";
import { VizScene } from "./scene";

interface Props {
  token?: string;
}
interface State {
  loaded: boolean;
  playerState: SpotifyPlaybackState;
  trackData: SpotifyAudioAnalysis;
  volume: number;
}

const STATE_CACHE_KEY = "spotify-player-state";
const MAX_CACHE_ITEMS = 5;

const url = "https://api.spotify.com/v1/";

class DB {
  static get(key: string, defValue: string) {
    const value = localStorage.getItem(STATE_CACHE_KEY + "_" + key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        return defValue;
      }
    }
    return defValue;
  }

  static unset(key: string) {
    localStorage.removeItem(STATE_CACHE_KEY + "_" + key);
  }

  static set(key: string, value: string) {
    localStorage.setItem(STATE_CACHE_KEY + "_" + key, JSON.stringify(value));
  }
}

let accessToken = "";
let headers = {
  Authorization: `Bearer ${accessToken}`,
};

const getTrackData = async (trackId: string): Promise<SpotifyAudioAnalysis> => {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
  };
  return new Promise((resolve, reject) => {
    fetch(url + "audio-analysis/" + trackId, { headers: headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        reject(error);
      });
  });
};

const getPlayerState = async (): Promise<SpotifyPlaybackState> => {
  return new Promise((resolve, reject) => {
    fetch(url + "me/player", { headers: headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        resolve(data);
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
        reject(error);
      });
  });
};

class App extends Component<Props, State> {
  state = {
    loaded: false,
    playerState: {} as SpotifyPlaybackState,
    trackData: {} as SpotifyAudioAnalysis,
    volume: 0,
  };

  timer = 0;

  sync: TrackSync = new TrackSync({ volumeSmoothing: 4 });

  async componentDidMount() {
    accessToken = this.props.token || "";
    headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    this.initSync();
    await this.loadTrack();
  }

  async loadTrack() {
    try {
      const state = await this.initState();
      this.setState(state);
      setTimeout(() => {
        this.setSyncTrack();
      }, 100);
    } catch (e) {
      console.log(e);
      this.setState({
        loaded: true,
        playerState: {} as SpotifyPlaybackState,
      });
    }
  }

  async initState(): Promise<State> {
    let keys = DB.get("keys", []);
    let ps = await getPlayerState();
    const state = { playerState: ps, loaded: true } as State;
    if (ps.is_playing) {
      const cached = DB.get(ps.item.id, null);
      if (cached) {
        state.trackData = cached;
        // console.log(cached);
      } else {
        const data = await getTrackData(ps.item.id);
        DB.set(ps.item.id, data);
        state.trackData = data;
        if (keys.length > MAX_CACHE_ITEMS) {
          const toDelete = keys[0];
          keys = keys.slice(1);
          DB.unset(toDelete);
        }
        keys.push(ps.item.id);
        DB.set("keys", keys);
        const stamp = window.performance.now();
        ps = await getPlayerState();
        const ttl = window.performance.now() - stamp;
        if (ps.progress_ms > 0) {
          ps.progress_ms += ttl / 2;
        }
      }

      const w = window;
      w.GL_START = window.performance.now();

      state.playerState = ps;
    }
    return state;
  }

  initSync() {
    this.sync.state.watch("finished", () => {
      this.onFinishTrack();
    });
    this.sync.state.watch("active", (_active) => {
      // console.log("Active", active);
    });
  }
  async onFinishTrack() {
    // console.log("Finished track");
    await this.loadTrack();
  }

  setSyncTrack() {
    const track = this.state.trackData;
    this.sync.setTrack(track, this.state.playerState.item.id);
    this.sync.processPlaybackState(this.state.playerState);
  }

  render() {
    if (!accessToken) {
      return (
        <div className="App" style={{ padding: "10px" }}>
          No token
        </div>
      );
    }
    if (!this.state.loaded) {
      return (
        <div className="App" style={{ padding: "10px" }}>
          Loading...
        </div>
      );
    }
    if (!this.state.playerState.is_playing) {
      return (
        <div className="App" style={{ padding: "10px" }}>
          Not playing State - {JSON.stringify(this.state.playerState)}
        </div>
      );
    }
    return (
      <div className="App">
        <VizScene
          volume={this.state.volume}
          sync={this.sync}
          playbackState={this.state.playerState}
        />
      </div>
    );
  }
}

export default App;
