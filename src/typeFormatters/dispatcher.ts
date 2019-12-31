// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Source:
// https://github.com/DonJayamanne/pythonVSCode/blob/4e9f7389a847e6298e1fb3ea3e66bd27c61c3972/src/client/typeFormatters/dispatcher.ts

"use strict";

import { CancellationToken, FormattingOptions, OnTypeFormattingEditProvider,
  Position, ProviderResult, TextDocument, TextEdit } from "vscode";

export class OnTypeFormattingDispatcher implements OnTypeFormattingEditProvider {
  private readonly providers: Record<string, OnTypeFormattingEditProvider>;

  constructor(providers: Record<string, OnTypeFormattingEditProvider>) {
    this.providers = providers;
  }

  public provideOnTypeFormattingEdits(document: TextDocument, position: Position,
      ch: string, options: FormattingOptions, cancellationToken: CancellationToken,
    ): ProviderResult<TextEdit[]> {
    const provider = this.providers[ch];

    if (provider) {
      return provider.provideOnTypeFormattingEdits(
        document, position, ch, options, cancellationToken,
      );
    }

    return [];
  }

  public getTriggerCharacters(): { first: string; more: string[] } | undefined {
    const keys = Object.keys(this.providers);
    keys.sort(); // Make output deterministic

    const firstKey = keys.shift();

    if (firstKey) {
      return {
        first: firstKey,
        more: keys,
      };
    }

    return undefined;
  }
}
