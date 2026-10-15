import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { io as connect, Socket } from "socket.io-client";
import { attachSocketServer, SocketServerHandle } from "@/sockets";
import { NotificationsPublisher } from "@/sockets/notifications.publisher";
import { signAccessToken, signRefreshToken } from "@/utils/tokens";

const ALEX = "11111111-0000-4000-8000-000000000001";
const BEN = "11111111-0000-4000-8000-000000000002";

interface Ack {
  success: boolean;
  message?: string;
  data?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  code?: string;
}

const until = async (condition: () => boolean, timeoutMs = 2000) => {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

/** Records every event a socket receives so tests can assert afterwards. */
class Client {
  readonly events: Array<{ name: string; payload: any }> = []; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor(readonly socket: Socket) {
    socket.onAny((name, payload) => this.events.push({ name, payload }));
  }

  of(name: string) {
    return this.events.filter((e) => e.name === name).map((e) => e.payload);
  }

  waitFor(name: string, count = 1) {
    return until(() => this.of(name).length >= count);
  }

  emit(name: string, payload?: unknown): Promise<Ack> {
    return new Promise((resolve) => this.socket.emit(name, payload, resolve));
  }
}

describe("/notifications socket namespace", () => {
  let http: HttpServer;
  let handle: SocketServerHandle;
  let publisher: NotificationsPublisher;
  let url: string;
  const clients: Client[] = [];

  beforeEach(async () => {
    publisher = new NotificationsPublisher();
    http = createServer();
    handle = attachSocketServer(http, { publisher });
    await new Promise<void>((resolve) => http.listen(0, resolve));
    url = `http://localhost:${(http.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    clients.splice(0).forEach((c) => c.socket.close());
    await handle.close();
  });

  const connectWith = async (options: {
    token?: string;
    query?: string;
  }): Promise<Client> => {
    const socket = connect(`${url}/notifications${options.query ?? ""}`, {
      auth: options.token ? { token: options.token } : undefined,
      transports: ["websocket"],
      reconnection: false,
    });
    const client = new Client(socket);
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", resolve);
      socket.once("connect_error", reject);
    });
    return client;
  };

  const connectAs = (userId: string) =>
    connectWith({ token: signAccessToken({ userId, role: "user" }) });

  describe("handshake", () => {
    it("accepts a valid access token", async () => {
      const client = await connectAs(ALEX);
      expect(client.socket.connected).toBe(true);
    });

    it("accepts the token as a ?token= query param", async () => {
      const token = signAccessToken({ userId: ALEX, role: "user" });
      const client = await connectWith({ query: `?token=${token}` });
      expect(client.socket.connected).toBe(true);
    });

    it("rejects a missing, invalid or refresh token", async () => {
      await expect(connectWith({})).rejects.toMatchObject({
        message: expect.stringMatching(/token/i),
      });
      await expect(connectWith({ token: "garbage" })).rejects.toBeDefined();
      await expect(
        connectWith({ token: signRefreshToken(ALEX) }),
      ).rejects.toBeDefined();
    });
  });

  describe("events", () => {
    it("answers ping through the ack", async () => {
      const client = await connectAs(ALEX);
      const ack = await client.emit("ping");

      expect(ack.success).toBe(true);
      expect(ack.data.at).toEqual(expect.any(String));
    });

    it("validates payloads", async () => {
      const client = await connectAs(ALEX);
      const ack = await client.emit("room:join", { room: "not valid!" });

      expect(ack).toMatchObject({ success: false, code: "ERR_3001" });
    });

    it("delivers failures as socket:error when no ack callback is sent", async () => {
      const client = await connectAs(ALEX);
      client.socket.emit("room:join", { room: "bad room" });

      await client.waitFor("socket:error");
      expect(client.of("socket:error")[0]).toMatchObject({
        success: false,
        code: "ERR_3001",
      });
    });

    it("throttles a flood of events", async () => {
      const client = await connectAs(ALEX);
      const acks: Ack[] = [];
      for (let i = 0; i < 25; i += 1) acks.push(await client.emit("ping"));

      expect(acks.some((a) => a.code === "ERR_6004")).toBe(true);
    });
  });

  describe("rooms", () => {
    it("broadcasts messages to members only", async () => {
      const alex = await connectAs(ALEX);
      const ben = await connectAs(BEN);

      await alex.emit("room:join", { room: "general" });
      await ben.emit("room:join", { room: "general" });
      const ack = await alex.emit("room:message", { room: "general", text: "hi" });

      expect(ack.success).toBe(true);
      await ben.waitFor("room:message");
      expect(ben.of("room:message")[0]).toMatchObject({
        room: "general",
        from: ALEX,
        text: "hi",
      });
    });

    it("forbids speaking in a room you have not joined", async () => {
      const alex = await connectAs(ALEX);
      const ack = await alex.emit("room:message", { room: "general", text: "hi" });

      expect(ack).toMatchObject({ success: false, code: "ERR_2001" });
    });
  });

  describe("publisher (REST -> socket)", () => {
    it("pushes to every device of one user and no one else", async () => {
      const alexPhone = await connectAs(ALEX);
      const alexLaptop = await connectAs(ALEX);
      const ben = await connectAs(BEN);
      // Make sure the server finished joining the private rooms.
      await Promise.all([alexPhone, alexLaptop, ben].map((c) => c.emit("ping")));

      publisher.toUser(ALEX, { type: "hello" });

      await alexPhone.waitFor("notification");
      await alexLaptop.waitFor("notification");
      expect(alexPhone.of("notification")[0]).toEqual({ type: "hello" });
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(ben.of("notification")).toHaveLength(0);
    });

    it("is a no-op before a socket server is attached", () => {
      expect(() =>
        new NotificationsPublisher().toUser(ALEX, { type: "x" }),
      ).not.toThrow();
    });
  });
});
