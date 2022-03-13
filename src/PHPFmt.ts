import { workspace, Uri } from 'coc.nvim';
import { spawn } from 'child_process';
import detectIndent from 'detect-indent';
import findUp from 'find-up';
import IPHPFmtConfig from './IPHPFmtConfig';
import Widget from './Widget';
import { pharPath } from './fmt';

class PHPFmt {
  private widget: Widget;
  private config: IPHPFmtConfig = {} as any;
  private args: Array<string> = [];

  public constructor() {
    this.loadSettings();
    this.widget = Widget.getInstance();
  }

  public loadSettings(): void {
    this.config = workspace.getConfiguration('phpfmt') as any;
    this.args.length = 0;

    if (this.config.custom_arguments !== '') {
      this.args.push(this.config.custom_arguments);
      return;
    }

    if (this.config.psr1) {
      this.args.push('--psr1');
    }

    if (this.config.psr1_naming) {
      this.args.push('--psr1-naming');
    }

    if (this.config.psr2) {
      this.args.push('--psr2');
    }

    if (!this.config.detect_indent) {
      const spaces: number | boolean = this.config.indent_with_space;
      if (spaces === true) {
        this.args.push('--indent_with_space');
      } else if (spaces > 0) {
        this.args.push(`--indent_with_space=${spaces}`);
      }
    }

    if (this.config.enable_auto_align) {
      this.args.push('--enable_auto_align');
    }

    if (this.config.visibility_order) {
      this.args.push('--visibility_order');
    }

    const passes: Array<string> = this.config.passes;
    if (passes.length > 0) {
      this.args.push(`--passes=${passes.join(',')}`);
    }

    const exclude: Array<string> = this.config.exclude;
    if (exclude.length > 0) {
      this.args.push(`--exclude=${exclude.join(',')}`);
    }

    if (this.config.smart_linebreak_after_curly) {
      this.args.push('--smart_linebreak_after_curly');
    }

    if (this.config.yoda) {
      this.args.push('--yoda');
    }

    if (this.config.cakephp) {
      this.args.push('--cakephp');
    }
  }

  public getWidget(): Widget {
    return this.widget;
  }

  public getConfig(): IPHPFmtConfig {
    return this.config;
  }

  public format(text: string, cwd?: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let iniPath: string | undefined;

      const workspaceFolders = workspace.workspaceFolders;
      if (workspaceFolders) {
        iniPath = findUp.sync('.phpfmt.ini', { cwd });
        const origIniPath = iniPath;

        for (const workspaceFolder of workspaceFolders) {
          if (origIniPath && origIniPath.startsWith(Uri.parse(workspaceFolder.uri).fsPath)) {
            break;
          } else {
            iniPath = undefined;
          }
        }
      }

      if (iniPath == undefined) {
        if (this.config.detect_indent) {
          const indentInfo = detectIndent(text);
          if (!indentInfo.type) {
            // fallback to default
            this.args.push('--indent_with_space');
          } else if (indentInfo.type === 'space') {
            this.args.push(`--indent_with_space=${indentInfo.amount}`);
          }
        } else {
          if (this.config.indent_with_space !== 4 && this.config.psr2) {
            return reject(new Error('phpfmt: For PSR2, code MUST use 4 spaces for indenting, not tabs.'));
          }
        }
      }

      const args = iniPath ? [pharPath, `--config=${iniPath}`, '-o=-', '-'] : [pharPath, ...this.args, '-o=-', '-'];
      const child = spawn(this.config.php_bin, args, { cwd });
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      child.stdout.on('close', () => {
        resolve(output);
      });
      child.stderr.on('data', (data) => {
        const err = data.toString();
        this.widget.addToOutput(err);
        reject(err);
      });
      child.on('err', () => reject('phpfmt: faild:('));
      child.stdin.write(text);
      child.stdin.end();
    });
  }
}

export default PHPFmt;
