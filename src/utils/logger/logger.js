// const winston = require('winston');
// const path = require('path');
// const chalk = require('chalk');
//
// const DEFAULT_LOG_LEVEL = 'debug';
// const TIME_ZONE = 'Europe/Warsaw';
// const DATE_FORMAT = 'en-GB';
//
// // Wymuszenie kolorów
// chalk.level = 3;
//
// const formatDateInTimeZone = (date, timeZone) => {
//     const options = {
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         fractionalSecondDigits: 3,
//         timeZone: timeZone,
//         hour12: false
//     };
//     return new Intl.DateTimeFormat(DATE_FORMAT, options).format(date);
// };
//
// const logFormat = winston.format.combine(
//     winston.format.timestamp({
//         format: () => formatDateInTimeZone(new Date(), TIME_ZONE)
//     }),
//     winston.format.errors({stack: true}),
//     winston.format.splat(),
//     winston.format.json()
// );
//
// const getLogFilePath = (filename) => path.join(__dirname, '..', '..', 'logs', filename);
//
// const fileTransport = (filename, level = 'debug') => new winston.transports.File({
//     filename: getLogFilePath(filename),
//     level,
//     format: logFormat
// });
//
// // Helper do spójnego formatowania wartości
// const formatValue = (value) => {
//     if (value === undefined) return 'undefined';
//     if (value === null) return 'null';
//     if (typeof value === 'object') {
//         try {
//             return JSON.stringify(value, null, 2);
//         } catch (error) {
//             return value.toString();
//         }
//     }
//     return value.toString();
// };
//
// // Helper do łączenia wiadomości i argumentów
// const combineMessageAndArgs = (message, args) => {
//     if (args.length === 0) return formatValue(message);
//
//     const formattedMessage = formatValue(message);
//     const formattedArgs = args.map(formatValue).join(' ');
//
//     return `${formattedMessage} ${formattedArgs}`;
// };
//
// const consoleFormat = winston.format.printf(({level, message, timestamp, label, filename, splat = []}) => {
//     const colorizedLevel =
//         level === 'info' ? chalk.green(level) :
//             level === 'warn' ? chalk.yellow(level) :
//                 level === 'error' ? chalk.red(level) :
//                     level === 'debug' ? chalk.blue(level) :
//                         level === 'http' ? chalk.cyan(level) :
//                             level === 'verbose' ? chalk.magenta(level) :
//                                 level === 'silly' ? chalk.grey(level) :
//                                     chalk.white(level);
//
//     const colorizedTimestamp = chalk.gray(timestamp);
//     const colorizedLabel = chalk.hex('#FFA500')(label);
//     const colorizedFilename = chalk.hex('#00CED1')(filename);
//
//     return `${colorizedTimestamp} [${colorizedLevel}] [${colorizedLabel}] [${colorizedFilename}]: ${message}`;
// });
//
// const consoleTransport = new winston.transports.Console({
//     format: winston.format.combine(
//         winston.format.colorize(),
//         consoleFormat
//     )
// });
//
// const logger = winston.createLogger({
//     level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
//     format: logFormat,
//     transports: [
//         fileTransport('combined.log'),
//         fileTransport('error.log', 'error'),
//         consoleTransport
//     ]
// });
//
// function createLogger(filePath) {
//     const projectRoot = path.resolve(__dirname, '..', '..');
//     const relativePath = path.relative(projectRoot, filePath);
//     const folderStructure = path.dirname(relativePath).replace(/\\/g, '/');
//     const filename = path.basename(filePath);
//
//     const childLogger = logger.child({
//         label: folderStructure,
//         filename: filename
//     });
//
//     const wrapperLogger = {};
//     ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].forEach(level => {
//         wrapperLogger[level] = (message, ...args) => {
//             const formattedMessage = combineMessageAndArgs(message, args);
//             childLogger[level](formattedMessage);
//         };
//     });
//
//     return wrapperLogger;
// }
//
// module.exports = {createLogger};


