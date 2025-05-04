import React, { Component } from "react";
import { connect } from "react-redux";
import { RootState } from "../../store";
import { KioskState } from "../../store/kioskSlice";
import { SERVER_URL, SPOTIFY } from "@/lib/const";
import { CurrentlyPlaying } from "spotify-types";
import { Ticker, TickerDirection } from "@/components/ticker";
import ColorConverter from "string-color-converter";
import { getPrimarySecondaryForBackground } from "@/lib/colors";
import Mic from "@/components/mic";
import WinampMic, { Props as WinampProps } from "@/components/mic/winamp";
import EQ3D, { CONFIG as EQ3DConfig } from "./visuals/eq3d";
import Stars, { CONFIG as StarsConfig } from "./visuals/stars";
import CityGrid, { CONFIG as CityGridConfig } from "./visuals/city";
import SpheresPool, { CONFIG as SpheresPoolConfig } from "./visuals/pool";
import FreqBarsStrict, {
  CONFIG as FreqBarsStrictConfig,
} from "./visuals/bars_strict";
import TubesTape, { CONFIG as TubesConfig } from "./visuals/tubes";
import DiscoRoom, { CONFIG as DiscoRoomConfig } from "./visuals/lights";
import DebugConsole, { CONFIG as DebugConfig } from "./visuals/rms_debug";
import TiltScene, { CONFIG as TiltConfig } from "./visuals/tilt";
import { mapRange } from "@/lib/utils";
import ServerSensors from "@/lib/sensors";

let nextLoad: number;
let changeInterval: number;
let syncInterval: number;
let nextChange: number = Date.now() + SPOTIFY.albumCoverDuration;

const DEBUG = true;

const AvailableVisuals = DEBUG
  ? [TiltScene]
  : [Stars, CityGrid, SpheresPool, EQ3D, DiscoRoom, FreqBarsStrict, TubesTape];
const VisualsConfig = DEBUG
  ? [TiltConfig]
  : [
      StarsConfig,
      CityGridConfig,
      SpheresPoolConfig,
      EQ3DConfig,
      DiscoRoomConfig,
      FreqBarsStrictConfig,
      TubesConfig,
    ];

interface TrackData {
  tempo_bpm?: number;
  facts: string[];
  quotes: string[];
  image: {
    moods: string[];
    description: string;
    colors: {
      primary: string;
      secondary: string;
      background: string;
      primaryToWriteOnOverlay: string;
      secondaryToWriteOnOverlay: string;
      overlayColor: string;
      overlayOpacity: number;
    };
  };
}

interface Props {
  kiosk: KioskState;
}

export interface ExtendedCurrentlyPlaying extends CurrentlyPlaying {
  device: {
    name: string;
    type: string;
    volume_percent: number;
    is_active: boolean;
    is_restricted: boolean;
  };
  item: CurrentlyPlaying["item"] & {
    album: {
      name: string;
      images: { url: string }[];
    };
    artists: { name: string }[];
  };
}

interface State {
  player: ExtendedCurrentlyPlaying;
  track: TrackData;
  equlizer: boolean;
  vizIndex: number;
  cover: string;
  cover1: string;
  cover2: string;
  currentCover: number;
  debug: string;
}

let isMounted = false;

class SpotifyScene extends Component<Props, State> {
  state = {
    player: {} as ExtendedCurrentlyPlaying,
    track: {} as TrackData,
    equlizer: false,
    vizIndex: 1,
    cover: "",
    cover1: "",
    cover2: "",
    currentCover: 0,
    debug: "empty",
  };

  volume: number = 0;
  captureValue: number = 100;
  sensors: ServerSensors = new ServerSensors({
    callback: (data: number[]) => {},
  });
  debug: string = "";

  colors?: {
    primary: string;
    secondary: string;
    background: string;
    primaryToWriteOnOverlay: string;
    secondaryToWriteOnOverlay: string;
    overlayColor: string;
    overlayOpacity: number;
  };
  textColors?: { primary: string; secondary: string };
  repeats: number = 0;
  coverInterval: number = 0;

  componentDidMount(): void {
    if (!isMounted) {
      isMounted = true;
      this.loadData();
    }
    if (changeInterval) {
      clearInterval(changeInterval);
    }
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    nextChange = Date.now() + SPOTIFY.albumCoverDuration;

    syncInterval = setInterval(() => {
      this.sensors.syncCaptureLevel(this.captureValue);
    }, 5 * 1000);

    changeInterval = setInterval(() => {
      if (Date.now() > nextChange) {
        this.setState({
          equlizer: !this.state.equlizer,
          vizIndex: Math.floor(Math.random() * AvailableVisuals.length),
        });
        nextChange =
          Date.now() +
          (this.state.equlizer
            ? SPOTIFY.albumCoverDuration
            : SPOTIFY.vizualizerDuration);
      }
    }, 1000);
  }

