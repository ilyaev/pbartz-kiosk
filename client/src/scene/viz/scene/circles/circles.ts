import { ThreeScene } from "../base";
import * as THREE from "three";
import { TrackSync } from "../../utils/track_sync";
import { Vector2, DoubleSide, ShaderMaterial } from "three";
import vShader from "./circles.vs.glsl";
import fShader from "./circles.fs.glsl";

export class CirclesScene extends ThreeScene {
    material!: ShaderMaterial;
    mesh!: THREE.Mesh;

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
                rad: { type: "f", value: 0.25 },
                u_resolution: { type: "vec2", value: resolution },
                u_circles: { type: "i", value: 10 },
                u_size: { type: "f", value: 0.05 },
                u_volume: { type: "f", value: 0.0 },
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
        // this.setDefaultLights()
    }

    onEnter() {
        // this.camera.position.setZ(6)
    }

    update(now: number, track: TrackSync) {
        const volume = track && track.volume ? track.volume : 0;
        this.material.uniforms.t.value = now / 1000;

        this.material.uniforms.u_circles.value = 4 + Math.ceil(volume * 5);
        // this.material.uniforms.u_size.value = 0.5 / this.material.uniforms.u_circles.value
        this.material.uniforms.u_volume.value = volume;
        this.track = track;
    }
}
