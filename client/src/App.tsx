import { Component } from "react";
import "./App.css";
import { connect } from "react-redux";
import { setLastLigtMotion } from "./store/kioskSlice";
import DefaultDashboard from "./scene";
import ServerSensors from "./lib/sensors";
import { Dispatch } from "@reduxjs/toolkit";

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
      </>
    );
  }
}

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setLastLigtMotion: (data: { light: number; motion: number }) =>
    dispatch(setLastLigtMotion(data)),
});

export default connect(null, mapDispatchToProps)(App);
