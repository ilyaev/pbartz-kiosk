/* eslint-disable @typescript-eslint/no-unused-vars */
import { ThreeScene } from "./base";
import * as THREE from "three";
import { TrackSync } from "../utils/track_sync";
// import { getRandomColor } from "../utils";
// import { getRandomColor } from "../utils/index";

export class CubeScene extends ThreeScene {
    cube!: THREE.Mesh;
    volume: number = 0;
    rot_x: number = 0;
    rot_y: number = 0;

    build() {
        console.log("Texturse - ", this.textureUrl);
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(this.textureUrl);
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshPhongMaterial({
            // color: 0x156289,
            // emissive: 0x072534,
            side: THREE.DoubleSide,
            flatShading: true,
            map: texture,
        });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);

        this.setDefaultLights();
    }

    onEnter() {
        this.camera.position.setZ(3);
    }

    onSegment(s: any): void {
        if (s.confidence > 0.5) {
            // console.log("Segment - ", s);
        }
    }

    updateTexture(textureUrl: string) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(textureUrl);
        const mat = this.cube.material as any;
        mat.map = texture;
    }

    onBeat(beat: any) {
        if (beat.confidence < 0.2) {
            return;
        }
        const n = Math.random();
        if (n > 0.5) {
            this.rot_x = 0;
            this.rot_y = 0.01 + 0.02; // * beat.confidence;
        } else {
            this.rot_x = 0.01 + 0.02; // * beat.confidence;
            this.rot_y = 0;
        }
        if (beat.confidence > 0.8) {
            this.cube.position.x = (Math.random() - 0.5) * 2;
            this.cube.position.y = (Math.random() - 0.5) * 2;
        }
        // const mat = this.cube.material as any;
        // mat.color.setRGB(...getRandomColor());
        this.camera.position.setZ(3 + Math.pow(this.track!.volume || 1, 3));
    }

    update(_now: number, track: TrackSync) {
        const volume = track && track.volume ? track.volume : 0;
        this.cube.rotation.x += this.rot_x * volume; // * volume;
        this.cube.rotation.y += this.rot_y * volume; // * volume;
        if (!this.track) {
            this.track = track;
        }
        // this.camera.position.setZ(6 + Math.pow(this.track!.volume || 1, 3));
    }
}
