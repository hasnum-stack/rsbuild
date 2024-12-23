import type { StatsCompilation, StatsError } from '@rspack/core';

function resolveFileName(stats: StatsError) {
  // Get the real source file path with stats.moduleIdentifier.
  // e.g. moduleIdentifier is "builtin:react-refresh-loader!/Users/x/src/App.jsx"
  if (stats.moduleIdentifier) {
    const regex = /(?:\!|^)([^!]+)$/;
    const matched = stats.moduleIdentifier.match(regex);
    if (matched) {
      const fileName = matched.pop();
      if (fileName) {
        // add default column add lines for linking
        return `File: ${fileName}:1:1\n`;
      }
    }
  }

  // fallback to file or moduleName if moduleIdentifier parse failed
  const file = stats.file || stats.moduleName;
  return file ? `File: ${file}\n` : '';
}

function resolveModuleTrace(stats: StatsError) {
  let traceStr = '';
  if (stats.moduleTrace) {
    for (const trace of stats.moduleTrace) {
      if (trace.originName) {
        // TODO: missing moduleTrace.dependencies[].loc in rspack
        traceStr += `\n @ ${trace.originName}`;
      }
    }
  }

  return traceStr;
}

function hintUnknownFiles(message: string): string {
  const hint = 'You may need an appropriate loader to handle this file type.';

  if (message.indexOf(hint) === -1) {
    return message;
  }

  if (/File: .+\.s(c|a)ss/.test(message)) {
    return message.replace(
      hint,
      `To enable support for Sass, use "@rsbuild/plugin-sass".`,
    );
  }
  if (/File: .+\.less/.test(message)) {
    return message.replace(
      hint,
      `To enable support for Less, use "@rsbuild/plugin-less".`,
    );
  }
  if (/File: .+\.styl(us)?/.test(message)) {
    return message.replace(
      hint,
      `To enable support for Stylus, use "@rsbuild/plugin-stylus".`,
    );
  }

  return message;
}

// Cleans up Rspack error messages.
function formatMessage(stats: StatsError | string, verbose?: boolean) {
  let lines: string[] = [];
  let message: string;

  // Stats error object
  if (typeof stats === 'object') {
    const fileName = resolveFileName(stats);
    const mainMessage = stats.message;
    const details =
      verbose && stats.details ? `\nDetails: ${stats.details}\n` : '';
    const stack = verbose && stats.stack ? `\n${stats.stack}` : '';
    const moduleTrace = resolveModuleTrace(stats);

    message = `${fileName}${mainMessage}${details}${stack}${moduleTrace}`;
  } else {
    message = stats;
  }

  message = hintUnknownFiles(message);

  lines = message.split('\n');

  // Remove duplicated newlines
  lines = lines.filter(
    (line, index, arr) =>
      index === 0 ||
      line.trim() !== '' ||
      line.trim() !== arr[index - 1].trim(),
  );

  // Reassemble the message
  message = lines.join('\n');

  const innerError = '-- inner error --';
  if (!verbose && message.includes(innerError)) {
    message = message.split(innerError)[0];
  }

  return message.trim();
}

export function formatStatsMessages(
  stats: Pick<StatsCompilation, 'errors' | 'warnings'>,
  verbose?: boolean,
): {
  errors: string[];
  warnings: string[];
} {
  const formattedErrors =
    stats.errors?.map((error) => formatMessage(error, verbose)) || [];
  const formattedWarnings =
    stats.warnings?.map((warning) => formatMessage(warning, verbose)) || [];

  return {
    errors: formattedErrors,
    warnings: formattedWarnings,
  };
}
