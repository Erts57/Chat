/**
 * ClientChatManager class handles the client-side chat functionality.
 */
class ClientChatManager {
    /**
     * Constructor for ClientChatManager.
     */
    constructor() {
        /**
         * @type {import("socket.io").Socket}
         * Socket connection object.
         */
        this.socket = null;
        /**
         * @type {string}
         * Current room.
         */
        this.room = "";
    }

    /**
     * Connects to the server and sets up event listeners.
     * @returns {Promise<void>} - Resolves when the connection is established.
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (typeof window === "undefined") {
                reject(new Error("`window` is undefined"));
                return;
            }

            let socket = io(window.location.origin);

            let connectionTimeout = setTimeout(() => {
                socket.close();
                reject(new Error("Connection timeout"));
            }, 10000);

            socket.on("connect", () => {
                clearTimeout(connectionTimeout);
                if (this.socket && this.socket.connected) {
                    this.socket.close();
                }
                this.socket = socket;
                this.registerEvents();
                resolve();
            });

            socket.on("connect_error", () => {
                clearTimeout(connectionTimeout);
                socket.close();
                reject(new Error("Connection error"));
            });
        });
    }

    /**
     * Sets up event listeners for socket events.
     */
    registerEvents() {
        this.socket.on("message", (messageArgs) => {
            if (messageArgs.room === this.room) {
                switch (messageArgs.type) {
                    case "join":
                        this.createJoinMessage("left");
                        break;

                    case "leave":
                        this.createLeaveMessage();
                        break;

                    default:
                        this.createMessage(messageArgs.text);
                        break;
                }
            }
        });

        this.socket.on("invalid", () => {
            this.room = "";
            roomLandingPageElement.classList.remove("hidden");
            roomElement.classList.add("hidden");
            roomTitleElement.innerHTML = "Room";
            console.log("Invalid room code. Please try again.");
            window.alert("Invalid room code. Please try again.");
        });
    }

    /**
     * Creates a chat message.
     * @param {string} message - The message text.
     * @param {"left" | "right"} side - The side of the message container.
     * @param {string[]} extraClasses - Additional CSS classes for the message.
     */
    createMessage(message, side = "left", extraClasses = []) {
        if (side !== "left" && side !== "right") {
            side = "left";
        }

        const messageContainerElement = document.createElement("div");
        const messageElement = document.createElement("div");

        messageContainerElement.classList.add("messageContainer");
        messageContainerElement.classList.add(side);

        messageElement.classList.add("message");
        extraClasses.forEach((extraClass) => {
            messageElement.classList.add(extraClass);
        });
        messageElement.innerHTML = message;

        messageContainerElement.appendChild(messageElement);
        document.getElementById("messages").appendChild(messageContainerElement);
    }

    /**
     * Creates a join message.
     * @param {"left" | "right"} side - The side of the message container.
     */
    createJoinMessage(side = "left") {
        this.createMessage("A user joined the room.", side, ["join"]);
    }

    /**
     * Creates a self-join message.
     */
    createSelfJoinMessage() {
        this.createMessage("You joined the room.", "right", ["join"]);
    }

    /**
     * Creates a leave message.
     */
    createLeaveMessage() {
        this.createMessage("A user left the room.", "left", ["leave"]);
    }
}

// Get DOM elements
const roomLandingPageElement = document.getElementById("roomLandingPage");
const roomConnectingPageElement = document.getElementById("roomConnectingPage");
const roomElement = document.getElementById("room");
const roomTitleElement = document.getElementById("roomTitle");

const joinRoomButtonElement = document.getElementById("joinRoomButton");
const joinPublicRoomButtonElement = document.getElementById("joinPublicRoomButton");

const messageInputElement = document.getElementById("messageInput");

// Create a new instance of ClientChatManager
const clientChatManager = new ClientChatManager();

/**
 * Joins a room or public room.
 * @param {string} roomCode - The room code.
 */
function joinRoomOrPublic(roomCode) {
    roomLandingPageElement.classList.add("hidden");
    roomConnectingPageElement.classList.remove("hidden");

    clientChatManager.connect().then(() => {
        if (roomCode === "") {
            clientChatManager.socket.emit("publicRoom");
            clientChatManager.room = "PUBLICROOM";
            roomTitleElement.innerHTML = "Public Room";
        } else {
            clientChatManager.socket.emit("room", { roomCode });
            clientChatManager.room = roomCode;
            roomTitleElement.innerHTML = roomCode;
        }

        setTimeout(() => {
            roomConnectingPageElement.classList.add("hidden");
            roomElement.classList.remove("hidden");
            clientChatManager.createSelfJoinMessage("right");
            messageInputElement.focus();
        }, 1000);
    });
}

// Add event listeners
joinPublicRoomButtonElement.addEventListener("click", () => joinRoomOrPublic(""));
joinRoomButtonElement.addEventListener("click", () =>
    joinRoomOrPublic(document.getElementById("roomCode").value.substring(0, 7))
);

messageInputElement.addEventListener("keyup", function (event) {
    if (event.key === "Enter") {
        clientChatManager.createMessage(messageInputElement.value, "right");
        clientChatManager.socket.emit("sendMessage", {
            text: messageInputElement.value,
            room: clientChatManager.room
        });
        messageInputElement.value = "";

        console.log("message sent");
    }
});
