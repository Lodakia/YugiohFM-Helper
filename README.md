# YGOFM - Helper

YGOFM Helper is a cards and fusions database and a webapp based on vueJS for PSX game Yu-Gi-Oh! Forbidden Memory released in 1999.

This repository is intended **solely for localhost use**. It is designed to run on your own machine for personal use and testing and **is not intended to be exposed on the public internet or deployed as a shared online service**.

For reference, the original online deployment of this project is available at `https://ygofm.bark.tf/`, but this repository focuses on local, self-hosted usage only.


## Features

- Database and a browsing interface for all in game cards with their fusions
- Deck creation and management system
- Guardians star sheet with their symbols, strength and weakness
- An helper tool that mimics game board and displays the fusions that can be done during the player's turn with its cards

It's time to duel!

---

## Getting Started

This section explains how to run your own **local (localhost) instance** of YGOFM Helper.


### Prerequisites

Before doing anything make sure to have Node.js installed on your computer. For more information about Node.js visit the [official website](https://nodejs.org/en/).

Then update your node packet manager to the latest version using `npm install npm@latest -g`.


### Setup

By default, card visuals are not included as they are not compatible with the open source license. If you want to include them in your instance, you can [download them here](https://ygofm.bark.tf/cards.zip).

- Clone the repository locally on your computer or download and un-zip the last version of it on your computer.
  
- Open a terminal at the root of the project folder and install npm packages with the command `npm install`.

- (optional) If you have downloaded card visuals, extract the archive inside the `public` folder to include it in your project instance.


### Run (localhost)

- To run the project in development mode on localhost use the command:

  ```bash
  npm run dev
  ```

  This will start a local development server (typically on `http://localhost:5173` or a similar port, as indicated in the terminal output). Use this mode for day-to-day local usage.


### Build (for local static serving)

- To build the project for optimized local use:

  ```bash
  npm run build
  ```

- To test the build locally:

  ```bash
  npm run preview
  ```

The built files are output to the `dist` folder.

**Server-side deck persistence:** To keep decks (and game-assist state) saved on the server so they survive restarts and browser closes, run the included Node server instead of a plain static server:

```bash
npm run build
npm start
```

This starts a small server (default port 3000) that serves the app and stores userdata in a `data/userdata.json` file. The app will load and save decks from the server when available; if the server has no API (e.g. when using `npm run dev`), it falls back to cookie storage.

If you use a different static file server (no API), ensure that:

- The site is only reachable via `localhost` or `127.0.0.1`.
- You **do not** bind the server to public interfaces or expose it through port-forwarding, reverse proxies, or public hosting platforms.

If you customize any `siteUrl`-like value in `index.html` or related scripts, keep it pointed to a localhost URL (for example, `http://localhost:3000`) rather than a public domain.

### Running on Raspberry Pi (Local Network)

If you want to run this app on a Raspberry Pi for local network access (e.g., accessible from other devices on your home network), see [`RASPBERRY_PI_SETUP.md`](RASPBERRY_PI_SETUP.md) for detailed instructions.

---

## Contributing

Contributing is always welcome. 
If you want to help on this project by contributing to its development, by reporting bugs, errors or mistakes or simply by giving your feedback, use this repository's **Issues** section. Before posting or doing anything be sure to read `CONTRIBUTING.md`, which includes basic contribution guidelines.

---

## Credits

Nicolas C. (Eryux) - **Author**


This project also uses the following open source packages :

- [VueJS](https://github.com/vuejs)
- [Bootstrap](https://github.com/twbs/bootstrap)
- [jQuery](https://github.com/jquery/jquery)
- [FortAwesome](https://github.com/FortAwesome/Font-Awesome)
- [js-cookie](https://github.com/js-cookie/js-cookie)
- [SASS](https://github.com/sass/sass)
- [UUID](https://github.com/uuidjs/uuid)

---

## License

This project and application are distributed under LGPLv3 License. See LICENSE for more information.