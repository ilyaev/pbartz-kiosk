import React, { Component } from "react";

interface Props {
  rows: number;
  columns: number;
  children: React.ReactNode;
}

class DashboardLayout extends Component<Props> {
  render() {
    const { rows, columns, children } = this.props;
    const gridTemplateRows = `repeat(${rows}, 1fr)`;
    const gridTemplateColumns = `repeat(${columns}, 1fr)`;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateRows,
          gridTemplateColumns,
          width: "100vw",
          height: "100vh",
        }}
      >
        {children}
      </div>
    );
  }
}

export default DashboardLayout;
