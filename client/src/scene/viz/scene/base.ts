/* eslint-disable @typescript-eslint/no-unused-vars */
import * as THREE from "three";
import { Clock } from "three";
import { TrackSync } from "../utils/track_sync";
import { ScenePallete } from "./pallete";

interface Params {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    textureUrl: string;
}

export class ThreeScene {
    scene!: THREE.Scene;
    camera!: THREE.PerspectiveCamera;
    renderer!: THREE.WebGLRenderer;
    defaultLights: THREE.PointLight[] = [];
    clock: Clock;
    fade: number = 1;
    track!: TrackSync;
    tempo: number = 0;
    mode: number = 0;
    textureUrl: string = "";
    pallete: ScenePallete;

    constructor(params?: Params) {
        if (params) {
            this.scene = params.scene;
            this.camera = params.camera;
            this.renderer = params.renderer;
            this.textureUrl = params.textureUrl;
        }
        this.pallete = new ScenePallete(this.textureUrl || "");
        this.clock = new Clock();
    }

    getVolume() {
        const track = this.track;
        const volume = track && track.volume ? track.volume : 0;
        return volume;
    }

    build() {}

    update(_now: number, track: TrackSync) {
        if (track.state.trackAnalysis.track) {
            const fadeOutStart =
                track.state.trackAnalysis.track.start_of_fade_out * 1000;
            const fadeInEnds =
                track.state.trackAnalysis.track.end_of_fade_in * 1000;
            const current = track.state.trackProgress;
            const duration = track.state.currentlyPlaying.duration_ms;
            this.fade = 1;
            if (current < fadeInEnds) {
                this.fade = current / fadeInEnds;
            } else if (current > fadeOutStart) {
                this.fade = (duration - current) / (duration - fadeOutStart);
            }
            this.fade = Math.abs(this.fade);

            if (!this.tempo) {
                this.tempo = track.state.trackAnalysis.track.tempo;
                this.mode = track.state.trackAnalysis.track.mode;
            }
        }
        this.track = track;
    }

    onEnter() {
        if (this.track.state.trackAnalysis.track) {
            console.log("enter", this.track);
        }
    }

    onExit() {}

    onBeat(_b: any) {}

    onFinishTrack() {
        console.log("Funish!");
    }

    onSegment(_s: any) {}

    setDefaultLights() {
        if (!this.defaultLights.length) {
            this.defaultLights = [];
            this.defaultLights[0] = new THREE.PointLight(0xffffff, 10, 10);
            this.defaultLights[1] = new THREE.PointLight(0xffffff, 10, 10);
            this.defaultLights[2] = new THREE.PointLight(0xffffff, 10, 10);
            this.defaultLights[3] = new THREE.PointLight(0xffffff, 10, 10);
            this.defaultLights[4] = new THREE.PointLight(0xffffff, 10, 10);

            // this.defaultLights[4].color = new THREE.Color(0xff0000);
            // this.defaultLights[3].color = new THREE.Color(0x00ff00);

            this.defaultLights[0].position.set(0, 3, 0);
            this.defaultLights[1].position.set(0, -3, 0);
            this.defaultLights[2].position.set(0, 0, 3);
            this.defaultLights[3].position.set(3, 0, 0);
            this.defaultLights[4].position.set(-3, 0, 0);
        }
        this.scene.add(this.defaultLights[0]);
        this.scene.add(this.defaultLights[1]);
        this.scene.add(this.defaultLights[2]);
        this.scene.add(this.defaultLights[3]);
        this.scene.add(this.defaultLights[4]);
    }

    updateTexture(_textureUrl: string) {}

    dispose() {}
}
