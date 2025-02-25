import * as THREE from "three";

export interface PalleteItem {
  hex: string;
  area: number;
  red: number;
  green: number;
  blue: number;
  lightness: number;
  intensity: number;
  saturation: number;
  hue: number;
}

export class ScenePallete {
  textureUrl: string = "";
  colors: PalleteItem[];

  constructor(url: string) {
    this.textureUrl = url;
    this.colors = [];
  }

  colorVector(index: number, defColor = [] as number[]) {
    const item = this.colors[index] || {};
    if (typeof item.red !== "undefined") {
      return new THREE.Vector3(item.red, item.green, item.blue);
    } else {
      return new THREE.Vector3(defColor[0], defColor[1], defColor[2]);
    }
  }

  lighterColor(defColor = [] as number[], count = 1) {
    let result = this.colorVector(-1, defColor);
    let flag = 0;
    this.colors.forEach((color, index) => {
      if (color.lightness > 0.2 && flag < count) {
        result = this.colorVector(index);
        flag++;
      }
    });
    return result;
  }

  async init() {
    return Promise.resolve([]);
    if (!this.textureUrl) {
      return Promise.resolve([]);
    }
    let base = "/api/";
    if (document.location.hostname.indexOf("localhost") !== -1) {
      base = "http://localhost:3000/api/";
    }
    let pallete = [] as PalleteItem[];
    try {
      pallete = await fetch(base + "image?url=" + this.textureUrl).then(
        (response) => response.json()
      );
    } catch (e) {
      pallete = [] as PalleteItem[];
    }
    this.colors = pallete
      .sort((a, b) => b.area - a.area)
      .map((p) => {
        p.red = p.red / 255;
        p.green = p.green / 255;
        p.blue = p.blue / 255;
        return p;
      });
  }
}
