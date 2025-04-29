import { SERVER_URL, STREAM_SERVER_URL } from "./const";

export class ServerSensors {
  eventSource: EventSource = new EventSource(STREAM_SERVER_URL + "sensors");

  constructor(params: { callback: (data: number[]) => void }) {
    setTimeout(() => {
      this.eventSource.onmessage = (event) => {
        const items = event.data
          .replace("data: ", "")
          .trim()
          .split(",")
          .map(parseFloat);
        params.callback(items);
      };

      this.eventSource!.onerror = () => {
        console.error("EventSource failed.");
        this.eventSource.close();
      };
    }, 300);
  }

  async setBacklight(value: number) {
    await fetch(SERVER_URL + "backlight/" + value);
  }

  async syncCaptureLevel(level: number) {
    const current = await (await fetch(SERVER_URL + "capture/0")).json();
    let value = -1
    try {
      value = parseInt(current.responseObject.result || '-1')
    } catch (e) {
      value = -1
    }

    let res = ''
    if (value > 0 && value !== level) {
      res = await (await fetch(SERVER_URL + "capture/" + Math.round(level))).json();
    }
    return JSON.stringify({res, current, value})
  }

  close() {
    this.eventSource.close();
  }
}

export default ServerSensors;
