import { Component } from "react";
import { State as MainState } from "./index";
import { arrayChunk } from "@/lib/utils";
import { Ticker, TickerDirection } from "@/components/ticker";
import { HISTORY_EVENTS } from "@/lib/const";

interface Props {
  data: MainState["data"];
}

interface State {
  loaded: boolean;
}

export class HistoryDidYouKnowScene extends Component<Props, State> {
  render() {
    const pages = 3;

    const data = this.props.data
      .filter((item) => item.section === "did_you_know")
      .map((item) => {
        return {
          event: item.item,
        };
      });

    const perPage = Math.ceil(data.length / pages);

    const chunks = arrayChunk(data, perPage);

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          // paddingTop: "27%",
          overflow: "hidden",
          // border: "1px solid red",
        }}
      >
        <div
          style={{
            background:
              "url(https://upload.wikimedia.org/wikipedia/en/8/80/Wikipedia-logo-v2.svg) no-repeat",
            backgroundSize: "150%",
            opacity: 0.3,
            display: "flex",
            width: "100%",
            height: "100%",
            // top: "-10px",
            position: "absolute",
            // paddingTop: "27%",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "1%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1,
            width: "100%",
            textAlign: "center",
            // color: "gray",
            // textShadow: "1px 1px 1px black",
          }}
        >
          <h1>Did you know...</h1>
        </div>

        {chunks.map((items, index) => {
          let delay = 0;
          let shift = 0;
          if (index === 0) {
            shift = 7;
            delay = 0.3;
          }
          if (index === 2) {
            shift = 67;
            delay = 0.1;
          }
          if (index === 1) {
            shift = 37;
          }
          return (
            <Ticker
              direction={
                index === 1
                  ? TickerDirection.RightLeft
                  : TickerDirection.LeftRight
              }
              key={"ticker" + index}
              pause={HISTORY_EVENTS.didyouknowRefreshInterval}
              delay={delay}
              items={items.map(this.renderOne)}
              elementStyle={{
                margin: "10px",
                position: "absolute",
                width: "97vw",
                padding: "10px",
                borderRadius: "10px",
                top: `${shift}%`,
              }}
            />
          );
        })}
      </div>
    );
  }

  renderOne(item: { event: string }) {
    return (
      <div
        style={{
          fontSize: "2.5em",
          border: "1px solid black",
          borderRadius: "20px",
          height: "205px",
          padding: "10px",
          backgroundColor: "rgba(255,255,255,.8)",
          overflow: "hidden",
          textAlign: "left",
        }}
      >
        {item.event}
      </div>
    );
  }
}
