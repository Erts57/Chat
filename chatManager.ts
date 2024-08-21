import fs from "fs";
import io, { type Server, type Socket } from "socket.io";

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

            socket.on("room", ({ roomCode }: { roomCode: string }) => {
                roomCode = roomCode.substring(0, 7).toUpperCase();
                if (this.roomList.private.includes(roomCode)) {
                    this.setClientroom(socket.id, roomCode);
                    this.sendJoinMessage(roomCode, this.getClientFromID(socket.id));
                } else {
                    socket.emit("invalid");
                }
            });

            socket.on("publicRoom", () => {
                this.setClientroom(socket.id, "PUBLICROOM");
                this.sendJoinMessage("PUBLICROOM", this.getClientFromID(socket.id));
            });

            socket.on("sendMessage", ({ text, room }: { text: string; room: string }) => {
                console.log(`Message sent: ${text} in room ${room}`);
                this.clients.forEach((client) => {
                    if (client.room === room && client.socketID !== socket.id) {
                        client.socket.emit("message", {
                            text: text,
                            room: room
                        });
                    }
                });
            });

            socket.on("disconnect", () => {
                if (this.getClientFromID(socket.id)?.room !== "") {
                    this.sendLeaveMessage(this.getClientFromID(socket.id)!.room);
                }
                this.removeClientFromID(socket.id);
            });
        });

        this.roomList = JSON.parse(fs.readFileSync("./rooms.json", "utf8")) as RoomList;

        this.clients = [];
    }

    /**
     * Sends a message to all clients in the specified room, except for the optional excluded client.
     * @param room - The room to send the message to.
     * @param exclude - The client to exclude from receiving the message.
     */
    public sendJoinMessage(room: string, exclude?: Client): void {
        console.log(`A user joined the room: ${room}.`);
        this.clients.forEach((client) => {
            if (client.room === room && client.socketID !== exclude?.socket.id) {
                client.socket.emit("message", {
                    type: "join",
                    text: "A user joined the room.",
                    room: room
                });
            }
        });
    }

    /**
     * Sends a message to all clients in the specified room indicating that a user left.
     * @param room - The room to send the message to.
     */
    public sendLeaveMessage(room: string): void {
        console.log(`A user left the room: ${room}.`);
        this.io.emit("message", {
            type: "leave",
            text: "A user left the room.",
            room: room
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

        this.socketID = socket.id;
    }
}