// const winston = require('winston');
// const path = require('path');
// const chalk = require('chalk');
// const terminalLink = require('terminal-link');
// const { pathToFileURL } = require('url');
//
// const DEFAULT_LOG_LEVEL = 'debug';
// const TIME_ZONE = 'Europe/Warsaw';
// const DATE_FORMAT = 'en-GB';
//
// chalk.level = 3;
//
// // Uproszczona detekcja - tylko na podstawie TERMINAL_EMULATOR
// const isWebStorm = () => {
//     return process.env.TERMINAL_EMULATOR === 'JetBrains-JediTerm';
// };
//
// const getCallerInfo = () => {
//     const error = {};
//     Error.captureStackTrace(error);
//     const callerLine = error.stack.split('\n')[3];
//     const match = callerLine.match(/\((.*):(\d+):(\d+)\)$/);
//     if (match) {
//         const [, filePath, line, column] = match;
//         return {
//             filePath,
//             line,
//             column,
//             webstormFormat: `${filePath}:${line}:${column}`,
//             fullPath: `${filePath}:${line}:${column}`
//         };
//     }
//     return null;
// };
//
// const formatDateInTimeZone = (date, timeZone) => {
//     const options = {
//         year: 'numeric',
//         month: '2-digit',
//         day: '2-digit',
//         hour: '2-digit',
//         minute: '2-digit',
//         second: '2-digit',
//         fractionalSecondDigits: 3,
//         timeZone: timeZone,
//         hour12: false
//     };
//     return new Intl.DateTimeFormat(DATE_FORMAT, options).format(date);
// };
//
// const logFormat = winston.format.combine(
//     winston.format.timestamp({
//         format: () => formatDateInTimeZone(new Date(), TIME_ZONE)
//     }),
//     winston.format.errors({ stack: true }),
//     winston.format.splat(),
//     winston.format.json()
// );
//
// const getLogFilePath = filename => path.join(__dirname, '..', '..', 'logs', filename);
//
// const fileTransport = (filename, level = 'debug') => new winston.transports.File({
//     filename: getLogFilePath(filename),
//     level,
//     format: logFormat
// });
//
// const formatValue = value => {
//     if (value === undefined) return 'undefined';
//     if (value === null) return 'null';
//     if (typeof value === 'object') {
//         try {
//             return JSON.stringify(value, null, 2);
//         } catch (error) {
//             return value.toString();
//         }
//     }
//     return value.toString();
// };
//
// const combineMessageAndArgs = (message, args) => {
//     if (args.length === 0) return formatValue(message);
//     const formattedMessage = formatValue(message);
//     const formattedArgs = args.map(formatValue).join(' ');
//     return `${formattedMessage} ${formattedArgs}`;
// };
//
// const consoleFormat = winston.format.printf(({ level, message, timestamp, label, filename, lineInfo }) => {
//     const colorizedLevel =
//         level === 'info' ? chalk.green(level) :
//             level === 'warn' ? chalk.yellow(level) :
//                 level === 'error' ? chalk.red(level) :
//                     level === 'debug' ? chalk.blue(level) :
//                         level === 'http' ? chalk.cyan(level) :
//                             level === 'verbose' ? chalk.magenta(level) :
//                                 level === 'silly' ? chalk.grey(level) :
//                                     chalk.white(level);
//
//     const colorizedTimestamp = chalk.gray(timestamp);
//     const colorizedLabel = chalk.hex('#FFA500')(label);
//
//     // W WebStorm używamy "at" format
//     if (isWebStorm()) {
//         const atLine = lineInfo ? `at ${lineInfo.webstormFormat}\n` : '';
//         const colorizedFilename = chalk.hex('#00CED1')(`[${filename}]`);
//         return `${atLine}${colorizedTimestamp} [${colorizedLevel}] [${colorizedLabel}] ${colorizedFilename}: ${message}`;
//     }
//     // W innych terminalach próbujemy użyć terminal-link
//     else {
//         const colorizedFilename = lineInfo
//             ? terminalLink(
//                 `[${filename}]`,
//                 `file://${lineInfo.filePath}`,
//                 { fallback: false }
//             )
//             : `[${filename}]`;
//         return `${colorizedTimestamp} [${colorizedLevel}] [${colorizedLabel}] ${chalk.hex('#00CED1')(colorizedFilename)}: ${message}`;
//     }
// });
//
// const consoleTransport = new winston.transports.Console({
//     format: winston.format.combine(
//         winston.format.colorize(),
//         consoleFormat
//     )
// });
//
// const logger = winston.createLogger({
//     level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
//     format: logFormat,
//     transports: [
//         fileTransport('combined.log'),
//         fileTransport('error.log', 'error'),
//         consoleTransport
//     ]
// });
//
// function createLogger(filePath) {
//     const projectRoot = path.resolve(__dirname, '..', '..');
//     const relativePath = path.relative(projectRoot, filePath);
//     const folderStructure = path.dirname(relativePath).replace(/\\/g, '/');
//     const filename = path.basename(filePath);
//
//     const childLogger = logger.child({
//         label: folderStructure,
//         filename: filename
//     });
//
//     const wrapperLogger = {};
//     ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].forEach(level => {
//         wrapperLogger[level] = (message, ...args) => {
//             const formattedMessage = combineMessageAndArgs(message, args);
//             const callerInfo = getCallerInfo();
//             childLogger[level](formattedMessage, { lineInfo: callerInfo });
//         };
//     });
//
//     return wrapperLogger;
// }
//
// module.exports = { createLogger };

