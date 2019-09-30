import * as net from 'net';
import * as child_process from 'child_process';
import * as fs from 'fs';

export class LTServer {

  port: number | undefined;
  script: string | undefined;
  server: net.Server | undefined;
  subprocess: child_process.ChildProcess | undefined;
  isWindows: boolean;

  constructor(script?: string) {
    this.script = script;
    this.isWindows = process.platform === 'win32';
  }

  getPort(): number | undefined {
    return this.port;
  }

  getUrl(): string | undefined {
    if (this.isRunning() && this.port) {
      return "http://localhost:" + this.port.toString();
    } else {
      return undefined;
    }
  }

  getScriptPath(): string | undefined {
    return this.script;
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

  startServer(script?: string): void {
    console.log("Starting Managed Service.");
    if (script) {
      this.setScript(script);
    }
    let scriptPath: string = this.getScriptPath() as string;
    if (!this.isRunning()) {
      if (fs.existsSync(scriptPath)) {
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
          me.subprocess = child_process.spawn(scriptPath as string, ["--port", address.port.toString()], spawnOptions);
          setTimeout(function() {
            console.log("Pause over");
          }, 4000);
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
    console.log("Stopping Managed Service.");
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
