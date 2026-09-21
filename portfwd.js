#!/usr/bin/env node

'use strict';

const net = require('net');

const DEFAULT_IP = '192.168.64.2';
const DEFAULT_PORT = 5174;

function printHelp() {
  console.log(`Usage: ciiri-node-portfwd [options]

Options:
  --ip <address>    Target host or IP address (default: ${DEFAULT_IP})
  --port <ports>    Local and target ports, comma separated (default: ${DEFAULT_PORT})
  -h, --help        Show this help message

Examples:
  ciiri-node-portfwd --ip 192.168.64.2 --port 5174
  ciiri-node-portfwd --ip 192.168.64.2 --port 5174,5175,8080`);
}

function parsePort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid port: ${value}. Port must be an integer between 1 and 65535.`);
  }
  return port;
}

function parsePortList(value) {
  const parts = String(value).split(',').map(part => part.trim());
  if (parts.some(part => part === '')) {
    throw new Error(`Invalid port list: ${value}. Use comma separated ports, for example 5174,5175.`);
  }
  return parts.map(parsePort);
}

function parseArgs(argv) {
  const options = {
    ip: DEFAULT_IP,
    ports: [],
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
      if (!argv[index + 1] || argv[index + 1].startsWith('-')) {
        throw new Error('Missing value for --port.');
      }
      options.ports.push(...parsePortList(argv[index + 1]));
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${argument}`);
  }

  if (options.ports.length === 0) {
    options.ports.push(DEFAULT_PORT);
  }

  const duplicate = options.ports.find((port, index) => options.ports.indexOf(port) !== index);
  if (duplicate !== undefined) {
    throw new Error(`Duplicate local port: ${duplicate}. Each local port must be unique.`);
  }

  return {
    ip: options.ip,
    ports: options.ports,
  };
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

const allConnections = new Set();
const servers = [];
let shuttingDown = false;
let failedListeners = 0;

function startForwarder(localPort) {
  const targetAddress = `${options.ip}:${localPort}`;
  let connectionId = 0;

  const server = net.createServer(client => {
    const id = ++connectionId;
    const clientAddress = `${client.remoteAddress}:${client.remotePort}`;
    const target = net.connect(localPort, options.ip);

    allConnections.add(client);
    allConnections.add(target);
    log(`[${localPort}] #${id} connection from ${clientAddress}, forwarding to ${targetAddress}`);

    client.on('error', error => {
      log(`[${localPort}] #${id} client error: ${error.message}`);
      target.destroy();
    });

    target.on('connect', () => {
      log(`[${localPort}] #${id} connected to ${targetAddress}`);
    });

    target.on('error', error => {
      log(`[${localPort}] #${id} target error: ${error.message}`);
      client.destroy();
    });

    client.on('close', () => {
      allConnections.delete(client);
      allConnections.delete(target);
      log(`[${localPort}] #${id} client connection closed`);
    });

    target.on('close', () => {
      allConnections.delete(client);
      allConnections.delete(target);
      log(`[${localPort}] #${id} target connection closed`);
    });

    client.pipe(target);
    target.pipe(client);
  });

  server.on('error', error => {
    log(`[${localPort}] server error: ${error.message}`);
    process.exitCode = 1;
    if (!server.listening) {
      failedListeners += 1;
      if (failedListeners === options.ports.length) {
        log('all listeners failed, exiting');
        process.exit(1);
      }
    }
  });

  server.listen(localPort, () => {
    log(`[${localPort}] listening on 0.0.0.0:${localPort} -> ${targetAddress}`);
  });

  servers.push({ localPort, server });
}

options.ports.forEach(startForwarder);

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  log(`received ${signal}, shutting down`);

  let pending = servers.length;
  servers.forEach(({ localPort, server }) => {
    server.close(() => {
      log(`[${localPort}] stopped listening`);
      pending -= 1;
      if (pending === 0) {
        log('server stopped');
      }
    });
  });

  allConnections.forEach(connection => connection.destroy());
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
