## ChatApp — React + Vite Client

### How to run locally

- **Prerequisites**:
  - **Backend**: Java 21, Maven 3.9+, MySQL running locally
  - **Frontend**: Node.js 20.15+ and npm

- **Start backend (in `api/`)**:
  - Install deps and run:
    ```bash
    mvn spring-boot:run 
    ```
  - Health check: `http://localhost:8080/api/health` → `{ "status": "ok" }`

- **Start frontend (in `client/`)**:
  - Install deps (if not already):
    ```bash
    npm install
    ```
  - Run dev server:
    ```bash
    npm run dev
    ```
  - Open the shown URL (typically `http://localhost:5173`).
  - The page shows "Backend health: ok" when the API is reachable.

- **Dev proxy**:
  - Requests to `/api` are proxied to `http://localhost:8080` via `vite.config.js`.

- **Access from other devices on the same network**:
  1. Find your computer's IP address:
     - **Windows**: Open Command Prompt and run `ipconfig`, look for "IPv4 Address" (e.g., `192.168.1.100`)
     - **Mac/Linux**: Open Terminal and run `ifconfig` or `ip addr`, look for your network interface IP
  2. Make sure both frontend and backend are running
  3. On other devices (phone, tablet, another computer), open a browser and go to:
     - `http://YOUR_IP_ADDRESS:5173` (e.g., `http://192.168.1.100:5173`)
  4. The app should work from any device on the same WiFi/LAN network
  5. **Note**: Make sure your firewall allows connections on ports 5173 (frontend) and 8080 (backend)

- **MySQL configuration**:
  - Update `api/src/main/resources/application.properties` with your local MySQL username/password and adjust the JDBC URL if needed.
