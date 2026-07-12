import dgram from "node:dgram";
export type HermesWakeSignalSender = {
  send: (input: { packet: Buffer; address: string; port: number }) => Promise<{ bytes_sent: number }>;
};
export function createHermesUdpWakeSignalSender(timeoutMs = 2000): HermesWakeSignalSender {
  return {
    send: ({ packet, address, port }) => new Promise((resolve, reject) => {
      const socket = dgram.createSocket("udp4");
      let done = false;
      const timer = setTimeout(() => finish(new Error("wake_signal_timeout")), timeoutMs);
      const finish = (error?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        socket.close();
        if (error) reject(error); else resolve({ bytes_sent: packet.length });
      };
      socket.once("error", () => finish(new Error("wake_signal_failed")));
      socket.bind(0, () => {
        socket.setBroadcast(true);
        socket.send(packet, port, address, (error) => error ? finish(new Error("wake_signal_failed")) : finish());
      });
    }),
  };
}
