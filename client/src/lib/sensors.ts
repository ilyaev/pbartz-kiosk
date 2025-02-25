import { SERVER_URL, STREAM_SERVER_URL } from "./const";

export class ServerSensors {
  eventSource: EventSource = new EventSource(STREAM_SERVER_URL + "sensors");

  constructor(params: { callback: (data: number[]) => void }) {
    setTimeout(() => {
      this.eventSource!.onmessage = (event) => {
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

  close() {
    this.eventSource.close();
  }
}

export default ServerSensors;
