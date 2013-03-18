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