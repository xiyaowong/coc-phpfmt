export default interface IPHPFmtConfig {
  php_bin: string;
  detect_indent: boolean;
  psr1: boolean;
  psr1_naming: boolean;
  psr2: boolean;
  indent_with_space: number | boolean;
  enable_auto_align: boolean;
  visibility_order: boolean;
  passes: Array<string>;
  exclude: Array<string>;
  smart_linebreak_after_curly: boolean;
  yoda: boolean;
  cakephp: boolean;
  custom_arguments: string;
}
