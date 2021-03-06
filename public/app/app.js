var hogwartsApp = angular.module('hogwartsApp', ['ngCookies', 'pascalprecht.translate']);

// Short house name
hogwartsApp
    .filter('shortHouse', function () {
        return function (house) {
            return house.substr(0, 3);
        };
    })
    .filter('to_op', function () {
        return function (operation) {
            switch (operation) {
                case 'add':
                    return '+';
                case 'remove':
                    return '-';
                case 'set':
                    return '=';
            }
        }
    });

hogwartsApp.config(function ($translateProvider) {
    $translateProvider.translations('fr', {
        'slytherin': 'serpentard',
        'ravenclaw': 'serdaigle',
        'gryffindor': 'gryffondor',
        'hufflepuff': 'poufsouffle',
        'house': 'maison',
        'user': 'utilisateur',
        'operation': 'operation',
        'amount': 'montant',
        'reason': 'raison',
        'public reason': 'raison publique',
        'add': 'ajouter',
        'remove': 'retirer',
        'set': 'fixer'
    });
});

hogwartsApp.controller('HourglassController', function ($scope, $http, $interval, $translate) {

    $translate.use('fr'); // TODO Change

    $scope.version = null;
    $scope.autoRefresh = true;
    $scope.interval = 30000;
    $scope.scoreStep = 1000;
    $scope.operationNumber = 10;
    $scope.minScore = 0;
    $scope.maxScore = $scope.minScore + $scope.scoreStep;
    $scope.houses = {
        slytherin: {
            score: 0
        },
        ravenclaw: {
            score: 0
        },
        gryffindor: {
            score: 0
        },
        hufflepuff: {
            score: 0
        }
    };
    $scope.operations = [];

    $scope.update = function () {

        var calcBestScore = function (houses) {
            var best = 0;
            houses.forEach(function (house) {
                best = Math.max(best, house.score);
            });
            return best;
        };

        var calcMaxScore = function (houses, max) {
            var maxScore = $scope.scoreStep;
            while (maxScore <= max)
                maxScore *= 2;
            return maxScore;
        };

        var calcMinScore = function (houses, best, worst) {
	    if (worst < $scope.scoreStep)
		return 0;
	    minScore = 0;
	    while (minScore + $scope.scoreStep < worst)
		minScore += $scope.scoreStep;
	    return Math.min(minScore, worst - $scope.maxScore * 0.1);
        };

        var calcWorstScore = function (houses, best) {
            var worst = best;
            houses.forEach(function (house) {
                worst = Math.min(worst, house.score);
            });
            return worst;
        };

        $http.get(api_host + '/api/v1/houses').then(function(response) {
            var bestScore = calcBestScore(response.data);
            var worstScore = calcWorstScore(response.data, bestScore);
            $scope.maxScore = calcMaxScore(response.data, bestScore);
            $scope.minScore = calcMinScore(response.data, bestScore, worstScore);
            response.data.forEach(function (house, index) {
                house.place = index + 1;
                $scope.houses[house.name] = house;
            });
        });

        $http.get(api_host + '/api/v1/operations?limit='+$scope.operationNumber).then(function(response) {
            $scope.operations = response.data;
        });
    };

    $scope.refresh = function () {
        $http.get(api_host + '/api/v1/version').then(function (response) {
            if ($scope.version == null) {
                $scope.version = response.data;
            } else if ($scope.version != response.data) {
                location.reload(true);
            }
        });
    };

    $scope.update();

    // Refresh scores
    $interval($scope.update, $scope.interval);

    if ($scope.autoRefresh)
        $interval($scope.refresh, 300000);
});