const winston = require('winston');
const path = require('path');
const chalk = require('chalk');
const util = require('util');

const DEFAULT_LOG_LEVEL = 'debug';
const TIME_ZONE = 'Europe/Warsaw';
const DATE_FORMAT = 'en-GB';

// Wymuszenie kolorów
chalk.level = 3;

// Stałe do formatowania
const INDENT_SIZE = 2;
const MAX_TABLE_CELL_LENGTH = 40;

// Symbole do rysowania
const SYMBOLS = {
    group: {
        start: '├─┬',
        middle: '│ │',
        end: '└─┴',
        leaf: '├──',
        lastLeaf: '└──'
    },
    progress: {
        start: '▮',    // Pełny blok
        middle: '▯',    // Pusty blok
        spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    },
    status: {
        success: '✔',
        error: '✖',
        warning: '⚠',
        info: 'ℹ',
        debug: '🔍',
        pending: '⋯'
    },
    box: {
        topLeft: '╭',
        topRight: '╮',
        bottomLeft: '╰',
        bottomRight: '╯',
        vertical: '│',
        horizontal: '─'
    }
};

class TimerRegistry {
    constructor() {
        this.timers = new Map();
    }

    start(label) {
        this.timers.set(label, process.hrtime.bigint());
    }

    end(label) {
        const start = this.timers.get(label);
        if (!start) return null;

        const end = process.hrtime.bigint();
        const durationNs = end - start;
        this.timers.delete(label);

        // Konwertuj na odpowiednie jednostki
        if (durationNs < 1000n) return `${durationNs}ns`;
        if (durationNs < 1000000n) return `${durationNs / 1000n}µs`;
        if (durationNs < 1000000000n) return `${durationNs / 1000000n}ms`;
        return `${durationNs / 1000000000n}s`;
    }
}

class LogGroup {
    constructor() {
        this.level = 0;
        this.groups = new Map(); // Mapa group_id -> { level, isLast }
        this.lastGroupAtLevel = new Map(); // Poziom -> ostatnie group_id
    }

    startGroup(id, label) {
        const level = this.level++;
        const isLast = !this.lastGroupAtLevel.has(level);
        this.groups.set(id, { level, isLast, label });
        this.lastGroupAtLevel.set(level, id);
        return level;
    }

    endGroup(id) {
        const group = this.groups.get(id);
        if (group) {
            this.level = Math.max(0, group.level);
            this.groups.delete(id);
            this.lastGroupAtLevel.delete(group.level);
        }
        return this.level;
    }

