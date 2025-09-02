# OrbitOps 🛰️

A simple and powerful 3D visualization of satellites orbiting the Earth in real-time.

![Screenshot or GIF of OrbitOps in action](path_to_your_image_or_gif)

---

## Features

- **Real-Time 3D Globe:** View hundreds of satellites orbiting a high-quality model of Earth.
- **Live Animation:** Satellite positions are updated continuously based on real TLE data.
- **Interactive Orbits:** Click on any satellite to instantly see its full orbital path projected in space.
- **Hover for Info:** Mouse over any satellite to get its name and NORAD ID.

---

## Tech Stack

- **Frontend:** React, Vite, react-globe.gl, satellite.js
- **Backend:** Node.js, Express, MongoDB, SQL,

---

## How to Run

Follow these steps to get the project running on your local machine.

### 1. Clone the Repository

```sh
git clone https://github.com/Debrato2005/OrbitOps

2. Navigate into the Project

cd OrbitOps

3. Start the Backend Services

You will need two separate terminals for the backend services.

In your first terminal:

# Navigate to the first backend folder
cd backend

# Install dependencies
npm install

# Start the server
npm run dev

In your second terminal:

# Navigate to the second backend folder
cd backend_satwik

# Install dependencies
npm install

# Start the server
npm run dev

4. Start the Frontend

In a third terminal:

# Navigate to the frontend folder
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev

5. View the Application

Open the provided localhost URL (usually http://localhost:5173/) in your browser to see the OrbitOps application live.
