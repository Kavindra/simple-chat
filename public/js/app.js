/*'use strict';

angular.module('simpleChat', [
    'components'
]);*/

(function () {
    'use strict';

    angular.module('simpleChat', [
        'components'
    ]);

    angular.module('simpleChat').config(['$compileProvider', function($compileProvider) {
        $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|blob):|data:image\//);

    }]);
})();

