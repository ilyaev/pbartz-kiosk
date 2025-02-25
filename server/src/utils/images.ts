import sharp from "sharp";

export interface Rectangle {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

class ImageProcessor {
  private imagePath: string;

  constructor(imagePath: string) {
    this.imagePath = imagePath;
  }

  async extractSubImages(rectangles: Rectangle[]): Promise<Buffer[]> {
    const image = sharp(this.imagePath);
    const metadata = await image.metadata();
    const subImages: Buffer[] = [];

    for (const rect of rectangles) {
      const width = rect.right - rect.left;
      const height = rect.bottom - rect.top;

      if (width <= 0 || height <= 0) {
        throw new Error("Invalid rectangle dimensions");
      }

      console.log({
        left: rect.left,
        top: rect.top,
        width: width,
        height: height,
      });

      const subImage = await image
        .extract({
          left: rect.left,
          top: rect.top,
          width: width,
          height: height,
        })
        .toBuffer();

      console.log(subImage);

      subImages.push(subImage);
    }
    const baseName = this.imagePath.replace(/\.[^/.]+$/, "");

    for (let i = 0; i < subImages.length; i++) {
      const subImagePath = `${baseName}_subImage_${i + 1}.png`;
      await sharp(subImages[i]).toFile(subImagePath);
    }
    return subImages;
  }
}

export default ImageProcessor;
