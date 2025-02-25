import { Component } from "react";
import { Animate } from "react-simple-animate";

export enum TickerDirection {
  LeftDown = "Left_Down",
  RightDown = "Right_Down",
  RightLeft = "Right_Left",
  DownDown = "Down_Down",
  UpDown = "Up_Down",
  UpLeft = "Up_Left",
  UpRight = "Up_Right",
  DownRight = "Down_Right",
  DownLeft = "Down_Left",
  LeftRight = "Left_Right",
  RightUp = "Right_Up",
  LeftUp = "Left_Up",
  LeftLeft = "Left_Left",
  RightRight = "Right_Right",
  UpUp = "Up_Up",
  DownUp = "Down_Up",
}

interface Props {
  items: React.ReactElement[];
  elementStyle?: React.CSSProperties;
  style?: StylePropertyMap;
  duration?: number;
  delay?: number;
  direction?: TickerDirection;
  pause?: number;
}

interface State {
  index: number;
}

export class Ticker extends Component<Props, State> {
  state = {
    index: 0,
  };

  render() {
    const parts = (this.props.direction || TickerDirection.LeftRight).split(
      "_"
    );

    const halfWidth = window.innerWidth * 0.8;
    const halfHeight = window.innerHeight / 1.8;

    const start = {
      x: -halfWidth,
      y: 0,
    };
    const end = {
      x: 0,
      y: 0,
    };

    if (parts[0] === "Right") {
      start.x = halfWidth;
      end.x = 0;
    }

    if (parts[0] === "Down") {
      start.y = -halfHeight;
      start.x = 0;
      end.y = 0;
    }

    if (parts[0] === "Up") {
      start.y = halfHeight;
      start.x = 0;
      end.y = 0;
    }

    const start2 = {
      x: 0,
      y: 0,
    };
    const end2 = {
      x: 0,
      y: halfHeight,
    };

    if (parts[1] === "Right") {
      start2.x = 0;
      end2.x = halfWidth;
      end2.y = 0;
    }

    if (parts[1] === "Left") {
      start2.x = 0;
      end2.x = -halfWidth;
      end2.y = 0;
    }

    if (parts[1] === "Up") {
      start2.y = 0;
      end2.y = -halfHeight;
      end2.x = 0;
    }

    return (
      <>
        {this.props.items.map((one, index) => {
          const play = this.state.index === index;
          return (
            <Animate
              key={"enter" + index}
              sequenceIndex={this.state.index + 1}
              play={play}
              duration={1}
              delay={0.2}
              start={{
                transform: `translate(${start.x}px, ${start.y}px)`,
                opacity: 0,
              }}
              end={{
                transform: `translate(${end.x}px, ${end.y}px)`,
                opacity: 1,
              }}
              easeType="ease-in-out"
              onComplete={() => {
                setTimeout(() => {
                  let nextIndex = this.state.index + 1;
                  if (nextIndex >= this.props.items.length) {
                    nextIndex = 0;
                  }
                  this.setState({ index: nextIndex });
                }, this.props.pause || 1000);
              }}
            >
              <div
                style={{
                  ...(this.props.elementStyle || {}),
                  ...{ display: this.state.index === index ? "block" : "none" },
                }}
              >
                {one}
              </div>
            </Animate>
          );
        })}

        {this.props.items.map((one, index) => {
          let play = this.state.index === index + 1;
          if (index === this.props.items.length - 1 && this.state.index === 0) {
            play = true;
          }
          return (
            <Animate
              key={"exit" + index}
              play={play}
              duration={1}
              delay={this.props.delay || 0}
              start={{
                transform: `translate(${start2.x}px, ${start2.y}px)`,
                opacity: 1,
              }}
              end={{
                transform: `translate(${end2.x}px, ${end2.y}px)`,
                opacity: 0,
              }}
              easeType="ease-in-out"
            >
              <div
                style={{
                  ...(this.props.elementStyle || {}),
                  ...{
                    display: play ? "block" : "none",
                  },
                }}
              >
                {one}
              </div>
            </Animate>
          );
        })}
      </>
    );
  }
}
