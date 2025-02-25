import React, { Component, ReactNode } from "react";
import "./index.css";

interface SceneFaderProps {
  delay?: number;
  toBlack?: boolean;
  children?: ReactNode;
}

interface SceneFaderState {
  currentIndex: number;
  showOverlay: boolean;
}

class SceneFader extends Component<SceneFaderProps, SceneFaderState> {
  private intervalId: number | null = null;

  constructor(props: SceneFaderProps) {
    super(props);
    this.state = {
      currentIndex: 0,
      showOverlay: false,
    };
  }

  componentDidMount() {
    this.startSceneRotation();
  }

  componentWillUnmount() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  startSceneRotation = () => {
    const { delay } = this.props;
    this.intervalId = setInterval(this.nextScene, delay || 5000);
  };

  nextScene = () => {
    this.setState({ showOverlay: true });
    setTimeout(() => {
      this.setState((prevState) => ({
        currentIndex:
          (prevState.currentIndex + 1) %
          React.Children.count(this.props.children),
        showOverlay: false,
      }));
    }, 500);
  };

  render() {
    const { children, toBlack } = this.props;
    const { currentIndex, showOverlay } = this.state;

    return (
      <>
        <div
          className={`overlay ${showOverlay ? "show" : ""}`}
          style={{
            background: toBlack ? "rgba(0, 0, 0, 1)" : "rgba(255, 255, 255, 1)",
          }}
        />
        {React.Children.toArray(children)[currentIndex]}
      </>
    );
  }
}

export default SceneFader;
