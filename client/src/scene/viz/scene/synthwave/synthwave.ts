import { ThreeScene } from "../base";
import * as THREE from "three";
import { TrackSync } from "../../utils/track_sync";
import { Vector2, DoubleSide, ShaderMaterial } from "three";
import vShader from "./synthwave.vs.glsl";
import fShader from "./synthwave.fs.glsl";

export class SynthwaveScene extends ThreeScene {
    material!: ShaderMaterial;
    mesh!: THREE.Mesh;
    now: number = 0;

    build() {
        this.camera.fov = 60;
        this.camera.position.z = 500;
        this.camera.position.y = 0;
        this.camera.rotation.x = 0;

        if (!this.material) {
            const resolution = new Vector2(
                window.innerWidth,
                window.innerHeight
            );
            this.camera.position.z = resolution.y / 2;
            const uniforms = {
                t: { type: "f", value: 0.0 },
                iTime: { type: "f", value: 0.0 },
                u_resolution: { type: "vec2", value: resolution },
                u_volume: { type: "f", value: 0.0 },
                u_fade: { type: "f", value: 1.0 },
                u_tempo: { type: "f", value: 100.0 },
                u_mode: { type: "f", value: 0.0 },
                u_beat: { type: "f", value: 0.0 },
                u_beat_confidence: { type: "f", value: 0.0 },
                u_beat_index: { type: "f", value: 0.0 },
                u_beat_next: { type: "f", value: 0.0 },
                u_pallete_size: { type: "f", value: 0.0 },
                COLOR_PURPLE: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                MOUNTAIN_COLOR: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                COLOR_NIGHT_SUN: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                COLOR_NIGHT_MOUNTAIN: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                COLOR_NIGHT_GRID: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                u_pallete_1: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                u_pallete_2: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
                u_pallete_3: {
                    type: "vec3",
                    value: new THREE.Vector3(0, 0, 0),
                },
            };

            const geometry = new THREE.PlaneGeometry(
                resolution.x,
                resolution.y,
                1,
                1
            );
            this.material = new THREE.ShaderMaterial({
                uniforms: uniforms,
                fragmentShader: fShader,
                side: DoubleSide,
                vertexShader: vShader,
            });

            this.mesh = new THREE.Mesh(geometry, this.material);
        }

        this.scene.add(this.mesh);
        this.setDefaultLights();

        this.initPallete();
    }

    initPallete() {
        this.pallete.init().then(() => {
            this.material.uniforms.u_pallete_size.value =
                this.pallete.colors.length;
            const firstLight = this.pallete.lighterColor([0.9, 0.3, 0.1], 1);
            const secondLight = this.pallete.lighterColor([0.54, 0.11, 1], 2);
            const thirdLight = this.pallete.lighterColor([0.5, 0.0, 0], 3);
            const fourthLight = this.pallete.lighterColor([0.9, 0.3, 0.1], 4);
            const fiveLight = this.pallete.lighterColor([0, 0.15, 0], 5);

            this.material.uniforms.u_pallete_1.value = firstLight;
            this.material.uniforms.COLOR_PURPLE.value = firstLight;
            this.material.uniforms.MOUNTAIN_COLOR.value = secondLight;
            this.material.uniforms.COLOR_NIGHT_SUN.value = thirdLight;
            this.material.uniforms.COLOR_NIGHT_MOUNTAIN.value = fourthLight;
            this.material.uniforms.COLOR_NIGHT_GRID.value = fiveLight;
        });
    }

    onEnter() {
        super.onEnter();
    }

    onFinishTrack(): void {
        console.log("Finish 2");
        super.onFinishTrack();
        this.initPallete();
    }

    onBeat(b: any): void {
        // console.log(b, volume);
        if (b.confidence > 0.3) {
            this.material.uniforms.u_beat.value = this.now / 1000;
            this.material.uniforms.u_beat_confidence.value = b.confidence - 0.5;
            this.material.uniforms.u_beat_index.value = b.index;
            this.material.uniforms.u_beat_next.value =
                this.material.uniforms.u_beat.value + b.duration / 1000;
        }
    }

    update(now: number, track: TrackSync) {
        this.now = now;
        super.update(now, track);

        const tempo = this.tempo;
        const mode = this.mode;

        const volume = track && track.volume ? track.volume : 0;

        this.material.uniforms.t.value = now / 1000;
        this.material.uniforms.iTime.value = (now / 1000) * (tempo / 200);
        this.material.uniforms.u_fade.value = this.fade;
        this.material.uniforms.u_volume.value = volume;
        this.material.uniforms.u_tempo.value = tempo || 100;
        this.material.uniforms.u_mode.value = mode;

        this.track = track;
    }
}
