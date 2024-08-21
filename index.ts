import express, { Request, Response } from "express";
import http from "http";

import ChatManager from "./chatManager";

const app = express();
const server = http.createServer(app);

const chatManager = new ChatManager(server);

// Serves the index.html file when the root URL is accessed.
app.get("/", (req: Request, res: Response) => {
    res.sendFile(__dirname + "/index.html");
});

// Serves the client.js file when the /client.js URL is accessed.
app.get("/client.js", (req: Request, res: Response) => {
    res.sendFile(__dirname + "/client.js");
});

// Serves the styles.css file when the /styles.css URL is accessed.
app.get("/styles.css", (req: Request, res: Response) => {
    res.sendFile(__dirname + "/styles.css");
});

// Starts the server and prints a message to the console when the server is listening.
server.listen(3000, () => {
    // TODO: Only print the port for development
    console.log("Listening on port 3000");
});
