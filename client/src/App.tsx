import { Component } from "react";
import "./App.css";
import { connect } from "react-redux";
import { setLastLigtMotion } from "./store/kioskSlice";
import DefaultDashboard from "./scene";
import ServerSensors from "./lib/sensors";
import { Dispatch } from "@reduxjs/toolkit";
// import ThreeScene from "./scene/spotify/visuals/stars";
// import Wave from "./scene/spotify/visuals/wave";
// import StarFly from "./scene/spotify/visuals/starfly";
// import CubeGrid from "./scene/spotify/visuals/city";
// import Life from "./scene/spotify/visuals/life";

const DEBUG = true

interface Props {
  dispatch: Dispatch;
  setLastLigtMotion: (data: { light: number; motion: number }) => void;
}

interface State {
  mode: string;
  light: number;
}

class App extends Component<Props, State> {
  state = {
    mode: "dashboard",
    light: 0,
  };

  sensors: ServerSensors | null = null;

  lastLight: number = 0;
  lastMotion: number = 0;
  brightness: number = -1;

  componentDidMount(): void {
    this.sensors = new ServerSensors({
      callback: this.onSensorData.bind(this),
    });
  }

  onSensorData(data: number[]): void {
    const now = new Date();
    const hour = now.getHours();


    if (data[1] === -1) {
      return;
    }

    if ((hour >= 23 || hour <= 8) && this.state.mode !== "standby") {
      this.sensors?.setBacklight(0);
      this.setState({ mode: "standby" });
      return;
    }

    if (hour > 8 && hour < 23 && this.state.mode !== "dashboard") {
      this.setState({ mode: "dashboard" });
      this.sensors?.setBacklight(4);
      return;
    }

    if (this.brightness === -1) {
      console.log("Setting brightness to 3");
      this.sensors?.setBacklight(3);
      this.brightness = 3;
    }

    const light = data[1];
    const motion = data[0];

    this.setState({ light });

    this.lastLight = light;
    this.lastMotion = motion;

    this.props.setLastLigtMotion({
      light: this.lastLight,
      motion: this.lastMotion,
    });
  }

  componentWillUnmount(): void {
    if (this.sensors) {
      this.sensors.close();
    }
  }

  renderStandby() {
    return (
      <div
      key={'standby'}
        style={{
          backgroundColor: "black",
          color: "#AAAAAA",
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "3em",
        }}
      >
        Stand By
      </div>
    );
  }

  renderDebug() {
    return (
      <div
        style={{
          backgroundColor: "black",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1000,
          color: "#AAAAAA",
          width: "100",
          height: "100",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "2em",
        }}
      >
        {Math.round(this.state.light)}
      </div>
    );
  }

  render() {
    return (
      <>
        {this.state.mode === "dashboard" && <DefaultDashboard key={'dashboard'} />}
        {this.state.mode === "standby" && this.renderStandby()}
        {DEBUG && this.renderDebug()}
        {/* <ThreeScene /> */}
        {/* <Wave /> */}
        {/* <StarFly bars={[1, 0, 0, 0, 0, 0, 0]} rms={0.1} tempo={100} /> */}
        {/* <CubeGrid /> */}
        {/* <Life /> */}
      </>
    );
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setLastLigtMotion: (data: { light: number; motion: number }) =>
    dispatch(setLastLigtMotion(data)),
});

export default connect(null, mapDispatchToProps)(App);
