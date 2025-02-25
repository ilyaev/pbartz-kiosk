import puppeteer from "puppeteer-core";
import fs from "fs";
import md5 from "md5";
import path from "path";

export default class PuppeteerHelper {
  static async getScreenshot(
    url: string,
    timeout: number = 60 * 60
  ): Promise<{ content: string; file: string } | null> {
    const fileName = md5(url) + ".png";
    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const screenshotPath = path.join(
      process.env.SCREENSHOT_BASE_URL || "",
      fileName
    );
    let browser = null;

    try {
      // Check if the screenshot already exists and is within the timeout period
      if (fs.existsSync(screenshotPath)) {
        const stats = fs.statSync(screenshotPath);
        const now = new Date().getTime();
        const fileAge = (now - stats.ctime.getTime()) / 1000; // in seconds

        if (fileAge < timeout) {
          const imageBuffer = fs.readFileSync(screenshotPath);
          return {
            content: imageBuffer.toString("base64"),
            file: screenshotPath,
          };
        }
      }

      // If the screenshot doesn't exist or is outdated, create a new one
      browser = await puppeteer.launch({ executablePath });
      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (error) {
      console.error("Error during screenshot:", error);
      return null;
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    if (fs.existsSync(screenshotPath)) {
      const imageBuffer = fs.readFileSync(screenshotPath);
      return {
        content: imageBuffer.toString("base64"),
        file: screenshotPath,
      };
    }

    return null;
  }
}
