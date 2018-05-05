angular.module('components', [])

// Directive to create the contact list. Parameters are the list of contacts and function to invoke when click on a contact.
    .directive('contactList', function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                contacts: '=',
                clickFunction: '&'
            },
            controller: function($scope, $element) {
                var contacts = $scope.contacts;
            },
            template:
            `<ul>
                <li ng-repeat="user in contacts track by $index" ng-click="clickFunction({user: user})">
                    <img src="{{user.gravatarLink}}" alt="" height="40" width="40">
                    <span>{{user.username}}</span>
                </li>
            </ul>`,
            replace: true
        };
    })

    // Directive to display chat title consists of contact name and close button. Parameters are user and function to invoke when click on the button.
    .directive('chatTitle', function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                user: '=',
                closeChatWindow: "&"
            },
            controller: function($scope, $element) {
                var user = $scope.user;
            },
            template:
            `<div>
                <button ng-click="closeChatWindow({user: user})" title="Close" class="close-btn">X</button>
                <h3>Private chat with {{user.username}}</h3>
            </div>`,
            replace: true
        };
    })

    // Directive to display chat messages. Accepts message as the parameter.
    .directive('chatMessage', function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {
                message: '=',
                openFile: "&"
            },
            template:
            `<div>
                <span ng-class="message.self ? 'self-chat' : 'contact-chat'"><b>{{message.sender}}:</b></span>
                <span ng-if="message.file" style="color: blue">
                <!--<a target='_blank' download='{{message.text}}' href='{{message.file}}'>{{message.text}}</a>-->
                 <a target='_blank' href='data:image/png;base64,{{message.file.substring(23)}}'>
                 <img ng-src="data:image/png;base64,{{message.file.substring(23)}}" alt="{{message.text}}" width="100px" height="100px">
                 <!--{{message.text}}-->
                 </a>
                 </span>
                <span ng-if="!message.file"> {{message.text}}</span>
            </div>`,
            replace: true
        };
    })

    // Directive to display typing message.
    .directive('typingMessage', function() {
        return {
            restrict: 'E',
            transclude: true,
            scope: {typingMessage: '=' },
            controller: function ($scope) {
                var message = '';
                $scope.$watch('typingMessage', function () {
                    message = $scope.typingMessage;
                })
            },
            template:
                `<div>
                    <span>{{typingMessage}}</span>
                    <!-- In order to make a fixed space to display 'X is typing'. This space should be there even when the typing message is not there. Otherwise the input field bounces everytime with when message appears ans disappears.-->
                    <span>&nbsp;</span>
                </div>`,
            replace: true
        };
    })