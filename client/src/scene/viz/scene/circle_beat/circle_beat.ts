import { ThreeScene } from "../base";
import * as THREE from "three";
import { TrackSync } from "../../utils/track_sync";
import { Vector2, DoubleSide, ShaderMaterial } from "three";
import vShader from "./circle_beat.vs.glsl";
import fShader from "./circle_beat.fs.glsl";

export class CircleBeatScene extends ThreeScene {
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
                u_resolution: { type: "vec2", value: resolution },
                u_volume: { type: "f", value: 0.0 },
                u_fade: { type: "f", value: 1.0 },
                u_tempo: { type: "f", value: 100.0 },
                u_mode: { type: "f", value: 0.0 },
                u_beat: { type: "f", value: 0.0 },
                u_beat_confidence: { type: "f", value: 0.0 },
                u_beat_index: { type: "f", value: 0.0 },
                u_beat_next: { type: "f", value: 0.0 },
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
    }

    onEnter() {
        super.onEnter();
    }

    onBeat(b: any): void {
        console.log(b);
        this.material.uniforms.u_beat.value = this.now / 1000;
        this.material.uniforms.u_beat_confidence.value = b.confidence - 0.5;
        this.material.uniforms.u_beat_index.value = b.index;
        this.material.uniforms.u_beat_next.value =
            this.material.uniforms.u_beat.value + b.duration / 1000;
    }

    update(now: number, track: TrackSync) {
        this.now = now;
        super.update(now, track);

        const tempo = this.tempo;
        const mode = this.mode;

        const volume = track && track.volume ? track.volume : 0;

        this.material.uniforms.t.value = now / 1000;
        this.material.uniforms.u_fade.value = this.fade;
        this.material.uniforms.u_volume.value = volume;
        this.material.uniforms.u_tempo.value = tempo || 100;
        this.material.uniforms.u_mode.value = mode;

        this.track = track;
    }
}
