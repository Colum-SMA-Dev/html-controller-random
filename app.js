'use strict';

var htmlController = require('html-controller')();
var MediaObjectQueue = require('./src/media-object/media-object-queue');
var TextMediaObject = require('./src/media-object/text-media-object');
var ImageMediaObject = require('./src/media-object/image-media-object');

htmlController.on('connection', function(socket) {
    var mediaObjectQueue = new MediaObjectQueue(
        [TextMediaObject, ImageMediaObject],
        {image: 3, text: 1}
    );



    socket.on('playScene', function(sceneId, callback) {
        htmlController.hub.emit('loadScene', sceneId, function(err, scene) {
            if (err) {
                callback(err);
            } else {
                mediaObjectQueue.setScene(scene, {hardReset: true});
                socket.emit('showMedia', scene.scene[0]);
            }
        });
    });
});

htmlController.listen(process.env.PORT, process.env.HUB_URL, process.env.HUB_PASSWORD);




