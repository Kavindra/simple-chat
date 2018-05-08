(function() {
    'use strict';

    angular
        .module('simpleChat')
        .controller('MainController', MainController);

    MainController.$inject = ['$rootScope', '$scope', '$window', '$interval'];
    function MainController($rootScope, $scope, $window, $interval) {
        // scope and global variables.
        $scope.chatMessage = '';
        $scope.status = 'Not Connected';
        $scope.chatMessage = '';
        $scope.messages = [];
        $scope.registered = 'initially not true or false';
        $scope.chatName = '';
        $scope.listOfUsers = [];
        $scope.privateChat = false;
        $scope.privateMessages = {};
        $scope.privateChats = [];
        $scope.privateChatMessage = {};
        $scope.typingMessage = '';
        $scope.privateTypingMessage = {};
        var typing = false;
        var lastTypingTime;
        const TYPING_TIMER_LENGTH = 1000;

        var socket = io(window.location.host);

        /*
        * When the user is connected, update the status of the connection as 'Connected'
        * */
        socket.on("Connection successful", (data) => {
            $scope.$apply(() => {
                $scope.status = 'Connected';
            });
        });

        /*
        * After user sends the username, the server emits an event with a user with that username already exists or not.
        * */
        socket.on("user_exists", (data) => {
            handleRegistration(data);
        });

        /*
        * If a disconnect event received from the server, update the status to 'Disconnected'.
        * */
        socket.on("disconnect", () => {
            $scope.status = 'Disconnected';
            //$scope.$apply(() => {$scope.status = 'Disconnected';});
            //Setting Message On Disconnection
        });

        /*
        * Receives an event when a new user joins the channel.
        * */
        socket.on("user joined", (data) => {
            handleNewContact(data);
        });

        /*
        * When the user registers, after the registration, server sends the list of already connected users.
        * */
        socket.on("registered_users", (data) => {
            createContactList(data);
        });

        /*
        * Receives an event when a user disconnected.
        * */
        socket.on("user disconnected", (data) => {
            userDisconnected(data);

        });

        /*
        * Receives chat messages from the server.
        * */
        socket.on("message", (data) => {
            handleChatMessages(data);

        });

        /*
        * When a connected user is typing, server emits an event for the relevant clients.
        * */
        socket.on('typing', (data) => {
            typingMessage(data);

        });

        /*
        * When a connected user stopped typing, server emits an event for the relevant clients.
        * */
        socket.on('stop typing', (data) => {
            stopTypingMessage(data);
        });

        socket.on('base64 file', function (msg) {
            console.log(msg);
            //{sender: data.username, text: data.message, self: data.self}
            $scope.$apply(() => {addChatMessage({username: msg.username, message: msg.fileName, file: msg.file});});
        });

        /*
        * Console log the message if server sends any error event.
        * */
        socket.on('error', (err) => {
            console.log("Error!");
            console.log(err);
        });

        /*
        * Handle user registration. If a user with the given username already exists, the server emits an event with 'userExist = true',
        * in which case the username input field clears and let the user enter another username.
        * Otherwise, user is logged into chat and update the status as 'Registered'.
        * */
        function handleRegistration(data) {
            if(data.userExists === true) {
                $scope.registered = false;
                $scope.chatName = '';
                socket.disconnect();
                socket.connect(window.location.host);
            } else {
                $scope.registered = true;
                $scope.status = 'Registered';
            }
            $scope.$apply();
        }

        /*
        * When a new user joins the channel, update the contacts list and display a notification using notifier API.
        * */
        function handleNewContact(data) {
            // Update the contacts list.
            $scope.listOfUsers.push(data);
            // Display desktop notification.
            chatNotify(data.username, 'Joined');
            $scope.$apply();
        }

        /*
        * Creates the contact list when received the list of connected users for the first time from the server.
        * */
        function createContactList(data) {
            $scope.listOfUsers = data;
            $scope.$apply();
        }

        /*
        * Sends an event to the server when user clicks on Register button. If the username is empty, creates a random user name.
        * */
        $scope.register = function () {
            if($scope.chatName === '') {
                $scope.chatName = 'user_' + parseInt(Math.random()*100);
            }
            socket.emit("Register_Name", $scope.chatName);
            //$scope.registered = true;
        };

        /*
        * When a contact disconnected event received from the server, display a desktop notification.
        * */
        function userDisconnected(data) {
            if(data.username) chatNotify(data.username, 'Disconnected');
            $scope.listOfUsers = $scope.listOfUsers.filter(user => user.id !== data.id);
            $scope.$apply();
        }

        /*
        * When a chat messages received from the server, display it in the correct area.
        * */
        function handleChatMessages(data) {
            // Check whether the message is private.
            if(data.private) {
                $scope.privateChat = {
                    state: true,
                    contact: data.user
                };
                $scope.privateMessages[data.user.id] = $scope.privateMessages[data.user.id] ? $scope.privateMessages[data.user.id] : [];

                // If there is no chat window for private chat with the client, creates a new window.
                if ($scope.privateChats.filter(chat => chat.id === data.user.id).length == 0) {
                    $scope.privateChats.push(data.user);
                }

                // Update the view with new message.
                $scope.$apply(() => {addPrivateChatMessage({room: data.user.id, username: data.user.username, message: data.message});});
                chatNotify(data.user.username, 'New message received!');
            } else {
                $scope.$apply(() => {addChatMessage(data);});
                chatNotify(data.username, 'New message received!');
            }
        }

        /*
        * Display typing message when a contact is typing a message.
        * */
        function typingMessage(data) {
            if(data.private) {
                $scope.privateTypingMessage[data.username] = data.username + ' is typing..';
            } else {
                $scope.typingMessage = data.username + ' is typing..';
            }
            $scope.$apply();
        }

        /*
        * Remove typing message when a contact stopped typing a message.
        * */
        function stopTypingMessage(data) {
            if(data.private) {
                $scope.privateTypingMessage[data.username] = '';
            } else {
                $scope.typingMessage = '';
            }

            $scope.$apply();
        }

        /*
        * When the user types the message and press enter, this function is called and append the message in the relevant area and
        * sends an event to the server along with the message and the username to broadcast to all the users.
        * */
        $scope.sendChat = function () {
            // Append chat message
            addChatMessage({
                username: $scope.chatName,
                message: $scope.chatMessage,
                self: true
            });
            // Emit an event with chat message
            socket.emit("Send_msg", $scope.chatMessage);
            // Clear the input field.
            $scope.chatMessage = '';
        };

        /*
        * Update the messages array to display the message in the group chat area.
        * */
        function addChatMessage (data) {
            $scope.messages.push({sender: data.username, text: data.message, self: data.self, file: data.file});
        }

        /*
        * Update the privateMessages object to display the message in the relevant chat area.
        * */
        function addPrivateChatMessage (data, options) {
            $scope.privateMessages[data.room].push({sender: data.username, text: data.message, self: data.self});
        }

        /*
        * When the user selects a contact to start a private chat, it creates a new chat area.
        * */
        $scope.startPrivateChat = function (user) {
            socket.emit('stop typing');
            $scope.privateMessages[user.id] = $scope.privateMessages[user.id] ? $scope.privateMessages[user.id] : [];
            // Only create one chat window for specific private chat.
            if ($scope.privateChats.filter(chat => chat.id === user.id).length == 0) {
                $scope.privateChats.push(user);
            }
        };

        /*
        * When the user types the message and press enter, this function is called and append the message in the relevant area and
        * sends an event to the server along with the message and the id of the user to whom the message is sent.
        * */
        $scope.sendPrivateChat = function (user) {
            addPrivateChatMessage({
                room: user.id,
                username: $scope.chatName,
                message: $scope.privateChatMessage[$scope.privateChats.indexOf(user)],
                self: true
            });
            socket.emit("Send_msg", {
                contact: user.id,
                message: $scope.privateChatMessage[$scope.privateChats.indexOf(user)]
            });
            $scope.privateChatMessage[$scope.privateChats.indexOf(user)] = '';
        };

        /*
        * Using Notifier API to display desktop notifications whenever a user has connected, disconnected or sent a message.
        * */
        function chatNotify(username, event) {
            // Check if the browser supports notifications
            if (!("Notification" in window)) {
                alert("This browser does not support desktop notification");
            }

            // Check whether notification permissions have been granted
            else if (Notification.permission === "granted") {
                // Create a notification
                var notification = new Notification(username, {body: event});
            }

            // If above check is failed, then requesting for permission
            else if (Notification.permission !== "denied") {
                Notification.requestPermission(function (permission) {
                    // Create a notification
                    if (permission === "granted") {
                        var notification = new Notification(username, {body: event});
                    }
                });
            }
        }

        /*
        * When the user is typing a message or stopped typing, emits an event to the server.
        * */
        $scope.updateTyping = function(user) {
            if (!typing) {
                typing = true;
                // If typing in a private chat, emit the event with the username.
                user ? socket.emit('typing', user) : socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();

            // Check the typing status in every second and sends the stop typing event to the server.
            setTimeout(() => {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    user ? socket.emit('stop typing', user) : socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        };

        /*
        * When the user clicks on the close button of chat window, removes it from active chats.
        * */
        $scope.closeChatWindow = function (data) {
            $scope.privateChats.splice($scope.privateChats.indexOf(data), 1);
        };

        /*
        * Emit an event to the server when the user wants to disconnect.
        * */
        $scope.disconnect = function () {
            socket.disconnect();
            $scope.registered = null; // Show the Reconnect button.
        };

        /*
        * If the user closes the browser tab, disconnect the socket and server broadcasts an event to other clients.
        * */
        $window.onunload = function (event) {
            socket.disconnect();
        };

        /*
        * If the user disconnected voluntarily by clicking on the disconnect button,
        * he can connect again using the 'Reconnect' button without refreshing the page.
        * This function is called when the user clicked on Reconnect button.
        * */
        $scope.reconnect = function () {
            socket.connect('');
            $scope.registered = 'false';
        };

        /*
        * Send files. This is called when the user selected a file using browse button.
        * Working only for images at the moment.
        * */
        $scope.sendFile = function () {
            var data = document.getElementById('file').files[0];

            var reader = new FileReader();
            reader.onload = function(evt){
                var msg ={};
                msg.username = $scope.chatName;
                msg.file = evt.target.result;
                msg.fileName = data.name;
                //console.log(msg);
                socket.emit('base64_file', msg);
            };
            reader.readAsDataURL(data);
        };

        /*
        * Convert data URI to blob.
        * */
        function dataURItoBlob(dataURI) {

            // convert base64/URLEncoded data component to raw binary data held in a string
            var byteString;
            if (dataURI.split(',')[0].indexOf('base64') >= 0)
                byteString = atob(dataURI.split(',')[1]);
            else
                byteString = unescape(dataURI.split(',')[1]);

            // separate out the mime component
            var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

            // write the bytes of the string to a typed array
            var ia = new Uint8Array(byteString.length);
            for (var i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }

            return new Blob([ia], {type:mimeString});
        }

        $scope.openFile = function (fileEncoded) {
            var blob = dataURItoBlob(fileEncoded);
            var file = new File([blob]);
            console.log(file);
        }
    }
})();

