(function(global) {
function TCPSocket() {
  if(!TCPSocket.BROWSER) {
    throw "This browser doesn't support TCP sockets.";
  }
}

function UDPSocket() {
  if(!UDPSocket.BROWSER) {
    throw "This browser doesn't support UDP sockets.";
  }
}

var exports = {};
exports.TCPSocket = TCPSocket;
exports.UDPSocket = UDPSocket;

if (typeof define === "function" && define.amd) {
  define("socket", [], function () { return exports; });
} else {
  Object.keys(exports).forEach(function(k) { global[k] = exports[k]; });
}
if(navigator.mozTCPSocket) {
  TCPSocket = function() {
    navigator.mozTCPSocket.apply(this, arguments);
  };
  TCPSocket.prototype = Object.create(navigator.mozTCPSocket.prototype);
  TCPSocket.BROWSER = 'mozilla';
}
(function() {
var noop = function(){};

if(chrome && chrome.socket) {
  TCPSocket.BROWSER = 'chrome';

  TCPSocket.prototype.open = function(host, port, options) {
    var args = arguments;

    if(!this._socketId) {
      chrome.socket.create('tcp', {
          onEvent: this._onDataReceived.bind(this)
        },
        (function(createInfo) {
          this._socketId = createInfo.socketId;
          this.open.apply(this, args);
        }).bind(this));
    }

    chrome.socket.connect(this._socketId, host, port, (function() {
      this.onopen();
    }).bind(this));
  };

  TCPSocket.protoype.send = function(data) {
    var ab = this._asArrayBuffer(data);
    chrome.socket.write(this._socketId, ab, (function(sendInfo) {
      this.ondrain();
    }).bind(this));
  };

  TCPSocket.prototype.suspend = function() {

  };

  TCPSocket.prototype.resume = function() {

  };

  TCPSocket.prototype.close = function() {
    chrome.socket.destroy(this._socketId);
  };

  TCPSocket.prototype.onopen = noop;
  TCPSocket.prototype.ondrain = noop;
  TCPSocket.prototype.ondata = noop;
  TCPSocket.prototype.onerror = noop;
  TCPSocket.prototype.onclose = noop;

  TCPSocket.prototype._onDataReceived = function(d) {
    var data = chrome.socket.read(d.socketId);
    this.ondata(data);
  };

  TCPSocket.prototype._asArrayBuffer = function(data) {
    if(data instanceof ArrayBuffer) {
      return data;
    }

    var str = data.toString();
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  };
}
})();
})(this);