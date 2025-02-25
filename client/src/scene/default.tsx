import { Component } from "react";
import { connect } from "react-redux";
import { RootState } from "../store";
import { KioskState, Scene } from "../store/kioskSlice";
import { Button } from "@/components/ui/button";
import { setCurrentScenes } from "../store/kioskSlice";
import { Dispatch } from "@reduxjs/toolkit";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardTile from "@/components/DashboardTile";
import GreenMesh from "@/scene/spotify/GreenMesh";
import Typewriter from "typewriter-effect";
import Marquee from "react-fast-marquee";

interface Props {
  kiosk: KioskState;
  dispatch: Dispatch;
}

class DefaultDashboard extends Component<Props> {
  render() {
    const { kiosk } = this.props;

    return (
      <DashboardLayout rows={2} columns={2}>
        <DashboardTile>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <div style={{ fontSize: "5em" }}>
              <Typewriter
                options={{
                  strings: ["Welcome to the Kiosk", "Default Scene"],
                  autoStart: true,
                  deleteSpeed: 15,
                  loop: true,
                }}
              />
            </div>
            <Button
              onClick={() => {
                this.props.dispatch(setCurrentScenes([Scene.Spotify]));
              }}
            >
              Click me + {kiosk.scenes}
            </Button>
          </div>
        </DashboardTile>
        <DashboardTile>
          <GreenMesh />
        </DashboardTile>
        <DashboardTile>
          <Marquee
            // gradient={true}
            // gradientColor="red"
            style={{ fontSize: "5em" }}
          >
            This is a scrolling text example. Feel free to customize it as you
            like!
          </Marquee>
        </DashboardTile>
        <DashboardTile>
          <iframe
            src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
            width={"100%"}
            height={"100%"}
          />
        </DashboardTile>
      </DashboardLayout>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(DefaultDashboard);
