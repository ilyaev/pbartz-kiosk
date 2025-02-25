import { Component } from "react";
import "./picoftheday.css";

interface Props {
  imageUrl: string;
  description: string;
}

class HistoryPicOfTheDay extends Component<Props> {
  render() {
    const { imageUrl, description } = this.props;

    return (
      <div className="pic-of-the-day-container">
        <img
          src={imageUrl}
          alt="Pic of the Day"
          className="pic-of-the-day-image"
        />
        <p className="pic-of-the-day-description">{description}</p>
      </div>
    );
  }
}

export default HistoryPicOfTheDay;
