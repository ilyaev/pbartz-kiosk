import { Component } from "react";

const GAMES = ["snake", "breakout"];

interface Props {
  a?: number;
}
interface State {
  game: string;
}
class GameScene extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      game: GAMES[Math.floor(Math.random() * GAMES.length)],
    };
  }

  render() {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
        }}
      >
        <iframe
          style={{ width: "100%", height: "100%" }}
          src={`http://localhost:3000/game/${this.state.game}`}
        ></iframe>
      </div>
    );
  }
}

export default GameScene;
