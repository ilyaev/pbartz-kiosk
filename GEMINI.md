# Gemini Project Overview: pbartz-kiosk

This document provides a comprehensive overview of the `pbartz-kiosk` project for the Gemini agent.

## 1. High-Level Overview

`pbartz-kiosk` is a Raspberry Pi Kiosk Dashboard application. It features a rich frontend with 3D visualizations and a backend that serves data and handles authentication with the Spotify API. The project is designed to run on a Raspberry Pi, suggesting a focus on performance and a specific hardware target.

## 2. Key Technologies

The project is a full-stack application with the following technology stack:

### Frontend (`client/`):

- **Framework:** React with Vite
- **Language:** TypeScript
- **State Management:** Redux Toolkit
- **3D Graphics:** Three.js
- **Styling:** Tailwind CSS

### Backend (`server/`):

- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** Better-SQLite3 (a `db.sqlite` file is present)
- **Authentication:** Passport with Spotify strategy
- **API Documentation:** Swagger UI Express

### Audio Processing (`server/python/`):

- **Language:** Python
- **Purpose:** The presence of `audio_processor.py` and `server_mic.py` suggests a component for handling audio input or processing, likely for visualizations or other interactive features.

## 3. Project Structure

The project is organized into two main directories:

- `client/`: Contains the React-based frontend application. This is a standard Vite project with components, scenes (likely for Three.js), and Redux store management. React components all are classes, not functions. Keep it that way
- `server/`: Contains the Node.js backend application. It includes API endpoints, database logic, and the Python audio processing component.

## 4. Getting Started

To get the project up and running, you will need to install dependencies and run the development servers for both the client and the server.

### Running the Frontend:

```bash
cd client
npm install
npm run dev
```

### Running the Backend:

The backend has multiple components. The `devall` script in `server/package.json` seems to run all of them concurrently.

```bash
cd server
npm install
npm run devall
```

This will start the Express server, the Python audio streaming server, and a file server.

## 5. Key Features

Based on the file structure and dependencies, the key features of the application appear to be:

- **Kiosk Dashboard:** A user interface designed for a kiosk environment.
- **3D Visualizations:** The use of Three.js suggests interactive and dynamic 3D graphics.
- **Spotify Integration:** The application can connect to Spotify to display information or control playback.
- **Audio Reactivity:** The Python audio component might be used to make the visualizations react to sound.
- **Modular Scenes:** The `client/src/scene` directory contains different "scenes" that can be displayed on the kiosk, such as news, weather, and financial information.

This overview should provide a good starting point for working on the `pbartz-kiosk` project.
