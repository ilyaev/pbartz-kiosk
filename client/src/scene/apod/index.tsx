import { Component } from "react";
import { connect } from "react-redux";
import { RootState } from "../../store";
import { KioskState } from "../../store/kioskSlice";
import "./style.css";
import { APOD, SERVER_URL } from "@/lib/const";
// import Marquee from "react-fast-marquee";

interface Props {
  kiosk: KioskState;
}

let isMounted = false;

interface State {
  loading: boolean;
  description: string;
  data: {
    date: string;
    ai: {
      imageUrl: string;
      descriptions: string[];
    };
  };
}

class ApodScene extends Component<Props, State> {
  private intervalId: number | null = null;

  state = {
    data: {} as State["data"],
    loading: false,
    description: "",
  };

  componentDidMount() {
    if (!isMounted) {
      isMounted = true;
      this.loadData();
    }
    this.intervalId = setInterval(this.loadData, APOD.refreshInterval);
  }

  componentWillUnmount(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  loadData = async () => {
    if (this.state.loading) {
      return;
    }
    this.setState({ loading: true });
    fetch(SERVER_URL + "apod")
      .then((response) => response.json())
      .then((data) => {
        const apod = data.responseObject || {};
        this.setState({
          description:
            apod.ai.descriptions[
              Math.floor(Math.random() * apod.ai.descriptions.length)
            ],
          loading: false,
          data: apod || {},
        });
        isMounted = false;
      })
      .catch((error) => {
        console.error("Error fetching APOD data:", error);
        this.setState({ loading: false });
      });
  };

  render() {
    const imageUrl =
      this.state.data && this.state.data.ai
        ? this.state.data.ai.imageUrl.indexOf("http") === -1
          ? SERVER_URL + this.state.data.ai.imageUrl
          : this.state.data.ai.imageUrl
        : "";

    return this.state.data.date ? (
      <div className="apodcontainer">
        <div
          className="background"
          style={{
            backgroundImage: `url(${imageUrl})`,
          }}
        ></div>
        {this.state.data.ai.imageUrl.includes("youtube.com") ? (
          <iframe
            className="foreground-video"
            src={this.state.data.ai.imageUrl}
            width={"100%"}
            height={"100%"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Content Video"
          ></iframe>
        ) : (
          <img
            src={imageUrl}
            className="foreground-image"
            alt="Content Image"
          />
        )}
        <div className="foreground-text">{this.state.description}</div>
      </div>
    ) : (
      "Loading..."
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(ApodScene);
