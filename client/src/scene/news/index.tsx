import { Component } from "react";
import { connect } from "react-redux";
import { RootState } from "../../store";
import { KioskState } from "../../store/kioskSlice";
import Marquee from "react-fast-marquee";

interface Props {
  kiosk: KioskState;
}

class SpotifyScene extends Component<Props> {
  render() {
    return (
      <>
        <Marquee style={{ fontSize: "5em" }}>News of the World!</Marquee>
      </>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  kiosk: state.kiosk,
});

export default connect(mapStateToProps)(SpotifyScene);