    getGroupPrefix(id) {
        const group = this.groups.get(id);
        if (!group) return '';

        const lines = [];
        for (let i = 0; i < group.level; i++) {
            const groupAtLevel = Array.from(this.groups.values())
                .find(g => g.level === i);
            lines.push(groupAtLevel && !groupAtLevel.isLast ?
                SYMBOLS.group.middle : '   ');
        }

        const prefix = group.isLast ?
            SYMBOLS.group.lastLeaf :
            SYMBOLS.group.leaf;

        return lines.join('') + prefix;
    }

    getIndentation() {
        return '  '.repeat(this.level);
    }
}

// Rozszerzony helper do formatowania wartości
const formatValue = (value, indent = 0) => {
    if (value === undefined) return chalk.gray('undefined');
    if (value === null) return chalk.gray('null');

    if (value instanceof Error) {
        return chalk.red(`${value.stack || value.message}`);
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const spaces = ' '.repeat(indent + INDENT_SIZE);
        const items = value.map(item => `${spaces}${formatValue(item, indent + INDENT_SIZE)}`);
        return `[\n${items.join(',\n')}\n${' '.repeat(indent)}]`;
    }

    if (typeof value === 'object') {
        try {
            return util.inspect(value, {
                colors: true,
                depth: null,
                maxArrayLength: null,
                breakLength: 80,
                indent: INDENT_SIZE
            });
        } catch (error) {
            return value.toString();
        }
    }

    if (typeof value === 'string') return value;
    return value.toString();
};

// Helper do formatowania tabeli
const formatTable = (data, columns) => {
    if (!Array.isArray(data) || data.length === 0) return '';

    // Przygotuj nagłówki i określ szerokości kolumn
    const headers = columns || Object.keys(data[0]);
    const widths = headers.map(header =>
        Math.min(
            MAX_TABLE_CELL_LENGTH,
            Math.max(
                header.length,
                ...data.map(row => String(row[header] || '').length)
            )
        )
    );

    // Formatuj nagłówek
    const headerRow = headers.map((header, i) =>
        chalk.cyan(header.padEnd(widths[i]))
    ).join(' │ ');

    // Linia separatora
    const separator = widths.map(w => '─'.repeat(w)).join('─┼─');

    // Formatuj wiersze
    const rows = data.map(row =>
        headers.map((header, i) => {
            const cell = String(row[header] || '');
            return cell.length > MAX_TABLE_CELL_LENGTH
                ? cell.slice(0, MAX_TABLE_CELL_LENGTH - 3) + '...'
                : cell.padEnd(widths[i]);
        }).join(' │ ')
    );

    return `\n┌─${separator}─┐\n│ ${headerRow} │\n├─${separator}─┤\n${
        rows.map(row => `│ ${row} │`).join('\n')
    }\n└─${separator}─┘\n`;
};

const formatDateInTimeZone = (date, timeZone) => {
    const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
        timeZone: timeZone,
        hour12: false
    };
    return new Intl.DateTimeFormat(DATE_FORMAT, options).format(date);
};

// Funkcja do rysowania boxów
const drawBox = (content, title = '') => {
    const lines = content.split('\n');
    const width = Math.max(...lines.map(line => line.length));
    const horizontalLine = SYMBOLS.box.horizontal.repeat(width + 2);

    let result = '';
    if (title) {
        result += chalk.cyan(`${SYMBOLS.box.topLeft}${SYMBOLS.box.horizontal} ${title} ${horizontalLine}\n`);
    } else {
        result += chalk.cyan(`${SYMBOLS.box.topLeft}${horizontalLine}${SYMBOLS.box.topRight}\n`);
    }

    lines.forEach(line => {
        result += chalk.cyan(SYMBOLS.box.vertical) + ' ' +
            line.padEnd(width) + ' ' +
            chalk.cyan(SYMBOLS.box.vertical) + '\n';
    });

    result += chalk.cyan(`${SYMBOLS.box.bottomLeft}${horizontalLine}${SYMBOLS.box.bottomRight}`);
    return result;
};