hogwartsApp.controller('AdminController', function ($scope, $cookies, $http, $translate) {

    $translate.use('fr'); // TODO Change

    $scope.operationsLimit = 10;
    $scope.operationsPage = 0;
    $scope.operations = [];

    $scope.loginData = {
        email: '',
        password: ''
    };

    $scope.user = {
        name: undefined,
        email: undefined,
        admin: false
    };

    $scope.houseOperationData = {
        house: "slytherin",
        action: "add",
        amount: undefined,
        reason: null,
        publicReason: null
    };

    $scope.createUserData = {
        name: '',
        email: '',
        password: '',
        admin: false,
        errors: {}
    };

    $scope.changePasswordData = {
        password: '',
        confirm_password: '',
        errors: {}
    };

    $scope.getUser = function () {
        $http.get(api_host + '/api/v1/user?key=' + $scope.token).then(function (response) {
            $scope.user = response.data;
        });
    };

    $scope.login = function (email, password) {
        $http.post(api_host + '/api/v1/auth', {
            email: email,
            password: password
        }).then(function (response) {
            $scope.invalidLogin = false;
            $scope.hasToken = true;
            $scope.token = response.data.key;
            $cookies.put('api_token', $scope.token);
            $scope.getUser();
            $scope.updateOperations();
        }, function () {
            $scope.invalidLogin = true;
        });
    };

    $scope.logout = function () {
        $cookies.put('api_token', undefined);
        $scope.hasToken = false;
        $scope.token = null;
    };

    $scope.updateOperations = function () {
        $http.get(api_host + '/api/v1/operations?key=' + $scope.token + '&limit=' + $scope.operationsLimit + '&offset=' + $scope.operationsPage * $scope.operationsLimit)
            .then(function (response) {
            $scope.operations = response.data;
        });
    };

    $scope.previousPage = function () {
        if ($scope.operationsPage > 0)
            $scope.operationsPage--;
        $scope.updateOperations();
    };

    $scope.nextPage = function () {
        $scope.operationsPage++;
        $scope.updateOperations();
    };

    $scope.houseOperation = function (house, action, amount, reason, publicReason) {
        $http.put(api_host + '/api/v1/houses/' + house, {
            action: action,
            amount: amount,
            key: $scope.token,
            reason: reason,
            public_reason: publicReason
        }).then(function () {
            $scope.operationsPage = 0;
            $scope.updateOperations();
        });
    };

    $scope.submitHouseOperationForm = function() {
        $scope.houseOperation($scope.houseOperationData.house,
            $scope.houseOperationData.action,
            $scope.houseOperationData.amount,
            $scope.houseOperationData.reason,
            $scope.houseOperationData.publicReason);
        $scope.houseOperationData.amount = 0;
        $scope.houseOperationData.action = 'add';
        $scope.houseOperationData.reason = null;
        $scope.houseOperationData.publicReason = null;
    };

    $scope.createUser = function (name, email, password, admin) {
        $http.post(api_host + '/api/v1/users', {
            name: name,
            email: email,
            password: password,
            admin: admin,
            key: $scope.token
        }).then(function () {}, function (response) {
            $scope.createUserData.errors = response.data[Object.keys(response.data)[0]][0];
        });
    };

    $scope.submitCreateUserForm = function () {
        $scope.createUserData.error = '';
        $scope.createUser($scope.createUserData.name,
            $scope.createUserData.email,
            $scope.createUserData.password,
            $scope.createUserData.admin
        );
        $scope.createUserData.name = '';
        $scope.createUserData.email = '';
        $scope.createUserData.password = '';
        $scope.createUserData.admin = false;
    };

    $scope.changePassword = function (password) {
        $http.put(api_host + '/api/v1/user', {
            password: password,
            key: $scope.token
        }).then(function () {}, function (response) {
            $scope.changePasswordData.errors = response.data[Object.keys(response.data)[0]][0];
        });
    };

    $scope.submitChangePasswordForm = function () {
        $scope.changePasswordData.errors = {};
        if ($scope.changePasswordData.password == '') {
            $scope.changePasswordData.errors.confirm = 'Passwords cannot be empty';
            return
        }
        else if ($scope.changePasswordData.password != $scope.changePasswordData.confirm_password) {
            $scope.changePasswordData.errors.confirm = 'Passwords are differents';
            return
        }
        $scope.changePassword($scope.changePasswordData.password);
        $scope.changePasswordData.password = '';
        $scope.changePasswordData.confirm_password = '';
    };

    $scope.token = $cookies.get('api_token');
    $scope.hasToken = Boolean($scope.token);
    if ($scope.hasToken) {
        $scope.invalidLogin = false;
        $scope.getUser();
        $scope.updateOperations();
    }
});
