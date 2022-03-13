import { window as Window, OutputChannel, TextEditor, StatusBarItem } from 'coc.nvim';

export default class Widget {
  private outputChannel: OutputChannel;
  // private statusBarItem: StatusBarItem;
  private static instance: Widget;
  private statusBarItem: StatusBarItem;

  public static getInstance(): Widget {
    if (!this.instance) {
      this.instance = new Widget();
    }
    return this.instance;
  }

  public constructor() {
    this.outputChannel = Window.createOutputChannel('phpfmt');
    this.statusBarItem = Window.createStatusBarItem();
    this.statusBarItem.text = 'phpfmt';
    // TODO
    // this.statusBarItem.command = 'phpfmt.openOutput';
    this.toggleStatusBarItem(Window.activeTextEditor);
  }

  public toggleStatusBarItem(editor: TextEditor | undefined): void {
    if (typeof editor === 'undefined') {
      return;
    }
    if (editor.document.languageId === 'php') {
      this.statusBarItem.show();
    } else {
      this.statusBarItem.hide();
    }
  }

  public getOutputChannel(): OutputChannel {
    return this.outputChannel;
  }

  public addToOutput(message: string): OutputChannel {
    const title = new Date().toLocaleString();
    this.outputChannel.appendLine(title);
    this.outputChannel.appendLine('-'.repeat(title.length));
    this.outputChannel.appendLine(`${message}\n`);

    return this.outputChannel;
  }
}
