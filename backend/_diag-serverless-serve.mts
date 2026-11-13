import http from "node:http";
import handler from "./api/index.ts";
const server = http.createServer((req, res) => handler(req as any, res as any));
server.listen(4322, () => console.log("harness listening on 4322"));
setTimeout(() => process.exit(0), 120000);