// Funkcja do rysowania paska postępu
const drawProgressBar = (current, total, options = {}) => {
    const {
        width = 30,
        showPercentage = true,
        showFraction = true,
        colored = true
    } = options;

    const percentage = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    let bar = '';
    if (colored) {
        const color = percentage < 30 ? 'red' :
            percentage < 70 ? 'yellow' :
                'green';
        bar = chalk[color](SYMBOLS.progress.start.repeat(filled)) +
            chalk.gray(SYMBOLS.progress.middle.repeat(empty));
    } else {
        bar = SYMBOLS.progress.start.repeat(filled) +
            SYMBOLS.progress.middle.repeat(empty);
    }

    let text = `[${bar}]`;
    if (showPercentage) {
        text += ` ${percentage}%`;
    }
    if (showFraction) {
        text += ` (${current}/${total})`;
    }

    return text;
};

const combineMessageAndArgs = (message, args, groupManager) => {
    const indent = groupManager ? groupManager.getIndentation() : '';

    if (args.length === 0) return indent + formatValue(message);

    const formattedMessage = formatValue(message);
    const formattedArgs = args.map(arg => formatValue(arg)).join(' ');

    return `${indent}${formattedMessage} ${formattedArgs}`;
};

const logFormat = winston.format.combine(
    winston.format.timestamp({
        format: () => formatDateInTimeZone(new Date(), TIME_ZONE)
    }),
    winston.format.errors({stack: true}),
    winston.format.splat(),
    winston.format.json()
);

const getLogFilePath = (filename) => path.join(__dirname, '..', '..', 'logs', filename);

const fileTransport = (filename, level = 'debug') => new winston.transports.File({
    filename: getLogFilePath(filename),
    level,
    format: logFormat
});

const consoleFormat = winston.format.printf(({
                                                 level, message, timestamp, label, filename, group, groupLevel, lastTimestamp, timeDiff, splat = []
                                             }) => {
    const colorizedLevel =
        level === 'info' ? chalk.green(level) :
            level === 'warn' ? chalk.yellow(level) :
                level === 'error' ? chalk.red(level) :
                    level === 'debug' ? chalk.blue(level) :
                        level === 'http' ? chalk.cyan(level) :
                            level === 'verbose' ? chalk.magenta(level) :
                                level === 'silly' ? chalk.grey(level) :
                                    chalk.white(level);

    const colorizedTimestamp = chalk.gray(timestamp);
    const colorizedLabel = chalk.hex('#FFA500')(label);
    const colorizedFilename = chalk.hex('#00CED1')(`[${filename}]`);

    // Dodaj marker grupy jeśli jesteśmy w grupie
    const groupPrefix = group ? chalk.gray(`${GROUP_MARKER} `.repeat(groupLevel)) : '';

    // Dodaj różnicę czasu jeśli mamy poprzedni timestamp
    const timeDiffStr = timeDiff ? chalk.gray(` +${timeDiff}ms`) : '';

    return `${colorizedTimestamp}${timeDiffStr} [${colorizedLevel}] [${colorizedLabel}] ${colorizedFilename}: ${groupPrefix}${message}`;
});

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        winston.format.colorize(),
        consoleFormat
    )
});

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || DEFAULT_LOG_LEVEL,
    format: logFormat,
    transports: [
        fileTransport('combined.log'),
        fileTransport('error.log', 'error'),
        consoleTransport
    ]
});