  loadData = async () => {
    if (nextLoad) {
      clearTimeout(nextLoad);
    }
    const myState: ExtendedCurrentlyPlaying = await fetch(
      SERVER_URL + "spotify/state"
    )
      .then((res) => res.json())
      .then((data) => data.responseObject);

    if (!myState.is_playing || myState.device.name !== SPOTIFY.device) {
      return;
    }

    this.volume = myState.device.volume_percent;
    this.captureValue = Math.round(
      this.volume > 20 ? 100 - mapRange(this.volume, 30, 100, 15, 90) : 100
    );
    this.setState({ player: myState, cover: "", cover2: "", debug: "" });

    const tout = myState.item.duration_ms - (myState.progress_ms || 0) + 1000;

    nextLoad = setTimeout(() => {
      this.setState({ track: {} as TrackData });
      this.loadData();
    }, tout);
    if (this.coverInterval) {
      clearInterval(this.coverInterval);
    }
    await this.loadTrackData(myState.item);
    this.repeats = 0;
    await this.loadCoverData(myState.item);
    isMounted = false;
  };

  loadCoverData = async (item: ExtendedCurrentlyPlaying["item"]) => {
    if (!item) {
      return;
    }
    const trackId = item.id;
    const imageUrl = item.album.images[0].url;

    const record = await fetch(
      `${SERVER_URL}spotify/cover?trackId=${encodeURIComponent(
        trackId
      )}&imageUrl=${encodeURIComponent(imageUrl)}&animation=true`
    ).then((res) => res.json());

    if (
      record.success &&
      record.responseObject &&
      record.responseObject.imageUrl
    ) {
      this.repeats = 0;
      this.setState({
        cover: record.responseObject.imageUrl,
        cover1: record.responseObject.imageUrl,
        cover2: record.responseObject.imageUrl2 || "",
        currentCover: 1,
      });
      this.coverInterval = setInterval(() => {
        if (this.state.currentCover === 1) {
          this.setState({ cover: this.state.cover2, currentCover: 2 });
        }
        if (this.state.currentCover === 2) {
          this.setState({ cover: this.state.cover1, currentCover: 1 });
        }
      }, 1000);
    } else {
      this.setState({ cover: "", cover2: "", cover1: "" });
      this.repeats++;
      if (this.repeats < 4) {
        this.loadCoverData(item);
      }
    }
  };

  loadTrackData = async (item: ExtendedCurrentlyPlaying["item"]) => {
    if (!item) {
      return;
    }
    const trackId = item.id;
    const track = item.name;
    const artist = item.artists[0].name;
    const imageUrl = item.album.images[0].url;
    const album = item.album.name;

    const record = await fetch(
      `${SERVER_URL}spotify/track?trackId=${encodeURIComponent(
        trackId
      )}&track=${encodeURIComponent(track)}&artist=${encodeURIComponent(
        artist
      )}&imageUrl=${encodeURIComponent(imageUrl)}&album=${encodeURIComponent(
        album
      )}`
    ).then((res) => res.json());

    if (!record.success) {
      this.setState({ track: {} as TrackData, cover: "", cover2: "" });
    } else {
      const track = record.responseObject.response;
      if (track.passages) {
        track.quotes = track.quotes
          .concat(track.passages)
          .sort(() => 0.5 - Math.random());
      }
      this.setState({
        track,
        cover: "",
        cover2: "",
      });
    }
  };

  componentWillUnmount(): void {
    if (nextLoad) {
      clearTimeout(nextLoad);
    }
    if (changeInterval) {
      clearTimeout(changeInterval);
    }
  }

