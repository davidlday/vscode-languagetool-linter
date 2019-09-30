import * as net from 'net';
import * as child_process from 'child_process';
import * as fs from 'fs';

export class LTServer {

  port: number | undefined;
  running: boolean;
  script: string;
  server: net.Server | undefined;
  subprocess: child_process.ChildProcess | undefined;
  isWindows: boolean;

  constructor(script: string) {
    this.script = script;
    this.running = false;
    this.isWindows = process.platform === 'win32';
  }

  getUrl(): string | undefined {
    if (this.isRunning()) {
      return "http://localhost:" + this.port;
    } else {
      return undefined;
    }
  }

  isRunning(): boolean {
    if (this.server) {
      return this.server.listening;
    } else {
      return false;
    }
  }

  setScript(script: string) {
    this.script = script;
  }

  startServer(): void {
    if (!this.isRunning) {
      if (fs.existsSync(this.script)) {
        let me = this;
        let spawnOptions: any = { windowsHide: true };
        let newServer: net.Server = net.createServer(function (socket) {
          console.log("Creating server");
          socket.on('end', () => console.log("Disconnected"));
        }).on('error', (err) => {
          // handle errors here
          console.log("Error Creating Local Server: " + err);
          throw err;
        });
        // grab a random port.
        newServer.listen(function () {
          let address: net.AddressInfo = newServer.address() as net.AddressInfo;
          me.subprocess = child_process.spawn(me.script, ["--port", address.port.toString()], spawnOptions);
          me.server = newServer;
          me.port = address.port;
        });
      } else {
        console.log(this.script + " does not seem to be a valid file. Server not started.");
      }
    }
  }

  // Stop server if it's running
  stopServer() {
    if (this.subprocess) {
      if (this.server) {
        if (this.server.listening) {
          this.server.close();
          this.subprocess.kill();
          this.port = undefined;
        }
      }
    }
  }

}
