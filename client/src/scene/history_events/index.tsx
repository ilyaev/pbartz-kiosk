import { Component } from "react";
import { connect } from "react-redux";
import { KioskState } from "../../store/kioskSlice";
import { RootState } from "../../store";
import { HISTORY_EVENTS, SERVER_URL } from "@/lib/const";
import { HistoryThisDayScene } from "./thisday";
import SceneFader from "@/components/fader";
import HistoryPicOfTheDay from "./picoftheday";
import { HistoryDidYouKnowScene } from "./didyouknow";

interface Props {
  kiosk: KioskState;
}

let isMounted = false;

export interface State {
  loaded: boolean;
  index: number;
  single: boolean;
  randomIndex: number;
  data: {
    item: string;
    text: string;
    image_url: string;
    image_caption: string;
    section: string;
  }[];
}

class HistoryEventsScene extends Component<Props, State> {
  state = {
    loaded: localStorage.getItem("historyData") ? true : false,
    index: 0,
    single: true,
    randomIndex: Math.floor(Math.random() * 3),
    data: JSON.parse(
      localStorage.getItem("historyData") || "[]"
    ) as State["data"],
  };

  async componentDidMount() {
    if (!isMounted) {
      isMounted = true;
      const randomIndex = Math.floor(Math.random() * 3);
      this.setState({ randomIndex });
      await this.loadData();
    }
  }

  componentWillUnmount(): void {}

  async loadData() {
    const response = await fetch(SERVER_URL + "history");
    const data: State["data"] = await response
      .json()
      .then((data) => data.responseObject.ai);

    data.sort(() => Math.random() - 0.5);
    localStorage.setItem("historyData", JSON.stringify(data));
    this.setState({ data, loaded: true, index: 0 });
    isMounted = false;
  }

  render() {
    if (!this.state.loaded) {
      return "Loading...";
    }

    const pod = this.state.data.find(
      (item) => item.section === "todays_featured_picture"
    );

    const pages = [
      <HistoryDidYouKnowScene data={this.state.data} key={"page1"} />,
      <HistoryThisDayScene data={this.state.data} key={"page2"} />,
      pod ? (
        <HistoryPicOfTheDay
          imageUrl={pod.image_url}
          description={pod.text}
          key={"page3"}
        />
      ) : undefined,
    ];



    return this.state.single ? (
      pages[this.state.randomIndex]
    ) : (
      <SceneFader delay={HISTORY_EVENTS.refreshInterval}>{pages}</SceneFader>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(HistoryEventsScene);
