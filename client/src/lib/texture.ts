import * as THREE from "three";
import { SERVER_URL } from "./const";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

export class ShaderTexture {
  static loader = new THREE.TextureLoader();

  static blackness(texture: THREE.Texture) {
    if (!texture.image) return 0;
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    let width: number, height: number;

    if (
      texture.image instanceof HTMLImageElement ||
      texture.image instanceof HTMLCanvasElement
    ) {
      width = texture.image.width;
      height = texture.image.height;
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      ctx.drawImage(texture.image, 0, 0, width, height);
    } else if (
      texture.image.data &&
      texture.image.width &&
      texture.image.height
    ) {
      width = texture.image.width;
      height = texture.image.height;
      canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const imageData = ctx.createImageData(width, height);
      imageData.data.set(texture.image.data);
      ctx.putImageData(imageData, 0, 0);
    } else {
      return 0;
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let total = 0;
    let black = 0;
    for (let i = 0; i < data.length; i += 4) {
      // Perceived luminance (ITU-R BT.709)
      const luminance =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (luminance < 32) black++;
      total++;
    }
    canvas.remove();
    return total ? black / total : 0;
  }

  static async spotifyAlbumCover(fileName: string): Promise<THREE.Texture> {
    return new Promise((resolve) => {
      const url =
        fileName.indexOf("files/") !== -1
          ? fileName.replace("files/", `${SERVER_URL}resize_image/file/`)
          : `${SERVER_URL}resize_image/url?${fileName}`;
      this.loader.load(
        url,
        (texture) => {
          texture.minFilter = THREE.NearestFilter;
          texture.magFilter = THREE.NearestFilter;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;

          resolve(texture);
        },
        undefined,
        (error) => {
          console.error("Error loading texture:", error);
          resolve(this.blank());
        }
      );
    });
  }

  static blank(): THREE.DataTexture {
    const IMG_WIDTH = 256;
    const IMG_HEIGHT = 256;
    // Generate random texture
    const size = IMG_WIDTH * IMG_HEIGHT * 4;
    const data = new Uint8Array(size);
    for (let i = 0; i < size; i += 4) {
      data[i] = 128; // R
      data[i + 1] = 128;
      data[i + 2] = 128; // G
      data[i + 3] = 255; // A
    }

    const randomTexture = new THREE.DataTexture(
      data,
      IMG_WIDTH,
      IMG_HEIGHT,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    randomTexture.needsUpdate = true;
    randomTexture.generateMipmaps = false;
    randomTexture.minFilter = THREE.NearestFilter;
    randomTexture.magFilter = THREE.NearestFilter;
    randomTexture.wrapS = THREE.ClampToEdgeWrapping;
    randomTexture.wrapT = THREE.ClampToEdgeWrapping;
    return randomTexture;
  }

  static positionsSphereLines(sphereCols: number, sphereRows: number) {
    const TEXTURE_WIDTH = 256;
    const TEXTURE_HEIGHT = 256;
    const totalTexturePixels = TEXTURE_WIDTH * TEXTURE_HEIGHT;
    const imageData = new ImageData(TEXTURE_WIDTH, TEXTURE_HEIGHT);
    const data = imageData.data;

    const numMeridians = Math.max(1, sphereCols);
    const numLatSegments = Math.max(1, sphereRows); // Number of segments from pole to pole
    const numParallelLines = numLatSegments + 1; // Number of actual parallel lines

    const totalLineElements = numMeridians + numParallelLines;

    // How many texture pixels are dedicated to drawing each line element
    const pixelsPerLineElement = Math.max(
      1,
      Math.floor(totalTexturePixels / totalLineElements)
    );

    for (let i = 0; i < totalTexturePixels; i++) {
      let x_coord, y_coord, z_coord; // Renamed to avoid conflict with canvas ctx variables

      // Determine which line element this pixel belongs to
      const lineElementGlobalIndex = Math.min(
        Math.floor(i / pixelsPerLineElement),
        totalLineElements - 1 // Cap to prevent exceeding bounds
      );

      // Determine the position (t) of the particle along the current line element (0.0 to 1.0)
      let t = 0.5; // Default for single-pixel segments (pixelsPerLineElement = 1)
      if (pixelsPerLineElement > 1) {
        // t should represent progress along the *current segment* of pixels
        // assigned to this lineElementGlobalIndex.
        // The number of pixels actually assigned to the *current* lineElementGlobalIndex
        // could be more than pixelsPerLineElement if it's the last one and there's a remainder.

        // Let's find the start pixel index for the current line element
        const startPixelOfCurrentElement =
          lineElementGlobalIndex * pixelsPerLineElement;
        // And the end pixel index for the current line element
        let endPixelOfCurrentElement;
        if (lineElementGlobalIndex < totalLineElements - 1) {
          endPixelOfCurrentElement =
            (lineElementGlobalIndex + 1) * pixelsPerLineElement - 1;
        } else {
          // This is the last line element, it gets all remaining pixels
          endPixelOfCurrentElement = totalTexturePixels - 1;
        }
        const numPixelsInCurrentElement =
          endPixelOfCurrentElement - startPixelOfCurrentElement + 1;

        if (numPixelsInCurrentElement <= 1) {
          t = 0.5;
        } else {
          t =
            (i - startPixelOfCurrentElement) / (numPixelsInCurrentElement - 1);
        }
      }
      t = Math.min(Math.max(t, 0.0), 1.0); // Clamp t to [0,1]

      if (lineElementGlobalIndex < numMeridians) {
        // This pixel is for a MERIDIAN
        const meridianIndex = lineElementGlobalIndex;
        // Phi is constant for this meridian, ranging from 0 to almost 2*PI
        const phi = (meridianIndex / numMeridians) * 2 * Math.PI;
        // Theta varies along the meridian from North Pole (0) to South Pole (PI)
        const theta = t * Math.PI;

        x_coord = Math.sin(theta) * Math.cos(phi);
        y_coord = Math.cos(theta);
        z_coord = Math.sin(theta) * Math.sin(phi);
      } else {
        // This pixel is for a PARALLEL
        const parallelLineTrueIndex = lineElementGlobalIndex - numMeridians; // Index from 0 to numParallelLines-1

        // Theta is constant for this parallel.
        // parallelLineTrueIndex / numLatSegments maps index 0..numLatSegments to 0..1, then scale by PI
        const theta = (parallelLineTrueIndex / numLatSegments) * Math.PI;
        // Phi varies around the parallel from 0 to 2*PI
        const phi = t * 2 * Math.PI;

        x_coord = Math.sin(theta) * Math.cos(phi);
        y_coord = Math.cos(theta);
        z_coord = Math.sin(theta) * Math.sin(phi);
      }

      // Map sphere coordinates [-1, 1] to RGB [0, 255]
      const r = Math.floor(((x_coord + 1) / 2) * 255);
      const g = Math.floor(((y_coord + 1) / 2) * 255);
      const b = Math.floor(((z_coord + 1) / 2) * 255);

      // Set pixel data (RGBA) using the flattened pixel index i
      const pixelArrIndex = i * 4;
      data[pixelArrIndex] = r;
      data[pixelArrIndex + 1] = g;
      data[pixelArrIndex + 2] = b;
      data[pixelArrIndex + 3] = 255; // Alpha (fully opaque)
    }
    const texture = new THREE.DataTexture(
      data,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  static positionsSpherePixels(numMeridians: number, numParallels: number) {
    const TEXTURE_WIDTH = 256;
    const TEXTURE_HEIGHT = 256;
    const imageData = new ImageData(TEXTURE_WIDTH, TEXTURE_HEIGHT);
    const data = imageData.data;

    for (let py = 0; py < TEXTURE_HEIGHT; py++) {
      // Current texture row
      const v_tex = py / (TEXTURE_HEIGHT - 1); // Normalized V texture coordinate (0 to 1)

      // Determine the index of the nearest parallel line on the sphere grid
      // This results in an index from 0 (North Pole) to numParallels (South Pole)
      const theta_vertex_index = Math.round(v_tex * numParallels);
      const theta = (theta_vertex_index / numParallels) * Math.PI;

      for (let px = 0; px < TEXTURE_WIDTH; px++) {
        // Current texture column
        const u_tex = px / (TEXTURE_WIDTH - 1); // Normalized U texture coordinate (0 to 1)

        // Determine the index of the nearest meridian line on the sphere grid
        // This results in an index from 0 to numMeridians.
        // phi_vertex_index = 0 and phi_vertex_index = numMeridians
        // will correspond to phi=0 and phi=2*PI respectively (same spatial point).
        const phi_vertex_index = Math.round(u_tex * numMeridians);
        const phi = (phi_vertex_index / numMeridians) * 2 * Math.PI;

        // Calculate normalized (X,Y,Z) for the determined sphere grid vertex
        const x = Math.sin(theta) * Math.cos(phi);
        const y = Math.cos(theta);
        const z = Math.sin(theta) * Math.sin(phi);

        // Map sphere coordinates [-1, 1] to RGB [0, 255]
        const r = Math.floor(((x + 1) / 2) * 255);
        const g = Math.floor(((y + 1) / 2) * 255);
        const b = Math.floor(((z + 1) / 2) * 255);

        // Set pixel data (RGBA)
        const pixelArrIndex = (py * TEXTURE_WIDTH + px) * 4;
        data[pixelArrIndex] = r;
        data[pixelArrIndex + 1] = g;
        data[pixelArrIndex + 2] = b;
        data[pixelArrIndex + 3] = 255; // Alpha (fully opaque)
      }
    }

    const texture = new THREE.DataTexture(
      data,
      TEXTURE_WIDTH,
      TEXTURE_HEIGHT,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  static positionsCube(): THREE.DataTexture {
    const IMG_WIDTH = 256;
    const IMG_HEIGHT = 256;

    // 1. Define the Cube
    // Vertices of a cube from (-1,-1,-1) to (1,1,1)
    const vertices = [
      [-1, -1, -1], // 0
      [1, -1, -1], // 1
      [1, 1, -1], // 2
      [-1, 1, -1], // 3
      [-1, -1, 1], // 4
      [1, -1, 1], // 5
      [1, 1, 1], // 6
      [-1, 1, 1], // 7
    ];

    // Edges defined by pairs of vertex indices
    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0], // Bottom face
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4], // Top face
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7], // Vertical connecting edges
    ];

    // 2. Setup Canvas and ImageData
    const canvas = document.createElement("canvas");
    canvas.width = IMG_WIDTH;
    canvas.height = IMG_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get 2D context from canvas.");
    }
    const imageData = ctx.createImageData(IMG_WIDTH, IMG_HEIGHT);
    const data = imageData.data; // This is a Uint8ClampedArray

    const totalPixels = IMG_WIDTH * IMG_HEIGHT;
    const numEdges = edges.length;

    // Calculate how many pixels are nominally assigned per edge segment
    // This ensures all pixels are used.
    const pixelsPerSegment = Math.max(1, Math.floor(totalPixels / numEdges));

    // 3. Iterate through each pixel, assign it a particle on an edge
    for (let i = 0; i < totalPixels; i++) {
      // Determine which edge this pixel/particle belongs to
      const edgeSegmentIndex = Math.floor(i / pixelsPerSegment);

      // If totalPixels is not perfectly divisible by numEdges,
      // the last few edge segments might get fewer pixels or
      // some pixels might try to access an edge beyond the array.
      // So, we use modulo to wrap around the edges. This means
      // earlier edges might get slightly more "density" if there's a remainder.
      const currentEdgeArrIndex = edgeSegmentIndex % numEdges;
      const edge = edges[currentEdgeArrIndex];

      const v0 = vertices[edge[0]];
      const v1 = vertices[edge[1]];

      // Determine the position (t) of the particle along the current edge (0.0 to 1.0)
      // (i % pixelsPerSegment) gives the pixel's index within its allocated segment.
      let t = 0.5; // Default for single-pixel segments (pixelsPerSegment = 1)
      if (pixelsPerSegment > 1) {
        t = (i % pixelsPerSegment) / (pixelsPerSegment - 1);
      }

      // Linear interpolation (lerp) to find particle coordinates
      const particleX = v0[0] + t * (v1[0] - v0[0]);
      const particleY = v0[1] + t * (v1[1] - v0[1]);
      const particleZ = v0[2] + t * (v1[2] - v0[2]);

      // 4. Convert particle coordinates [-1, 1] to RGB [0, 255]
      const r = Math.floor(((particleX + 1) / 2) * 255);
      const g = Math.floor(((particleY + 1) / 2) * 255);
      const b = Math.floor(((particleZ + 1) / 2) * 255);

      // Set the pixel color in ImageData
      // Each pixel takes 4 array elements: R, G, B, A
      const pixelDataIndex = i * 4;
      data[pixelDataIndex] = r;
      data[pixelDataIndex + 1] = g;
      data[pixelDataIndex + 2] = b;
      data[pixelDataIndex + 3] = 255; // Alpha (fully opaque)
    }

    const texture = new THREE.DataTexture(
      data,
      IMG_WIDTH,
      IMG_HEIGHT,
      THREE.RGBAFormat
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    canvas.remove(); // Clean up the canvas element

    return texture;
  }

  static applyNoise(
    texture: THREE.Texture,
    threshold: number = 0.8,
    dim: number = 0.3
  ) {
    const noise = new SimplexNoise();
    const width = texture.image.width;
    const height = texture.image.height;
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx && width && height) {
      ctx.canvas.width = width;
      ctx.canvas.height = height;
      ctx.drawImage(texture.image, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const n = Math.abs(noise.noise(x / 128, y / 128));
          if (n < threshold) {
            data[idx] = data[idx] * dim;
            data[idx + 1] = data[idx + 1] * dim;
            data[idx + 2] = data[idx + 2] * dim;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      texture.image = ctx.canvas;
      texture.needsUpdate = true;
      ctx.canvas.remove();
    }
    return texture;
  }
}
