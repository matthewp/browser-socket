if(navigator.mozTCPSocket) {
  TCPSocket = function() {
    navigator.mozTCPSocket.apply(this, arguments);
  };
  TCPSocket.prototype = Object.create(navigator.mozTCPSocket.prototype);
  TCPSocket.BROWSER = 'mozilla';
}