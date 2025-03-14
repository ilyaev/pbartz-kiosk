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

let sensors: ServerSensors | null = null;

interface Props {
  dispatch: Dispatch;
  setLastLigtMotion: (data: { light: number; motion: number }) => void;
}

class App extends Component<Props> {
  componentDidMount(): void {
    sensors = new ServerSensors({
      callback: this.onSensorData.bind(this),
    });
  }

  onSensorData(data: number[]): void {
    this.props.setLastLigtMotion({ light: data[0], motion: data[1] });
  }

  componentWillUnmount(): void {
    if (sensors) {
      sensors.close();
    }
  }

  render() {
    return (
      <>
        <DefaultDashboard />
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
