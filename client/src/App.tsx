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

interface Props {
  dispatch: Dispatch;
  setLastLigtMotion: (data: { light: number; motion: number }) => void;
}

interface State {
  mode: string;
}

class App extends Component<Props, State> {
  state = {
    mode: "dashboard",
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

    if (data[0] === -1) {
      return;
    }

    if (hour >= 23 && this.state.mode !== "standby") {
      this.setState({ mode: "standby" });
      return;
    }

    if (hour > 8 && this.state.mode !== "dashboard") {
      this.setState({ mode: "dashboard" });
      return;
    }

    if (this.brightness === -1) {
      this.sensors?.setBacklight(50);
      this.brightness = 50;
    }

    const light = data[0];
    const motion = data[1];

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

  render() {
    return (
      <>
        {this.state.mode === "dashboard" && <DefaultDashboard />}
        {this.state.mode === "standby" && this.renderStandby()}
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
