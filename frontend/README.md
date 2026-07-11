# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

### WebRTC TURN (meetings)

Set `VITE_TURN_URLS`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` in frontend env for multi-network meetings. See `src/services/webrtcIce.js`.

### Testing from another device on your LAN

Camera and microphone are blocked by Chrome on `http://<LAN-IP>`; use trusted HTTPS instead. Create a certificate that includes your computer's LAN IP (for example with `mkcert`), configure the TLS paths in `frontend/.env` and `backend/.env` from their `.env.example` files, and trust the mkcert root certificate on every test device. Then open `https://<your-computer-LAN-IP>:5173`. The frontend automatically targets `https://<your-computer-LAN-IP>:5000` for the API and meeting signaling. If the device cannot connect, allow TCP ports 5173 and 5000 through the computer firewall.
