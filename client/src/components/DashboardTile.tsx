import React, { Component } from "react";

interface Props {
  children: React.ReactNode;
}

class DashboardTile extends Component<Props> {
  render() {
    return (
      <div
        style={{
          // border: "1px solid green",
          // backgroundColor: "black",
          display: "flex",
          padding: "0px",
          alignContent: "center",
          justifyContent: "center",
        }}
      >
        {this.props.children}
      </div>
    );
  }
}

export default DashboardTile;