  render() {
    if (!this.state.player) {
      return "Loading...";
    }

    if (!this.state.player.is_playing) {
      return "Not playing...";
    }

    const bgUrl = this.state.player.item.album.images[0].url;

    this.colors = this.state.track.image
      ? this.state.track.image.colors
      : ({} as TrackData["image"]["colors"]);

    this.textColors = this.colors.background
      ? getPrimarySecondaryForBackground(
          this.colors.background,
          this.colors.primary,
          this.colors.secondary
        )
      : {
          primary: "#FFFFFF",
          secondary: "#FFFFFF",
        };

    return (
      <>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            height: "100%",
            width: "100%",
          }}
        >
          {DEBUG && (
            <div>
              {this.volume} - {this.captureValue}
            </div>
          )}
          {DEBUG || this.renderHeader()}
          {DEBUG || this.renderFooter()}
        </div>
        {this.state.equlizer
          ? this.renderMicEqulizer()
          : this.renderAlbumConver(bgUrl)}
      </>
    );
  }

  renderAlbumConver(bgUrl: string) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          width: "100%",
          backgroundImage: `url(${
            this.state.cover ? SERVER_URL + this.state.cover : bgUrl
          })`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "75% ",
          backgroundColor: this.colors?.background || "black",
        }}
      />
    );
  }

  renderMicEqulizer() {
    if (!this.state.equlizer) {
      return null;
    }

    const volume = this.state.player.device.volume_percent;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const VisualComponent: React.ComponentType<any> =
      AvailableVisuals[this.state.vizIndex];

    const config: WinampProps =
      VisualsConfig[this.state.vizIndex] || ({} as WinampProps);

    return config.mode && config.mode === "winamp" ? (
      <WinampMic magnitude={2} {...config} volume={volume}>
        <VisualComponent
          tempo={this.state.track.tempo_bpm || 100}
          volume={volume}
        />
      </WinampMic>
    ) : (
      <Mic magnitude={2}>
        <VisualComponent
          tempo={this.state.track.tempo_bpm || 100}
          volume={volume}
          covers={[
            this.state.cover1,
            this.state.cover2,
            // "http://localhost:8080/resize_image/file/cover/5PeJhKyPdS7xF9dijXjiJl_2_anim.png",
            // "http://localhost:8080/resize_image/file/cover/5PeJhKyPdS7xF9dijXjiJl_2_anim_2.png",
          ]}
        />
      </Mic>
    );
  }

  renderHeader() {
    return (
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "20%",
          fontSize: "1.8em",
          zIndex: 100001,
        }}
        key={"header"}
      >
        {this.state.track.quotes && (
          <Ticker
            direction={TickerDirection.DownUp}
            key={"ticker" + 111}
            pause={10000}
            delay={0}
            items={this.state.track.quotes.map((text) => (
              <div
                style={{
                  alignContent: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                  color: this.state.equlizer
                    ? "rgb(241, 182, 157)"
                    : this.textColors?.primary,
                }}
              >
                {text}
              </div>
            ))}
            elementStyle={{
              margin: "10px",
              position: "absolute",
              backgroundColor:
                this.state.track.image && !this.state.equlizer
                  ? ColorConverter(
                      this.state.track.image.colors.background
                    ).rgba.replace("1)", "0.7)")
                  : "rgba(0, 0, 0, 0.7)",
              width: "97vw",
              padding: "10px",
              borderRadius: "10px",
            }}
          />
        )}
      </div>
    );
  }

  renderFooter() {
    return (
      <div
        key={"footer"}
        style={{
          position: "absolute",
          bottom: 0,
          width: "98%",
          height: "30%",
          backgroundColor:
            this.state.track.image && !this.state.equlizer
              ? ColorConverter(
                  this.state.track.image.colors.background
                ).rgba.replace("1)", "0.7)")
              : "rgba(0, 0, 0, 0.7)",
          paddingLeft: "20px",
          borderRadius: "10px",
          margin: "10px",
          display: "flex",
          alignItems: "start",
          justifyContent: "start",
          color: "white",
          zIndex: 100002,
        }}
      >
        <div>
          <div
            style={{
              fontSize: "3.2em",
              fontWeight: "bold",
              display: "flex",
              color:
                this.state.track.image && !this.state.equlizer
                  ? this.textColors!.primary
                  : "white",
            }}
          >
            {this.state.player?.item?.name.split("/")[0].slice(0, 37)}
          </div>
          <div
            style={{
              fontSize: "2.4em",
              marginTop: "-20px",
              display: "flex",
              color:
                this.state.track.image && !this.state.equlizer
                  ? this.textColors!.primary
                  : "white",
            }}
          >
            {this.state.player?.item?.artists[0].name}
          </div>
          <div
            style={{
              width: "100%",
              marginTop: "-25px",
              marginLeft: "-20px",
              position: "absolute",
              height: "50%",
              overflow: "hidden",
              fontSize: "1.8em",
              color:
                this.state.track.image && !this.state.equlizer
                  ? this.textColors!.secondary
                  : "rgb(241, 182, 157)",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            {this.state.track.facts && (
              <Ticker
                direction={TickerDirection.RightLeft}
                key={"ticker" + 111}
                pause={5000}
                delay={0}
                items={this.state.track.facts.map((text) => (
                  <div>{text}</div>
                ))}
                elementStyle={{
                  margin: "10px",
                  position: "absolute",
                  width: "97vw",
                  padding: "10px",
                  borderRadius: "10px",
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(SpotifyScene);
