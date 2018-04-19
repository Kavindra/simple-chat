/*
* Directive to invoke a function when the user presses 'Enter' key after typing the message.
* */
angular.module('simpleChat').directive('handleEnter', function () {
    return (scope, element, attrs) => {
        element.bind("keydown keypress", (event) => {
            if(event.which === 13) { // Check whether the key is 'Enter' key
                scope.$apply(() => {
                    scope.$eval(attrs.handleEnter);
                });

                event.preventDefault();
            }
        });
    };
});