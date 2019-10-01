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
    // if (this.isRunning() && this.port) {
      let port = this.port ? this.port.toString() : '80';
      return "http://localhost:" + port;
    // } else {
    //   return undefined;
    // }
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

  startServer(script?: string): Promise<any> {
    console.log("Starting Managed Service.");
    if (script) {
      this.setScript(script);
    }
    let scriptPath: string = this.getScriptPath() as string;
    let me = this;

    return new Promise(function (resolve, reject) {
      // let spawnOptions: any = { windowsHide: true };
      // let newServer: net.Server = net.createServer(function (socket) {
      //   console.log("Creating server");
      //   socket.on('end', () => console.log("Disconnected"));
      // }).on('error', (err) => {
      //   // handle errors here
      //   console.log("Error Creating Local Server: " + err);
      //   throw err;
      // });
      // // grab a random port.
      // newServer.listen(function () {
      //   let address: net.AddressInfo = newServer.address() as net.AddressInfo;
      //   me.subprocess = child_process.spawn(scriptPath as string, ["--port", address.port.toString()], spawnOptions);
      //   me.server = newServer;
      //   me.port = address.port;
      // });
      let ltServerJar: string = '/usr/local/opt/languagetool/libexec/languagetool-server.jar';
      let spawnOptions: any = {
        windowsHide: true,
        // detached: true,
        stdio: ['igonore', 'pipe', 'pipe']
      };
      let javaCommand: string = process.platform === 'win32' ? 'javaw' : 'java';
      let newServer: net.Server = net.createServer(function (socket) {
        console.log("Creating server");
        socket.on('end', () => console.log("Disconnected"));
      }).on('error', (err) => {
        // handle errors here
        console.log("Error Creating Local Server: " + err);
        throw err;
      });
      let newSubprocess: child_process.ChildProcess;
      // grab a random port.
      newServer.listen(function () {
        let address: net.AddressInfo = newServer.address() as net.AddressInfo;
        console.log(javaCommand);
        newSubprocess = child_process.spawn(javaCommand, ["-cp", ltServerJar, "--port", address.port.toString()], spawnOptions);
        console.log("Started? " + newSubprocess.pid);
        newSubprocess.on('data', function (out) {
          me.subprocess = newSubprocess;
          console.log("Setting port: " + address.port);
          me.port = address.port;
          console.log("Port set: " + me.port);
          if (/Server started/.test(out)) {
            console.log(out);
            return resolve();
          }
        }).on('error', function (err) {
          console.log(err);
          resolve();
        });
      });
    });
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
