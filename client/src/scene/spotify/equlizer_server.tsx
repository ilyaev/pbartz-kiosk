import { Component } from "react";
import GreenMesh from "./GreenMesh";

interface SpotifyEqualizerProps {
  a?: string;
}

interface SpotifyEqualizerState {
  data: {
    rms: number;
    arms: number;
  };
}

class SpotifyEqualizer extends Component<
  SpotifyEqualizerProps,
  SpotifyEqualizerState
> {
  private eventSource: EventSource | null = null;

  constructor(props: SpotifyEqualizerProps) {
    super(props);
    this.state = {
      data: {
        rms: 0,
        arms: 0,
      },
    };
  }

  componentDidMount() {
    if (this.eventSource) {
      return;
    }
    this.eventSource = new EventSource("http://localhost:8081/stream");
    setTimeout(() => {
      this.eventSource!.onmessage = (event) => {
        const items = event.data
          .replace("data: ", "")
          .trim()
          .split(",")
          .map(parseFloat);
        this.setState({
          data: {
            rms: items[1],
            arms: items[0],
          },
        });
      };

      this.eventSource!.onerror = () => {
        console.error("EventSource failed.");
        this.eventSource!.close();
      };
    }, 300);
  }

  componentWillUnmount() {
    this.eventSource!.close();
    this.eventSource = null;
  }

  render() {
    const { rms, arms } = this.state.data;

    const volume = Math.min(screen.width * 0.98, screen.width * rms * 30);
    const volumeA = Math.min(screen.width * 0.98, screen.width * arms * 30);

    return (
      <div>
        <div
          style={{
            position: "absolute",
            border: "1px solid red",
            height: "50px",
            left: "10px",
            top: "130px",
            width: `${volumeA}px`,
            backgroundColor: "#A00000",
            display: "flex",
            justifyContent: "start",
            padding: "10px",
          }}
        >
          Average
        </div>
        <div
          style={{
            position: "absolute",
            border: "1px solid red",
            height: "50px",
            width: `${volume}px`,
            backgroundColor: "#A00000",
            left: "10px",
            top: "190px",
            display: "flex",
            justifyContent: "start",
            padding: "10px",
          }}
        >
          Imediate
        </div>
        <GreenMesh volume={volumeA} />
        {/* <GreenMesh volume={volume} /> */}
      </div>
    );
  }
}

export default SpotifyEqualizer;
