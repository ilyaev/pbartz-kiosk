/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component } from "react";
import * as THREE from "three";
import { ThreeScene } from "./scene/base";
// import { CubeScene } from "./scene/cube";
// import { CirclesScene } from "./scene/circles/circles";
// import { TunnelScene } from "./scene/tunnel/tunnel";
// import { StarsScene } from "./scene/stars/stars";
// import { WaveScene } from "./scene/wave/wave";
// import { CircleBeatScene } from "./scene/circle_beat/circle_beat";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { TrackSync } from "./utils/track_sync";
import { SpotifyPlaybackState } from "./utils/types";
// import { BeatScene } from "./scene/beat/beat";
import { SynthwaveScene } from "./scene/synthwave/synthwave";

interface Params {
    volume: number;
    sync: TrackSync;
    playbackState: SpotifyPlaybackState;
}

interface State {}

export class VizScene extends Component<Params, State> {
    scene: THREE.Scene = new THREE.Scene();
    camera?: THREE.PerspectiveCamera;
    mount: any;
    controls?: OrbitControls;
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
    requestID: number = 0;
    vscene?: ThreeScene;
    frames: number = 0;

    timeShift: number = 0;

    componentDidUpdate(
        prevProps: Readonly<Params>,
        prevState: Readonly<State>
    ): void {
        console.log("Did update", this.props, prevProps, this.state, prevState);
        this.vscene!.textureUrl =
            this.props.playbackState.item.album.images[0].url;
        this.vscene!.pallete.textureUrl = this.vscene!.textureUrl;
        this.vscene!.onFinishTrack();
        // this.vscene!.onEnter();
    }

    componentDidMount() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            75,
            width / height,
            0.1,
            1000
        );

        this.camera.position.z = 6;

        this.controls = new OrbitControls(this.camera, this.mount);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(width, height);
        this.mount.appendChild(this.renderer.domElement);

        // this.vscene = new StarsScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        // }) as StarsScene;

        // this.vscene = new TunnelScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        // }) as TunnelScene;

        // this.vscene = new CirclesScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        // }) as CirclesScene;

        // this.vscene = new CubeScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        //     textureUrl: this.props.playbackState.item.album.images[0].url,
        // }) as CubeScene;

        // this.vscene = new WaveScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        //     textureUrl: this.props.playbackState.item.album.images[0].url,
        // }) as WaveScene;

        // this.vscene = new CircleBeatScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        //     textureUrl: this.props.playbackState.item.album.images[0].url,
        // }) as CircleBeatScene;

        // this.vscene = new BeatScene({
        //     camera: this.camera,
        //     scene: this.scene,
        //     renderer: this.renderer,
        //     textureUrl: this.props.playbackState.item.album.images[0].url,
        // }) as BeatScene;

        this.vscene = new SynthwaveScene({
            camera: this.camera,
            scene: this.scene,
            renderer: this.renderer,
            textureUrl: this.props.playbackState.item.album.images[0].url,
        }) as SynthwaveScene;

        this.vscene.build();
        this.vscene!.update(0, this.props.sync);
        this.vscene.onEnter();
        this.props.sync.on("beat", (b: any) => this.vscene!.onBeat(b));
        this.props.sync.on("segment", (s: any) => {
            this.vscene!.onSegment(s);
        });

        // Start the animation loop
        this.startAnimationLoop(0);
    }

    startAnimationLoop(now: any) {
        if (this.frames === 0) {
            const ns = window.performance.now();
            this.timeShift = ns - (window as any).GL_START;
        }
        this.frames += 1;

        if (this.props.sync) {
            this.props.sync.tick(
                now + (isNaN(this.timeShift) ? 0 : this.timeShift)
            );
        }
        this.vscene!.update(now, this.props.sync);
        this.renderer.render(this.scene, this.camera!);
        if (
            this.vscene?.textureUrl !==
            this.props.playbackState.item.album.images[0].url
        ) {
            this.vscene?.updateTexture(
                this.props.playbackState.item.album.images[0].url
            );
        }

        this.requestID = window.requestAnimationFrame(
            this.startAnimationLoop.bind(this)
        );
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(this.requestID);
        this.controls!.dispose();
        this.vscene!.dispose();
    }

    render() {
        return (
            <>
                <div
                    style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        zIndex: -1,
                    }}
                    ref={(ref) => {
                        this.mount = ref;
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        color: "white",
                        padding: "10px",
                    }}
                >
                    <div
                        style={{
                            marginLeft: "5px",
                            paddingLeft: "5px",
                            // border: "1px solid gray",
                        }}
                    >
                        {this.props.playbackState.item.name} by{" "}
                        {this.props.playbackState.item.artists[0].name}
                    </div>
                    <img
                        style={{
                            margin: "5px",
                            padding: "5px",
                            // border: "1px solid gray",
                        }}
                        id={"GL_ALBUM_ART"}
                        width={100}
                        src={this.props.playbackState.item.album.images[1].url}
                    />
                    <div>
                        <img
                            src="/spotify_logo.png"
                            width={120}
                            style={{ margin: "15px" }}
                        />
                    </div>
                </div>
            </>
        );
    }
}
