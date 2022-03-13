import {
  workspace as Workspace,
  window as Window,
  commands as Commands,
  languages as Languages,
  Position,
  Range,
  Disposable,
  DocumentSelector,
  QuickPickItem,
  TextEdit,
  window,
  TextLine,
} from 'coc.nvim';
import PHPFmt from './PHPFmt';
import Widget from './Widget';
import Transformations from './Transformations';
import ITransformationItem from './ITransformationItem';

export default class PHPFmtProvider {
  private phpfmt: PHPFmt;
  private widget: Widget;
  private documentSelector: DocumentSelector;

  public constructor(phpfmt: PHPFmt) {
    this.phpfmt = phpfmt;
    this.widget = this.phpfmt.getWidget();
    this.documentSelector = [
      { language: 'php', scheme: 'file' },
      { language: 'php', scheme: 'untitled' },
    ];
  }

  public onDidChangeConfiguration(): Disposable {
    return Workspace.onDidChangeConfiguration(() => {
      this.phpfmt.loadSettings();
    });
  }

  // public formatCommand(): Disposable {
  //   return Commands.registerCommand('phpfmt.format', async () => {
  //     const doc = await Workspace.document;
  //     if (doc.languageId === 'php') {
  //       // @ts-ignore
  //       if (!languages.hasFormatProvider(doc.textDocument)) {
  //         throw new Error(`Format provider not found for buffer: ${doc.bufnr}`);
  //       }
  //       this.tokenSource?.cancel();
  //       this.tokenSource = new CancellationTokenSource();
  //       const { token } = this.tokenSource;
  //       const options = await Workspace.getFormatOptions(doc.uri);
  //       // @ts-ignore
  //       const textEdits = languages.provideDocumentFormattingEdits(doc.textDocument, options, token);
  //       if (textEdits && textEdits.length > 0) {
  //         await doc.applyEdits(textEdits);
  //         return true;
  //       }
  //       return false;
  //       // Commands.executeCommand('editor.action.formatDocument');
  //     }
  //   });
  // }

  public listTransformationsCommand(): Disposable {
    return Commands.registerCommand('phpfmt.listTransformations', async () => {
      const transformations = new Transformations(this.phpfmt.getConfig().php_bin);

      const transformationItems: Array<ITransformationItem> = transformations.getTransformations();

      const items: Array<QuickPickItem> = new Array<QuickPickItem>();
      for (const item of transformationItems) {
        items.push({
          label: item.key,
          description: item.description,
        });
      }

      const idx = await Window.showQuickpick(
        items.map((value) => `${value.label} - ${value.description || 'no description'}`)
      );
      if (idx != -1) {
        const result = items[idx];
        const output = transformations.getExample({
          key: result.label,
          description: result.description || '',
        });
        this.widget.addToOutput(output).show();
      }
    });
  }

  //   .then((result) => {
  //   if (typeof result !== 'undefined') {
  //     const output = transformations.getExample({
  //       key: result.label,
  //       description: result.description || '',
  //     });
  //     this.widget.addToOutput(output).show();
  //   }
  // });
  // );

  public documentFormattingEditProvider(): Disposable {
    return Languages.registerDocumentFormatProvider(this.documentSelector, {
      provideDocumentFormattingEdits: async (document) => {
        const originalText: string = document.getText();
        console.log(originalText);
        window.showMessage(`${document.lineCount}`);
        let lastLine: TextLine;
        try {
          lastLine = document.lineAt(document.lineCount - 1);
        } catch (e) {
          lastLine = document.lineAt(document.lineCount - 2);
        }
        window.showMessage('coming here?');
        const range: Range = Range.create(Position.create(0, 0), lastLine.range.end);

        const newText = await this.phpfmt.format(originalText);
        if (newText !== originalText) {
          return [TextEdit.replace(range, newText)];
        }
        return [];
      },
    });
  }

  public documentRangeFormattingEditProvider(): Disposable {
    return Languages.registerDocumentRangeFormatProvider(this.documentSelector, {
      provideDocumentRangeFormattingEdits: (document, range) => {
        return new Promise<any>((resolve, reject) => {
          let originalText: string = document.getText(range);
          if (originalText.replace(/\s+/g, '').length === 0) {
            return reject();
          }

          let hasModified = false;
          if (originalText.search(/^\s*<\?php/i) === -1) {
            originalText = `<?php\n${originalText}`;
            hasModified = true;
          }

          this.phpfmt
            .format(originalText)
            .then((newText: string) => {
              if (hasModified) {
                newText = newText.replace(/^<\?php\r?\n/, '');
              }
              if (newText !== originalText) {
                // resolve([new TextEdit(range, text)]);
                resolve([{ range, newText }]);
              } else {
                reject();
              }
            })
            .catch((err) => {
              if (err instanceof Error) {
                Window.showErrorMessage(err.message);
                this.widget.addToOutput(err.message);
              }
              reject();
            });
        });
      },
    });
  }

  public statusBarItem(): Disposable[] {
    return [
      Window.onDidChangeActiveTextEditor((editor) => {
        if (typeof this.statusBarItem !== 'undefined') {
          this.widget.toggleStatusBarItem(editor);
        }
      }),
      Commands.registerCommand('phpfmt.openOutput', () => {
        this.widget.getOutputChannel().show();
      }),
    ];
  }
}
