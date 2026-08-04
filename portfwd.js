#!/usr/bin/env node

'use strict';

const net = require('net');

const DEFAULT_IP = '192.168.64.2';
const DEFAULT_PORT = 5174;

function printHelp() {
  console.log(`Usage: ciiri-node-portfwd [options]

Options:
  --ip <address>    Target host or IP address (default: ${DEFAULT_IP})
  --port <port>     Target and local port (default: ${DEFAULT_PORT})
  -h, --help        Show this help message`);
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}. Port must be an integer between 1 and 65535.`);
  }
  return port;
}

function parseArgs(argv) {
  const options = {
    ip: DEFAULT_IP,
    port: DEFAULT_PORT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '-h' || argument === '--help') {
      printHelp();
      process.exit(0);
    }

    if (argument === '--ip') {
      if (!argv[index + 1] || argv[index + 1].startsWith('-')) {
        throw new Error('Missing value for --ip.');
      }
      options.ip = argv[index + 1];
      index += 1;
      continue;
    }

    if (argument === '--port' || argument === '-p') {
      if (!argv[index + 1]) {
        throw new Error('Missing value for --port.');
      }
      options.port = parsePort(argv[index + 1]);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  return options;
}

function log(message) {
  console.log(`[portfwd] ${new Date().toISOString()} ${message}`);
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`[portfwd] ${error.message}`);
  console.error('Use --help to see available options.');
  process.exit(1);
}

const connections = new Set();
let connectionId = 0;
let shuttingDown = false;

const server = net.createServer(client => {
  const id = ++connectionId;
  const clientAddress = `${client.remoteAddress}:${client.remotePort}`;
  const targetAddress = `${options.ip}:${options.port}`;
  const target = net.connect(options.port, options.ip);

  connections.add(client);
  connections.add(target);
  log(`#${id} connection from ${clientAddress}, forwarding to ${targetAddress}`);

  client.on('error', error => {
    log(`#${id} client error: ${error.message}`);
    target.destroy();
  });

  target.on('connect', () => {
    log(`#${id} connected to ${targetAddress}`);
  });

  target.on('error', error => {
    log(`#${id} target error: ${error.message}`);
    client.destroy();
  });

  client.on('close', () => {
    connections.delete(client);
    connections.delete(target);
    log(`#${id} client connection closed`);
  });

  target.on('close', () => {
    connections.delete(client);
    connections.delete(target);
    log(`#${id} target connection closed`);
  });

  client.pipe(target);
  target.pipe(client);
});

server.on('error', error => {
  log(`server error: ${error.message}`);
  process.exitCode = 1;
});

server.listen(options.port, () => {
  log(`listening on 0.0.0.0:${options.port} -> ${options.ip}:${options.port}`);
});

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  log(`received ${signal}, shutting down`);
  server.close(() => {
    log('server stopped');
  });
  connections.forEach(connection => connection.destroy());
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
