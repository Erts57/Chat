import express, { Request, Response } from "express";
import http from "http";
import socketIO from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new socketIO.Server(server);

app.get("/", (req: Request, res: Response) => {
    res.sendFile(__dirname + "/index.html");
});

server.listen(3000, () => {
    console.log("Listening on port 3000");
});
