import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SERVER_URL } from "@/lib/const";
import React from "react";

interface Props {
  a?: null;
}
interface Task {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PAUSED";
  currentStep: number;
  inputForCurrentStep: string;
  history: {
    step: number;
    stepKey: string;
    output:
      | string
      | { overallScore: number; images?: { data: string; mimeType: string }[] };
    timestamp: string;
    input?: string;
  }[];
  createdAt: string;
  updatedAt: string;
  retryCount: number;
  outputFile?: string | null;
  score?: number | null;
  inputSeed?: string | null;
  inputSource?: string | null;
  inputSourceUrl?: string | null;
}

interface State {
  taskId: string;
  task: Task;
  prompt: string;
  sceneURLs: string[];
  currentScene: number;
}

class IdleScene extends React.Component<Props, State> {
  state = {
    taskId: "",
    task: {} as Task,
    prompt: "",
    sceneURLs: [],
    currentScene: 0,
  };

  intervalId: number | null = null;

  componentDidMount(): void {
    const params = new URLSearchParams(window.location.search);
    const taskIdFromUrl = params.get("taskId");
    if (taskIdFromUrl) {
      this.setState({ taskId: taskIdFromUrl });
      if (!this.intervalId) {
        this.intervalId = window.setInterval(() => {
          this.checkTaskStatus(this.state.taskId);
        }, 1000);
      }
    }
  }

  generate(prompt: string) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    fetch(SERVER_URL + "scene/task?prompt=" + encodeURIComponent(prompt))
      .then((response) => response.json())
      .then((data) => {
        const task = data.responseObject || {};
        document.location.href = "?taskId=" + task.taskID;
      });
  }

  processTask(task: Task): State {
    const files = [] as string[];
    task.history.forEach((step) => {
      if (step.stepKey === "write_to_file") {
        files.push(step.output as string);
      }
    });
    return {
      sceneURLs: files,
      currentScene: files.length > 0 ? files.length - 1 : 0,
    } as State;
  }

  checkTaskStatus = (taskId: string) => {
    fetch(SERVER_URL + "scene/taskstatus?taskID=" + taskId)
      .then((response) => response.json())
      .then((res) => {
        const data = res.responseObject || {};
        if (data.task && data.task.id === this.state.taskId) {
          this.setState(
            Object.assign({ task: data.task }, this.processTask(data.task))
          );
          if (
            data.task.status === "COMPLETED" ||
            data.task.status === "FAILED"
          ) {
            if (this.intervalId) {
              clearInterval(this.intervalId);
              this.intervalId = null;
            }
          }
        }
      });
  };

  renderSnapshot(task: Task) {
    const analysis =
      (task.history.filter((step) => step.stepKey === "analyze_screenshots") ||
        [])[this.state.currentScene] || {};
    const idea =
      task.history.filter((step) => step.stepKey === "idea")[0] || {};
    const description =
      task.history.filter((step) => step.stepKey === "description")[0] || {};

    const imageReference = task.history.filter(
      (step) => step.stepKey === "image_reference"
    )[0] || {
      output: {
        images: [] as {
          data: string;
          mimeType: string;
        }[],
      },
    };
    const currentStep = task.history.find(
      (step) => step.step === task.currentStep
    ) || { stepKey: "last" };

    const referenceImage = (
      imageReference.output as {
        images: { data: string; mimeType: string }[];
      }
    ).images[0];

    return (
      <div style={{ textAlign: "left", overflowY: "auto", height: "100%" }}>
        <p>
          Task ID:{" "}
          <a
            href={"http://localhost:8080/scene/taskstatus?taskID=" + task.id}
            target="_blank"
          >
            {task.id}
          </a>
        </p>
        <p>Status: {task.status}</p>
        <p>Current Step: {currentStep!.stepKey || task.currentStep}</p>
        <p>Retry Count: {task.retryCount}</p>
        <p>Created At: {new Date(task.createdAt).toLocaleString()}</p>
        <p>Updated At: {new Date(task.updatedAt).toLocaleString()}</p>
        {idea.input && (
          <p>
            <b>Prompt</b>: {idea.input || "-"}
          </p>
        )}
        {task.inputSource && (
          <p>
            <b>Source</b>:{" "}
            <a href={task.inputSourceUrl || "#"} target="_blank">
              {task.inputSource}
            </a>
          </p>
        )}
        {task.inputSeed && (
          <p>
            <b>Seeds</b>: {(task.inputSeed || "-").slice(0, 256)}
          </p>
        )}
        {idea.output && (
          <p>
            <b>Idea</b>: {(idea.output as string) || "-"}
          </p>
        )}
        <p title={(description.output as string) || ""}>
          <b>Description</b>:{" "}
          {((description.output as string) || "-").slice(0, 512)}...
        </p>
        {referenceImage && (
          <img src={`data:image/png;base64,${referenceImage.data}`} />
        )}
        {analysis.output && (
          <p>
            Score:{" "}
            <b>
              {(analysis.output as { overallScore: number }).overallScore ||
                "-"}
            </b>
          </p>
        )}
        <Button
          style={{ marginTop: "10px" }}
          onClick={() => {
            document.location.href = "/";
          }}
        >
          New Scene
        </Button>
      </div>
    );
  }

  render() {
    let sceneURL = "http://localhost:3000/";
    if (
      this.state.sceneURLs.length > 0 &&
      this.state.currentScene < this.state.sceneURLs.length
    ) {
      sceneURL += this.state.sceneURLs[this.state.currentScene];
    }
    return (
      <>
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100vh",
            padding: "10px",
          }}
        >
          {!this.state.taskId ? (
            <div style={{ flex: 1, padding: "10px" }}>
              IDLE 3D Scene Generator
              <Input
                type="text"
                placeholder="Enter a prompt..."
                value={this.state.prompt}
                style={{ width: "100%", marginBottom: "10px" }}
                onChange={(e) => this.setState({ prompt: e.target.value })}
              />
              <Button
                style={{ width: "100%" }}
                disabled={this.state.taskId ? true : false}
                onClick={() => {
                  this.generate(this.state.prompt);
                }}
              >
                Generate
              </Button>
            </div>
          ) : (
            <div style={{ flex: 1, padding: "10px" }}>
              {this.state.task && this.state.task.status
                ? this.renderSnapshot(this.state.task)
                : "Loading..."}
            </div>
          )}
          <div style={{ width: "1024px" }}>
            {this.state.sceneURLs.length > 0 && (
              <div>
                {this.state.sceneURLs.map((url, index) => {
                  return index !== this.state.currentScene ? (
                    <a
                      href={"javascript:void(0)"}
                      style={{ marginRight: "10px", marginLeft: "10px" }}
                      onClick={() => {
                        this.setState({ currentScene: index });
                      }}
                    >
                      {url}
                    </a>
                  ) : (
                    url
                  );
                })}
              </div>
            )}
            <iframe
              src={sceneURL}
              style={{
                width: "1024px",
                height: "768px",
                border: "1px solid black",
              }}
            />
          </div>
        </div>
      </>
    );
  }
}

export default IdleScene;
