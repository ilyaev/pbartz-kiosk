import { Component } from "react";
import { connect } from "react-redux";
import { RootState } from "../../store";
import { KioskState } from "../../store/kioskSlice";
import { SERVER_URL, SPOTIFY } from "@/lib/const";
import { CurrentlyPlaying } from "spotify-types";
import { Ticker, TickerDirection } from "@/components/ticker";
import ColorConverter from "string-color-converter";
import { getPrimarySecondaryForBackground } from "@/lib/colors";
import Mic from "@/components/mic";
import ScreenViz from "./visuals/screen";

let nextLoad: number;
let changeInterval: number;
let nextChange: number = Date.now() + SPOTIFY.albumCoverDuration;

interface TrackData {
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
}

let isMounted = false;

class SpotifyScene extends Component<Props, State> {
  state = {
    player: {} as ExtendedCurrentlyPlaying,
    track: {} as TrackData,
    equlizer: false,
  };

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

  componentDidMount(): void {
    if (!isMounted) {
      isMounted = true;
      this.loadData();
    }
    if (changeInterval) {
      clearInterval(changeInterval);
    }
    nextChange = Date.now() + SPOTIFY.albumCoverDuration;
    changeInterval = setInterval(() => {
      if (Date.now() > nextChange) {
        this.setState({ equlizer: !this.state.equlizer });
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

    if (!myState.is_playing) {
      return;
    }
    this.setState({ player: myState });

    nextLoad = setTimeout(() => {
      this.setState({ track: {} as TrackData });
      this.loadData();
    }, myState.item.duration_ms - (myState.progress_ms || 0) + 1000);

    await this.loadTrackData(myState.item);
    isMounted = false;
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
    this.setState({
      track: record.responseObject.response,
    });
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
          {this.renderHeader()}
          {this.renderFooter()}
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
          backgroundImage: `url(${bgUrl})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "100% ",
        }}
      />
    );
  }

  renderMicEqulizer() {
    if (!this.state.equlizer) {
      return null;
    }
    const volume = this.state.player.device.volume_percent;
    return (
      <Mic magnitude={3 + (100 - volume) / 100}>
        <ScreenViz />
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
    console.log("renderFooter");
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
