OrbitOps 🛰️

A simple and powerful 3D visualization of satellites orbiting the Earth in real-time.

    [A stunning screenshot or GIF of the animated globe in action should go here!]

Features

    Real-Time 3D Globe: View hundreds of satellites orbiting a high-quality model of Earth.

    Live Animation: Satellite positions are updated continuously based on real TLE data.

    Interactive Orbits: Click on any satellite to instantly see its full orbital path projected in space.

    Hover for Info: Mouse over any satellite to get its name and NORAD ID.

Tech Stack

    Frontend: React, Vite, react-globe.gl, satellite.js

    Backend: Node.js, Express

How to Run

Follow these steps to get the project running on your local machine.
1. Clone the Repository

First, clone the project to your local system:
code Sh
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

    
git clone https://github.com/YOUR_USERNAME/OrbitOps.git

  

2. Navigate into the Project

Open the project in your terminal (or VS Code terminal):
code Sh
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

    
cd OrbitOps

  

3. Start the Backend Services

You will need two separate terminals for the backend services.

In your first terminal:
code Sh
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

    
# Navigate to the first backend folder
cd backend

# Install its dependencies
npm install

# Start the server
npm run dev```

**Open a SECOND terminal and run:**
```sh
# Navigate to the second backend folder
cd backend_satwik

# Install its dependencies
npm install

# Start the server
npm run dev

  

4. Start the Frontend

Finally, you will need a third terminal for the frontend.

Open a THIRD terminal and run:
code Sh
IGNORE_WHEN_COPYING_START
IGNORE_WHEN_COPYING_END

    
# Navigate to the frontend folder
cd frontend

# Install its dependencies
npm install

# Start the development server
npm run dev

  

5. View the Application

The last command will give you a localhost link, usually http://localhost:5173/. Open this link in your browser to see the OrbitOps application live.
