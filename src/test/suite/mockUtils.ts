import * as path from "path";
import { Disposable, ExtensionContext, Memento } from "vscode";

export class MockMemento implements Memento {
  private map: Map<string, unknown> = new Map<string, unknown>();

  get(key: string, defaultValue?: unknown): unknown {
    return this.map.has(key) ? this.map.get(key) : defaultValue;
  }

  update(key: string, value: unknown): Thenable<void> {
    return new Promise((resolve) => {
      this.map.set(key, value);
      resolve();
    });
  }
}

export class MockExtensionContext implements ExtensionContext, Disposable {
  readonly extensionPath: string = path.resolve(__dirname, "..", "..");

  public readonly subscriptions: { dispose(): unknown }[] = [];
  readonly workspaceState: Memento = new MockMemento();
  readonly globalState: Memento = new MockMemento();
  readonly storagePath: string | undefined;
  readonly globalStoragePath: string = path.resolve(
    __dirname,
    "globalStoragePath",
  );
  readonly logPath: string = path.resolve(__dirname, "logPath");

  asAbsolutePath(relativePath: string): string {
    return path.resolve(relativePath);
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }
}
