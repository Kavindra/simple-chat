var express  = require('express');
var app      = express(); // Create the app with express
var morgan = require('morgan');
var crypto = require('crypto'); // Use to create md5 hash of email.

app.use(express.static(__dirname + '/public')); // Set the static files location /public
app.use(morgan('dev')); // Log all the requests to the console

app.get('*', function(req, res) {
    res.sendfile('./public/views/index.html'); // Load the index file
});

// Start the app with Nodejs on port 8080
var io = require('socket.io').listen(app.listen(8080));
console.log("App listening on port 8080");

// Store all the connected users in an array. This is used to send the list of connected users to the users join later.
var listOfusers = [];
const emailRegex = /\S+@\S+\.\S+/; // Regular expression to match email addresses.

// Track and handles client connections.
io.sockets.on("connection", (socket) => {
    // Emits successful message to the clients after establishing the connection.
    socket.emit("Connection successful");

    // When the user sends username along with the register event, check the uniqueness of the name and if the username exists already,
    // do not register username and emits an event to the client with userExist: true.
    socket.on("Register_Name", (data) => {
        // Check the existence of the username
        if (listOfusers.filter(user => user.username === data).length == 0) {
            // Emits an event with userExists: false. This is used in the frontend to display the contacts and chat section.
            socket.emit('user_exists', {userExists: false});
            socket.username = data;
            // Sends the list of registered users to the client.
            socket.emit('registered_users', listOfusers);

            // Default avatar image for the contacts.
            var gravatarLink = '../img/avatar-default.jpg';

            // Check whether the username is an email.
            if(emailRegex.test(socket.username.trim())) {
                // Create the md5 hash of the email.
                let emailHash = crypto.createHash('md5').update(socket.username.trim().toLowerCase()).digest('hex');
                // Creates the gravatar source URL using the email hash.
                gravatarLink = 'https://www.gravatar.com/avatar/' + emailHash;
            }

            var newUser = {
                username: socket.username,
                id: socket.id,
                gravatarLink: gravatarLink
            };

            // Add new user to the list of users.
            listOfusers.push(newUser);
            // Broadcast event to all the clients with new user's details.
            socket.broadcast.emit('user joined', newUser);
        } else {
            // If the username exists already emits an event with userExists: true without registering user name.
            socket.emit('user_exists', {userExists: true});
        }

        //Listening to chat messages.
        socket.on("Send_msg", (data) => {
            // Check whether the data consists with contact in order to decide to whom the message should e emitted.
            if(data.contact) {
                // Private messages are sent to the relevant client.
                socket.broadcast.to(data.contact).emit('message', {
                    user: {id: socket.id, username: socket.username},
                    message: data.message,
                    private: true
                });
            } else {
                // Public messages are sent to all the clients.
                socket.broadcast.emit('message', {
                    username: socket.username,
                    message: data
                });
            }
        });

        // Listening to 'typing' message
        socket.on('typing', (data) => {
            // Check whether the event consists with contact id in order to decide to whom the message should e emitted.
            if(data) {
                socket.broadcast.to(data.id).emit('typing', {
                    username: socket.username,
                    private: true
                });
            } else {
                socket.broadcast.emit('typing', {
                    username: socket.username
                });
            }

        });

        // Listening to 'stop typing' message
        socket.on('stop typing', (data) => {
            // Check whether the event consists with contact id in order to decide to whom the message should e emitted.
            if(data) {
                socket.broadcast.to(data.id).emit('stop typing', {
                    username: socket.username,
                    private: true
                });
            } else {
                socket.broadcast.emit('stop typing', {
                    username: socket.username
                });
            }
        });

        // Listening to client disconnections.
        socket.on('disconnect', () => {
            io.emit('user disconnected', {
                username: socket.username,
                id: socket.id
            });
            listOfusers = listOfusers.filter(user => user.id !== socket.id);
        });

        // Listening to messages with files.
        socket.on('base64_file', function (msg) {
            socket.username = msg.username;
            socket.broadcast.emit('base64 file', {
                username: socket.username,
                file: msg.file,
                fileName: msg.fileName
            });
        });
    })
});

// Track and handles disconnections.
io.sockets.on("disconnect", (socket) => {
    io.emit('user disconnected', {
        username: socket.username,
        id: socket.id
    });
});
