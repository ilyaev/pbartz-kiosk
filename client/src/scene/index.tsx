import React, { Component } from "react";
import { connect } from "react-redux";
import { RootState } from "../store";
import { KioskState, Scene } from "../store/kioskSlice";
import { Dispatch } from "@reduxjs/toolkit";
import SpotifyDashboard, { ExtendedCurrentlyPlaying } from "@/scene/spotify";
import FinanceDashboard from "@/scene/finance";
import NewsDashboard from "@/scene/news";
import ApodDashboard from "@/scene/apod";
import HistoryEventsDashboard from "@/scene/history_events";
import { HISTORY_EVENTS, SCENE, SERVER_URL, SPOTIFY } from "@/lib/const";
import FallacyScene from "@/scene/fallacy";
import BiasScene from "@/scene/bias";
import IdleScene from "@/scene/idle";
import GameScene from "@/scene/game";

const FADE_SPEED = 1000;

interface Props {
  kiosk: KioskState;
  dispatch: Dispatch;
}

interface State {
  index: number;
  fade?: number;
  opacity: number;
  nextSceneTime: number;
}

const SCENE_MAP: { [key in Scene]: React.ComponentType } = {
  [Scene.Spotify]: SpotifyDashboard,
  [Scene.Finance]: FinanceDashboard,
  [Scene.News]: NewsDashboard,
  [Scene.APOD]: ApodDashboard,
  [Scene.HistoryEvents]: HistoryEventsDashboard,
  [Scene.Fallacy]: FallacyScene,
  [Scene.Bias]: BiasScene,
  [Scene.Idle]: IdleScene,
  [Scene.Game]: GameScene,
};

class DefaultDashboard extends Component<Props, State> {
  state = {
    index: 0,
    fade: Date.now(),
    opacity: 0,
    nextSceneTime: Date.now() + SCENE.refreshInterval,
  };

  interval?: number;
  animationId?: number;

  async nextScene(checkSpotify = true): Promise<[number, number]> {
    let isMusicPlaying = false;

    if (checkSpotify) {
      const myState: ExtendedCurrentlyPlaying = await fetch(
        SERVER_URL + "spotify/state"
      )
        .then((res) => res.json())
        .then((data) => data.responseObject);

      isMusicPlaying =
        myState.is_playing && myState.device.name === SPOTIFY.device;
    }

    if (
      isMusicPlaying &&
      this.props.kiosk.scenes.indexOf(Scene.Spotify) !== -1
    ) {
      return [
        this.props.kiosk.scenes.indexOf(Scene.Spotify),
        SCENE.refreshInterval,
      ];
    }

    const scenes = this.props.kiosk.scenes
      .filter((_scene, index) => index !== this.state.index)
      .filter((scene) => {
        if (scene === Scene.Spotify) {
          return isMusicPlaying ? true : false;
        }
        return true;
      });

    if (scenes.length === 0) {
      return [this.state.index, SCENE.refreshInterval];
    }

    const nextIndex = this.props.kiosk.scenes.indexOf(
      scenes[Math.floor(Math.random() * scenes.length)]
    );

    let refreshInterval = SCENE.refreshInterval;

    if (this.props.kiosk.scenes[nextIndex] === Scene.HistoryEvents) {
      refreshInterval = HISTORY_EVENTS.sceneDuration;
    }

    if (this.props.kiosk.scenes[nextIndex] === Scene.Game) {
      refreshInterval = SCENE.refreshInterval * 5; // Games might need more time
    }

    return [nextIndex, refreshInterval];
  }

  async changeScene(checkSpotify = true, forceScene?: Scene): Promise<void> {
    let [nextScene, nextSceneTime] = await this.nextScene(checkSpotify);

    if (forceScene) {
      const forcedIndex = this.props.kiosk.scenes.indexOf(forceScene);
      if (forcedIndex !== -1) {
        nextScene = forcedIndex;
        nextSceneTime = SCENE.refreshInterval;
      }
    }

    if (nextScene === this.state.index) {
      this.setState({ nextSceneTime: Date.now() + nextSceneTime });
      return;
    }

    this.setState({
      fade: Date.now(),
      opacity: 0,
      nextSceneTime: Date.now() + nextSceneTime,
    });
    setTimeout(() => {
      this.setState({ index: nextScene });
    }, FADE_SPEED / 2);
  }

  async componentDidMount(): Promise<void> {
    this.interval = setInterval(async () => {
      if (Date.now() > this.state.nextSceneTime) {
        await this.changeScene();
      }
    }, 1000);
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  update() {
    if (typeof this.state.fade !== "undefined" && this.state.fade) {
      const d = Date.now() - this.state.fade;
      if (d < FADE_SPEED) {
        this.setState({ opacity: Math.abs(Math.sin((d / FADE_SPEED) * 3.14)) });
      } else {
        this.setState({ fade: undefined, opacity: 0 });
      }
    }
    this.animationId = requestAnimationFrame(this.update.bind(this));
  }

  componentWillUnmount(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
    cancelAnimationFrame(this.animationId!);
  }

  render() {
    const { kiosk } = this.props;
    const SceneComponent = SCENE_MAP[kiosk.scenes[this.state.index]];
    return (
      <>
        <div
          tabIndex={0}
          onClick={(e: React.MouseEvent<HTMLDivElement>) => {
            if (kiosk.scenes[this.state.index] !== Scene.Spotify) {
              if (e.metaKey) {
                this.changeScene(false, Scene.Spotify);
              } else {
                this.changeScene(false);
              }
            }
          }}
          style={{
            height: "100vh",
            width: "100vw",
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <SceneComponent />
        </div>
        {this.renderFader()}
      </>
    );
  }

  renderFader() {
    if (typeof this.state.fade === "undefined") {
      return null;
    }
    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "100vh",
          width: "100vw",
          background: "black",
          zIndex: 2000000,
          opacity: this.state.opacity,
        }}
      />
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(DefaultDashboard);
