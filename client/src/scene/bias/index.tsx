import React from "react";
import Biases from "@/lib/biases";
import SceneFader from "@/components/fader";

interface Props {
  a?: null;
}

interface State {
  name: string;
  details: string;
  image: {
    url: string;
    alt: string | null;
  };
}

class BiasScene extends React.Component<Props, State> {
  state = {
    name: "",
    details: "",
    image: {
      url: "",
      alt: "",
    },
  };

  componentDidMount(): void {
    const bias = Biases[Math.floor(Math.random() * Biases.length)];
    this.setState({
      name: "What is " + bias.name + "?",
      details: bias.description,
      image: bias.image,
    });
  }

  render() {
    const content = (
      <>
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
            // marginBottom: "20px",
            fontSize: "2.6em",
            lineHeight: "1.4em",
          }}
        >
          {this.state.details}
        </div>
      </>
    );
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
            your cognitive bias is
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
          }}
        >
          {this.state.image.url ? (
            <SceneFader delay={21000}>
              {content}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "20px",
                }}
              >
                <img
                  src={this.state.image.url}
                  style={{
                    maxHeight: "70vh",
                    maxWidth: "90vw",
                    borderRadius: "10px",
                  }}
                />
              </div>
            </SceneFader>
          ) : (
            content
          )}
        </div>
      </>
    );
  }
}

export default BiasScene;
