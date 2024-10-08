import fs from "fs";
import io, { type Server, type Socket } from "socket.io";
import { profanity } from "@2toad/profanity";

interface RoomList {
    private: string[];
}

/**
 * Class representing the ChatManager.
 */
export default class ChatManager {
    /**
     * The Socket.IO server instance.
     */
    public io: Server;

    /**
     * The list of private rooms.
     */
    public roomList: RoomList;

    /**
     * The list of connected clients.
     */
    public clients: Client[];

    /**
     * Creates a new ChatManager instance.
     * @param server - The server to attach the Socket.IO server to.
     */
    constructor(server: any) {
        this.io = new io.Server(server);

        this.io.on("connection", (socket: Socket) => {
            this.clients.push(new Client(socket, ""));
            this.io.emit("onlineCount", { count: this.clients.length });

            socket.on("room", ({ roomCode }: { roomCode: string }) => {
                roomCode = roomCode.substring(0, 7).toUpperCase();
                if (this.roomList.private.includes(roomCode)) {
                    this.setClientroom(socket.id, roomCode);
                    //
                } else {
                    socket.emit("invalid");
                }
            });

            socket.on("publicRoom", () => {
                this.setClientroom(socket.id, "PUBLICROOM");
            });

            socket.on("nickname", ({ nickname }: { nickname: string }) => {
                if (nickname === "") nickname = Date.now().toString();
                nickname = profanity.censor(nickname).substring(0, 24);
                this.setClientnickname(socket.id, nickname);
                this.sendJoinMessage(this.getClientFromID(socket.id)!);
            });

            socket.on("sendMessage", ({ text }: { text: string }) => {
                if (text === "") return;
                text = profanity.censor(text).substring(0, 1024);
                console.log(
                    `User: ${this.getClientFromID(socket.id)?.nickname} sent: \`${text}\` in room ${
                        this.getClientFromID(socket.id)?.room
                    }.`
                );
                this.clients.forEach((otherClient) => {
                    if (otherClient.socketID === socket.id) return;
                    if (otherClient.room === this.getClientFromID(socket.id)?.room) {
                        otherClient.socket.emit("message", {
                            nickname: this.getClientFromID(socket.id)?.nickname,
                            text: text,
                            room: this.getClientFromID(socket.id)?.room
                        });
                    }
                });
            });

            socket.on("disconnect", () => {
                if (this.getClientFromID(socket.id)?.room !== "") {
                    this.sendLeaveMessage(this.getClientFromID(socket.id)!);
                }
                this.removeClientFromID(socket.id);
                this.io.emit("onlineCount", { count: this.clients.length });
            });
        });

        this.roomList = JSON.parse(fs.readFileSync("./rooms.json", "utf8")) as RoomList;

        this.clients = [];
    }

    /**
     * Sends a message to all clients in the specified room indicating that a user joined.
     * @param client - The client that joined.
     */
    public sendJoinMessage(client: Client): void {
        console.log(`The user: ${client.nickname} joined the room: ${client.room}.`);
        this.clients.forEach((otherClient) => {
            if (otherClient.socketID === client.socketID) return;
            if (otherClient.room === client.room) {
                otherClient.socket.emit("message", {
                    type: "join",
                    text: `The user <b>${client.nickname}</b> joined the room.`,
                    room: client.room
                });
            }
        });
    }

    /**
     * Sends a message to all clients in the specified room indicating that a user left.
     * @param client - The client that left.
     */
    public sendLeaveMessage(client: Client): void {
        if (client.nickname === "") return;
        console.log(`The user: ${client.nickname} left the room: ${client.room}.`);
        this.io.emit("message", {
            type: "leave",
            text: `The user <b>${client.nickname}</b> left the room.`,
            room: client.room
        });
    }

    /**
     * Finds a client by their socket ID.
     * @param socketID - The socket ID to search for.
     * @returns The client with the specified socket ID, or undefined if not found.
     */
    private getClientFromID(socketID: string): Client | undefined {
        return this.clients.find((client) => client.socketID === socketID);
    }

    /**
     * Sets the room for a client.
     * @param socketID - The socket ID of the client to update.
     * @param room - The new room for the client.
     */
    private setClientroom(socketID: string, room: string): void {
        const client = this.getClientFromID(socketID);
        if (client) client.room = room;
    }

    /**
     * Sets the nickname for a client.
     * @param socketID - The socket ID of the client to update.
     * @param nickname - The new nickname for the client.
     */
    private setClientnickname(socketID: string, nickname: string): void {
        const client = this.getClientFromID(socketID);
        if (client) client.nickname = nickname;
    }

    /**
     * Removes a client from the list of clients.
     * @param socketID - The socket ID of the client to remove.
     */
    private removeClientFromID(socketID: string): void {
        this.clients = this.clients.filter((client) => client.socketID !== socketID);
    }
}

/**
 * Class representing a client.
 */
export class Client {
    /**
     * The client's Socket.IO socket.
     */
    public socket: Socket;

    /**
     * The client's current room.
     */
    public room: string;

    /**
     * The client's nickname.
     */
    public nickname: string;

    /**
     * The client's socket ID.
     */
    public socketID: string;

    /**
     * Constructor for the Client class.
     * @param socket - The Socket.IO socket for the client.
     * @param room - The room the client is currently in.
     */
    constructor(socket: Socket, room: string) {
        this.socket = socket;
        this.room = room;

        this.nickname = "";

        this.socketID = socket.id;
    }
}
