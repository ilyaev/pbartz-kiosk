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

export class HistoryThisDayScene extends Component<Props, State> {
  render() {
    const pages = 1;

    const data = this.props.data
      .filter(
        (item) =>
          item.section === "on_this_day" &&
          ((item.item || "").indexOf("–") > 0 || item.text)
      )
      .map((item) => {
        return item.item
          ? {
              date: item.item.split("–")[0].trim(),
              event: item.item.split("–")[1].trim(),
            }
          : {
              date: "",
              event: item.text || "",
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
          key={"bg"}
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
            alignItems: "center",
            justifyContent: "center",
            // paddingTop: "27%",
          }}
        />

        <div
          key={"header"}
          style={{
            position: "absolute",
            top: "1%",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1,
            width: "100%",
            textAlign: "center",
            fontSize: "1.8em",
            fontWeight: "bold",
            // color: "gray",
            // textShadow: "1px 1px 1px black",
          }}
        >
          <h1>On this day in history</h1>
        </div>

        {chunks.map((items, index) => {
          let delay = 0;
          let shift = 0;
          if (index === 0) {
            shift = 15;
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
              key={"ticker" + index}
              direction={
                index === 1
                  ? TickerDirection.RightLeft
                  : TickerDirection.LeftRight
              }
              pause={HISTORY_EVENTS.thisDayRefreshInterval}
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

  renderOne(item: { date: string; event: string }) {
    return (
      <div
        style={{
          fontSize: "4.2em",
          border: "1px solid black",
          borderRadius: "20px",
          // height: "205px",
          padding: "10px",
          backgroundColor: "rgba(255,255,255,.8)",
          overflow: "hidden",
          textAlign: "left",
          lineHeight: "1.2em",
        }}
      >
        <span
          style={{
            fontWeight: "bold",
          }}
        >
          {item.date}
        </span>{" "}
        - {item.event}
      </div>
    );
  }
}
