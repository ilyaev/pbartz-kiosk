import React from "react";
import Fallacies from "@/lib/fallacies";

interface Props {
  a?: null;
}

interface State {
  name: string;
  description: string;
  details: string;
  example: string;
}

class FallacyScene extends React.Component<Props, State> {
  state = {
    name: "",
    description: "",
    details: "",
    example: "",
  };

  componentDidMount(): void {
    const fallacy = Fallacies[Math.floor(Math.random() * Fallacies.length)];
    this.setState({
      name: fallacy.fallacy,
      description: fallacy.description.split("\n")[0],
      details: fallacy.description.split("\n").slice(1).join("\n"),
      example: fallacy.example,
    });
  }

  render() {
    return (
      <>
        <div
          style={{
            background: "url(/rocks.png) top no-repeat",
            backgroundSize: "auto 100%",
            width: "100vw",
            height: "116px",
            display: "flex",
            position: "absolute",
            textAlign: "center",
            alignItems: "center",
            justifyContent: "center",
            top: 0,
            zIndex: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              marginTop: "-20px",
              color: "#AAAAAA",
              fontSize: "3em",
              fontWeight: "bold",
            }}
          >
            {/* <img src="/your-logical-fallacy-is.png" />
             */}
            your logical fallacy is
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: "url(/sky.jpg) top no-repeat",
            backgroundSize: "auto 75%",
            width: "100vw",
            height: "100vh",
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            background: "url(/sunbeams.png) 50% no-repeat",
            backgroundSize: "auto 310%",
            width: "100vw",
            height: "100vh",
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "18%",
            width: "100vw",
            height: "82vh",
            zIndex: 4,
            textAlign: "center",
            paddingLeft: "10%",
            paddingRight: "10%",
            overflow: "hidden",
          }}
        >
          <h1
            style={{
              fontWeight: "bold",
              marginBottom: "20px",
            }}
          >
            {this.state.name}
          </h1>
          <div
            style={{
              marginBottom: "20px",
              fontWeight: "bold",
              fontSize: "1.8em",
            }}
          >
            {this.state.description}
          </div>
          <div
            style={{
              marginBottom: "20px",
              fontSize: "1.9em",
              lineHeight: "1.4em",
            }}
          >
            {this.state.details}
          </div>
          <div
            style={{
              marginBottom: "20px",
              fontSize: "1.7em",
              lineHeight: "1.4em",
              fontWeight: "bold",
            }}
          >
            Example: {this.state.example}
          </div>
        </div>
      </>
    );
  }
}

export default FallacyScene;
