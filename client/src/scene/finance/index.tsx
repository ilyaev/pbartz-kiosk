import { Component } from "react";
import { connect } from "react-redux";
import { KioskState } from "../../store/kioskSlice";
import { RootState } from "../../store";
import { SERVER_URL } from "@/lib/const";
import Stock from "./stock";
import { Ticker, TickerDirection } from "@/components/ticker";
import { arrayChunk } from "@/lib/utils";

interface Props {
  kiosk: KioskState;
}

let isMounted = false;

interface State {
  loaded: boolean;
  index: number;
  data: {
    stocks: {
      symbol: string;
      name: string;
      price: number;
      change: number;
      percentChange: number;
      group: "market_trends" | "most_followed" | "interested_in" | "other";
    }[];
    news: {
      source: string;
      headline: string;
      timeAgo: string;
    }[];
  };
}

class FinanceScene extends Component<Props, State> {
  state = {
    loaded: true,
    index: 0,
    data: localStorage.getItem("dashboard_finance")
      ? (JSON.parse(
          localStorage.getItem("dashboard_finance") || "{}"
        ) as State["data"])
      : ({
          stocks: [],
          news: [],
        } as State["data"]),
  };

  async componentDidMount() {
    if (!isMounted) {
      isMounted = true;
      await this.loadData();
    }
  }

  processStocks(stocks: State["data"]["stocks"]) {
    const data = stocks
      .filter((stock) => (stock.price ? true : false))
      .map((stock) => {
        return Object.assign({}, stock, {
          price: stock.price
            .toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
            })
            .replace("$", ""),
          change:
            stock.change && stock.change !== stock.percentChange
              ? stock.change.toFixed(2)
              : ((stock.price * stock.percentChange) / 100).toFixed(2),
          percentChange: stock.percentChange
            ? stock.percentChange.toFixed(2)
            : stock.change
            ? ((stock.change / stock.price) * 100).toFixed(2)
            : 0,
        });
      })
      .map((stock) => {
        return Object.assign({}, stock, {
          percentChange:
            stock.change < 0 && stock.percentChange > 0
              ? stock.percentChange * -1
              : stock.percentChange,
        });
      });

    data.sort(() => Math.random() - 0.5);

    return data;
  }

  async loadData() {
    const response = await fetch(SERVER_URL + "finance");
    const data: State["data"] = await response
      .json()
      .then((data) => data.responseObject.response);
    data.news = data.news.sort(() => Math.random() - 0.5);
    data.stocks = this.processStocks(data.stocks);
    this.setState({ data, loaded: true, index: 0 });
    localStorage.setItem("dashboard_finance", JSON.stringify(data));
    isMounted = false;
  }

  render() {
    // const width = window.innerWidth;
    const height = window.innerHeight;

    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          // paddingTop: "27%",
          background:
            "url(https://ssl.gstatic.com/finance/images/landingpage4.svg) no-repeat",
          backgroundSize: "400%",
          backgroundPosition: `-990px -${height * 0.3}px`,
          overflow: "hidden",
        }}
      >
        <Ticker
          key={"up"}
          direction={TickerDirection.DownUp}
          delay={0.2}
          pause={5000}
          items={arrayChunk(
            this.state.data.stocks.filter((one) =>
              one.change > 0 ? true : false
            ),
            2
          ).map((ones, oi) => {
            return (
              <div
                key={"stock" + oi}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignContent: "center",
                  justifyContent: "center",
                }}
              >
                {ones.map((one, index) => (
                  <Stock
                    value={one.price}
                    status={one.percentChange > 0 ? "UP" : "DO"}
                    changeValue={one.change}
                    changePercent={one.percentChange}
                    name={one.name}
                    key={"stock" + one.symbol + index}
                  />
                ))}
              </div>
            );
          })}
          elementStyle={{
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            top: "4%", //`-${Math.round(height * 0.25)}px`,
            width: "100vw",
          }}
        />

        <Ticker
          direction={TickerDirection.UpDown}
          pause={5000}
          key={"middle"}
          items={arrayChunk(
            this.state.data.stocks.filter((one) =>
              one.change < 0 ? true : false
            ),
            2
          ).map((ones, oi) => {
            return (
              <div
                key={"stock" + oi}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignContent: "center",
                  justifyContent: "center",
                }}
              >
                {ones.map((one, index) => (
                  <Stock
                    value={one.price}
                    status={one.percentChange > 0 ? "UP" : "DO"}
                    changeValue={one.change}
                    changePercent={one.percentChange}
                    name={one.name}
                    key={"stock" + one.symbol + oi + index}
                  />
                ))}
              </div>
            );
          })}
          elementStyle={{
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            top: "77%", //`${Math.round(height * 0.35)}px`,
            width: "100vw",
          }}
        />

        <Ticker
          direction={TickerDirection.LeftRight}
          key={"down"}
          pause={6000}
          items={this.state.data.news.map((one) => {
            return (
              <>
                <h1 style={{fontSize:"5em"}}>{one.headline}</h1>
                <div
                  style={{
                    fontSize: "1.6em",
                  }}
                >
                  {one.source}, {one.timeAgo}
                </div>
              </>
            );
          })}
          elementStyle={{
            margin: "20px",
            position: "absolute",
            width: "97vw",
            padding: "10px",
            // border: "1px solid black",
            top: "20%",
            height: "56%",
            borderRadius: "10px",
            display: "flex",
            alignContent: "center",
            justifyContent: "center",
          }}
        />
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(FinanceScene);