function createLogger(filePath) {
    const projectRoot = path.resolve(__dirname, '..', '..');
    const relativePath = path.relative(projectRoot, filePath);
    const folderStructure = path.dirname(relativePath).replace(/\\/g, '/');
    const filename = path.basename(filePath);

    const childLogger = logger.child({
        label: folderStructure,
        filename: filename
    });

    const timerRegistry = new TimerRegistry();
    const groupManager = new LogGroup();
    let lastLogTimestamp = null;

    const wrapperLogger = {
        // Standardowe poziomy logowania
        error: (message, ...args) => logWithLevel('error', message, args),
        warn: (message, ...args) => logWithLevel('warn', message, args),
        info: (message, ...args) => logWithLevel('info', message, args),
        http: (message, ...args) => logWithLevel('http', message, args),
        verbose: (message, ...args) => logWithLevel('verbose', message, args),
        debug: (message, ...args) => logWithLevel('debug', message, args),
        silly: (message, ...args) => logWithLevel('silly', message, args),

        // Statusy z ikonami
        success: (message, ...args) => {
            logWithLevel('info', `${chalk.green(SYMBOLS.status.success)} ${message}`, args);
        },
        fail: (message, ...args) => {
            logWithLevel('error', `${chalk.red(SYMBOLS.status.error)} ${message}`, args);
        },
        warning: (message, ...args) => {
            logWithLevel('warn', `${chalk.yellow(SYMBOLS.status.warning)} ${message}`, args);
        },

        // Grupowanie logów
        group: (label) => {
            const groupId = Math.random().toString(36).substr(2, 9);
            const level = groupManager.startGroup(groupId, label);
            logWithLevel('info', chalk.cyan(`${groupManager.getGroupPrefix(groupId)} ${label}`));
            return groupId;
        },

        groupEnd: (groupId) => {
            const level = groupManager.getIndentation().length / INDENT_SIZE;
            logWithLevel('info', chalk.cyan(`${groupManager.getGroupPrefix(groupId)}`));
            groupManager.endGroup(groupId);
        },

        // Pomiar czasu
        time: (label) => {
            timerRegistry.start(label);
        },

        timeEnd: (label, message = '') => {
            const duration = timerRegistry.end(label);
            if (duration) {
                logWithLevel('info', `${message} ${chalk.cyan(`⏱ ${label}:`)} ${chalk.yellow(duration)}`);
            }
        },

        // Logowanie tabel
        table: (data, columns) => {
            const table = formatTable(data, columns);
            logWithLevel('info', table);
        },

        // Pretty print dla obiektów
        dir: (obj, options = {}) => {
            const output = util.inspect(obj, {
                ...options,
                colors: true,
                depth: null,
                maxArrayLength: null
            });
            logWithLevel('info', output);
        },

        // Box informacyjny
        box: (content, title) => {
            logWithLevel('info', drawBox(content, title));
        },

        // Progress bar z różnymi opcjami
        progress: (current, total, label = '', options = {}) => {
            const progressBar = drawProgressBar(current, total, options);
            logWithLevel('info', `${label} ${progressBar}`);
        },

        // Progress ze spinnerem
        progressWithSpinner: (() => {
            let spinnerIndex = 0;
            let intervalId = null;

            return (message, isComplete = false) => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }

                if (!isComplete) {
                    intervalId = setInterval(() => {
                        process.stdout.write('\r');
                        process.stdout.write(
                            `${chalk.cyan(SYMBOLS.progress.spinner[spinnerIndex])} ${message}`
                        );
                        spinnerIndex = (spinnerIndex + 1) % SYMBOLS.progress.spinner.length;
                    }, 80);
                } else {
                    process.stdout.write('\r');
                    logWithLevel('info', `${chalk.green(SYMBOLS.status.success)} ${message}`);
                }
            };
        })(),

        // Separator z różnymi stylami
        separator: (style = 'single', title = '') => {
            const width = 80;
            let line = '';

            switch (style) {
                case 'double':
                    line = '═'.repeat(width);
                    break;
                case 'dashed':
                    line = '┄'.repeat(width);
                    break;
                case 'dotted':
                    line = '┈'.repeat(width);
                    break;
                default:
                    line = '─'.repeat(width);
            }

            if (title) {
                const padding = Math.max(0, width - title.length - 2);
                const leftPad = Math.floor(padding / 2);
                const rightPad = padding - leftPad;
                line = `${line.slice(0, leftPad)} ${chalk.cyan(title)} ${line.slice(0, rightPad)}`;
            }

            logWithLevel('info', chalk.gray(line));
        }
    };

    // Helper do logowania z określonym poziomem
    function logWithLevel(level, message, args = [], extra = {}) {
        const now = Date.now();
        const timeDiff = lastLogTimestamp ? now - lastLogTimestamp : null;
        lastLogTimestamp = now;

        const formattedMessage = combineMessageAndArgs(message, args, groupManager);
        childLogger[level](formattedMessage, {
            group: extra.group,
            groupLevel: extra.groupLevel,
            timeDiff
        });
    }

    return wrapperLogger;
}

module.exports = { createLogger };