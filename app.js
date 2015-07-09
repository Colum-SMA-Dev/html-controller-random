'use strict';

var htmlController = require('html-controller')();


htmlController.on('connection', function(socket) {
    socket.on('playScene', function(sceneId, callback) {
        htmlController.hub.emit('loadScene', sceneId, function(err, scene) {
            socket.emit('showMedia', scene.scene[0]);
        });
    });
});

htmlController.listen(process.env.PORT, process.env.HUB_URL, process.env.HUB_PASSWORD);




