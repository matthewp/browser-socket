(function() {
var root = {};
function EventEmitter() {}

EventEmitter.prototype.on = function (name, callback) {
  if (!this.hasOwnProperty("_handlers")) this._handlers = {};
  var handlers = this._handlers;
  if (!handlers.hasOwnProperty(name)) handlers[name] = [];
  var list = handlers[name];
  list.push(callback);
};
EventEmitter.prototype.addListener = EventEmitter.prototype.on;

EventEmitter.prototype.once = function (name, callback) {
  this.on(name, callback);
  this.on(name, remove);
  function remove() {
    this.off(name, callback);
    this.off(name, remove);
  }
};

EventEmitter.prototype.emit = function (name/*, args...*/) {
  if (!this.hasOwnProperty("_handlers")) return;
  var handlers = this._handlers;
  if (!handlers.hasOwnProperty(name)) return;
  var list = handlers[name];
  var args = Array.prototype.slice.call(arguments, 1);
  for (var i = 0, l = list.length; i < l; i++) {
    if (!list[i]) continue;
    list[i].apply(this, args);
  }
};

EventEmitter.prototype.off = function (name, callback) {
  if (!this.hasOwnProperty("_handlers")) return;
  var handlers = this._handlers;
  if (!handlers.hasOwnProperty(name)) return;
  var list = handlers[name];
  var index = list.indexOf(callback);
  if (index < 0) return;
  list[index] = false;
  if (index === list.length - 1) {
    while (index >= 0 && !list[index]) {
      list.length--;
      index--;
    }
  }
};

EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
function TCPSocket() {
  if(!TCPSocket.BROWSER) {
    throw "This browser doesn't support TCP sockets.";
  }
}
if(navigator.mozTCPSocket) {
  TCPSocket = function() {
    navigator.mozTCPSocket.apply(this, arguments);
  };
  TCPSocket.prototype = Object.create(navigator.mozTCPSocket.prototype);
  TCPSocket.prototype.constructor = TCPSocket;
  TCPSocket.BROWSER = 'mozilla';
}
var dgram = require('dgram');

var SSDP_SIG = 'Microsoft-Windows-NT/5.1 UPnP/1.1 Mediabrary/1.0',
    SSDP_IP = '239.255.255.250',
    SSDP_PORT = 1900,
    SSDP_IPPORT = SSDP_IP + ':' + SSDP_PORT,
    TTL = 1800;

function SSDP() {
  var self = this;

  if (!(this instanceof SSDP)) return new SSDP();

  EventEmitter.call(self);

  self.usns = {};
  self.udn = 'uuid:e3f28962-f694-471f-8f74-c6abd507594b';

  // Configure socket for either client or server.
  self.sock = dgram.createSocket('udp4');

  self.sock.on('error', function (err) {
    console.log('############### Got an error!');
    console.trace(err);
  });

  self.sock.on('message', function onMessage(msg, rinfo) {
    self.parseMessage(msg, rinfo);
  });

  self.sock.on('listening', function onListening() {
    var addr = self.sock.address();
    console.log('SSDP Listening on ' + addr.address + ':' + addr.port);
    self.sock.addMembership(SSDP_IP);
    self.sock.setMulticastTTL(2);
  });

  process.on('exit', function () {
    self.close();
  });
}

SSDP.prototype = Object.create(EventEmitter.prototype);

SSDP.prototype.inMSearch = function (st, rinfo) {
  var self = this,
      peer = rinfo['address'],
      port = rinfo['port'];

  if (st[0] == '"') st = st.slice(1, -1);

  Object.keys(self.usns).forEach(function (usn) {
    var udn = self.usns[usn];

    if (st == 'ssdp:all' || usn == st) {
      var pkt = self.getSSDPHeader('200 OK', {
        ST: usn,
        USN: udn,
        LOCATION: self.httphost + '/upnp/desc.php',
        'CACHE-CONTROL': 'max-age=' + TTL,
        DATE: new Date().toUTCString(),
        SERVER: SSDP_SIG,
        EXT: ''
      }, true);
      console.log('Sending a 200 OK for an m-search to ' + peer + ':' + port);
      pkt = new Buffer(pkt);
      self.sock.send(pkt, 0, pkt.length, port, peer);
    }
  });
};



SSDP.prototype.addUSN = function (device) {
  this.usns[device] = this.udn + '::' + device;
};



SSDP.prototype.parseMessage = function (msg, rinfo) {
  var type = msg.toString().split('\r\n').shift();

  // HTTP/#.# ### Response
  if (type.match(/HTTP\/(\d{1})\.(\d{1}) (\d+) (.*)/)) {
    this.parseResponse(msg, rinfo);
  } else {
    this.parseCommand(msg, rinfo);
  }
};



SSDP.prototype.parseCommand = function parseCommand(msg, rinfo) {
  var lines = msg.toString().split("\r\n"),
      type = lines.shift().split(' '),
      method = type[0],
      uri = type[1],
      self = this;

  var heads = {};

  lines.forEach(function (line) {
    if (line.length) {
      var vv = line.match(/^([^:]+):\s*(.*)$/);
      heads[vv[1].toUpperCase()] = vv[2];
    }
  });

  switch (method) {
    case 'NOTIFY':
      // Device coming to life.
      if (heads['NTS'] == 'ssdp:alive') {
        self.emit('advertise-alive', heads);
      }
      // Device shutting down.
      else if (heads['NTS'] == 'ssdp:byebye') {
        self.emit('advertise-bye', heads);
      } else {
        console.log('############### Notify unhandled!');
      }
      break;
    case 'M-SEARCH':
      console.log('SSDP M-SEARCH: for (' + heads['ST'] + ') from (' + rinfo['address'] + ':' + rinfo['port'] + ')');
      if (!heads['MAN']) return;
      if (!heads['MX']) return;
      if (!heads['ST']) return;
      self.inMSearch(heads['ST'], rinfo);
      break;
    default:
      console.log("Unknown message: \r\n" + msg);
  }
};



SSDP.prototype.parseResponse = function parseResponse(msg, rinfo) {
  this.emit('response', msg, rinfo);
  /*console.log('Parsing a response!');
   console.log(msg.toString());*/
};



SSDP.prototype.search = function search(st) {
  var self = this;

  require('dns').lookup(require('os').hostname(), function (err, add) {
    self.sock.bind(0, add);

    var pkt = self.getSSDPHeader('M-SEARCH', {
      'HOST': SSDP_IPPORT,
      'ST': st,
      'MAN': '"ssdp:discover"',
      'MX': 3
    });
    pkt = new Buffer(pkt);
    console.log('@138', pkt.toString());
    self.sock.send(pkt, 0, pkt.length, SSDP_PORT, SSDP_IP);
  });
};



SSDP.prototype.server = function (ip) {
  var self = this;

  this.httphost = 'http://' + ip + ':10293';
  this.usns[this.udn] = this.udn;
  this.sock.bind(SSDP_PORT, ip);

  // Shut down.
  this.advertise(false);

  setTimeout(function () {
    self.advertise(false);
  }, 1000);

  // Wake up.
  setTimeout(self.advertise, 2000);
  setTimeout(self.advertise, 3000);

  // Ad loop.
  setInterval(self.advertise, 10000);
};



SSDP.prototype.close = function () {
  this.advertise(false);
  this.advertise(false);
  this.sock.close();
};



SSDP.prototype.advertise = function (alive) {
  var self = this;

  if (!this.sock) return;
  if (alive === undefined) alive = true;

  Object.keys(self.usns).forEach(function (usn) {
    var udn = self.usns[usn],
        out = 'NOTIFY * HTTP/1.1\r\n';

    var heads = {
      HOST: SSDP_IPPORT,
      NT: usn,
      NTS: (alive ? 'ssdp:alive' : 'ssdp:byebye'),
      USN: udn
    };

    if (alive) {
      heads['LOCATION'] = self.httphost + '/upnp/desc.php';
      heads['CACHE-CONTROL'] = 'max-age=1800';
      heads['SERVER'] = SSDP_SIG;
    }

    out = new Buffer(self.getSSDPHeader('NOTIFY', heads));
    self.sock.send(out, 0, out.length, SSDP_PORT, SSDP_IP);
  });
};



SSDP.prototype.getSSDPHeader = function (head, vars, res) {
  var ret = '';

  if (res == null) res = false;

  if (res) {
    ret = "HTTP/1.1 " + head + "\r\n";
  } else {
    ret = head + " * HTTP/1.1\r\n";
  }

  Object.keys(vars).forEach(function (n) {
    ret += n + ": " + vars[n] + "\r\n";
  });

  return ret + "\r\n";
};

module.exports = SSDP;
})();