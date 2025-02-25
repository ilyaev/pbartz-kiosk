import React from "react";

interface StockProps {
  name: string;
  value: number;
  changePercent: number;
  changeValue: number;
  status: "UP" | "DO";
}

const Stock: React.FC<StockProps> = ({
  name,
  value,
  changePercent,
  changeValue,
  status,
}) => {
  return (
    <div
      style={{
        border: "1px solid black",
        borderRadius: "10px",
        margin: "5px",
        display: "flex",
        fontSize: "1.1em",
        backgroundColor: "white",
        width: "30%",
        maxWidth: "340px",
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          margin: "0px 5px 0px 10px",
          // border: "1px solid red",
        }}
      >
        <div
          style={{
            borderRadius: "10px",
            backgroundColor:
              status === "UP" ? "rgb(230, 244, 234)" : "rgb(252, 232, 230)",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {status === "UP" ? <ArrowUp /> : <ArrowDown />}
        </div>
      </div>
      <div
        style={{
          flex: 1,
          margin: "5px",
          textAlign: "left",
          width: "70px",
          textOverflow: "ellipsis",
          alignItems: "center",
          display: "flex",
          justifyContent: "center",
          flexDirection: "column",
          // border: "1px solid red",
        }}
      >
        <div
          style={{
            fontWeight: "bold",
            // whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {name.split("").slice(0, 15).join("")}
        </div>
        <div>{value.toLocaleString()}</div>
      </div>
      <div
        style={{
          margin: "10px",
          textAlign: "right",
          color: status === "UP" ? "green" : "rgb(165,14,14)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ fontWeight: "bold" }}>{changePercent}%</div>
        <div>{changeValue}</div>
      </div>
    </div>
  );
};

const ArrowUp = (): JSX.Element => (
  <svg
    focusable="false"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    style={{ fill: "rgb(19,115,51)" }}
  >
    <path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"></path>
  </svg>
);

const ArrowDown = (): JSX.Element => (
  <svg
    focusable="false"
    width="26"
    height="26"
    viewBox="0 0 24 24"
    style={{ fill: "rgb(165,14,14)" }}
  >
    <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z"></path>
  </svg>
);

export default Stock;
