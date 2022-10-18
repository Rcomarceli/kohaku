class Connection {
    constructor(io, socket) {
        this.socket = socket;
        this.io = io;

        socket.on('disconnect', () => this.disconnect());
        socket.on('connect_error', (err) => {
        console.log(`connect_error due to ${err.message}`);
        });
    }
    
    disconnect() {
        console.log('user disconnected!')
    }
  }

function webSocket(io) {
io.on('connection', (socket) => {
    new Connection(io, socket);   
    console.log('new user connected!')
});

};
  
module.exports = webSocket;