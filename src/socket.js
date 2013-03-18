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