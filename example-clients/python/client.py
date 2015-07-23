#!/usr/bin/env python
from time import sleep
from socketIO_client import SocketIO, BaseNamespace

class Namespace(BaseNamespace):

    def initialize(self):
        self.on('showMedia', self.on_showMedia)
        pass

    def on_connect(self):
        self.emit('listScenes', self.on_listScenes_response)

    def on_showMedia(self, showEvent):
        mo = showEvent['mediaObject']
        moId = mo['_id']
        data = mo['url'] if hasattr(mo, 'url') else mo['text']
        print 'showMedia event recieved for "' + data + '"'
        # print mediaObject
        self.emit('mediaTransitioning', moId)
        self.emit('mediaDone', moId)
        sleep(1)

    def on_listScenes_response(self, err, scenes):
        # import ipdb; ipdb.set_trace()
        print scenes
        self.emit('loadScene', scenes[0].get('_id'), self.on_loadScene_response)

    def on_loadScene_response(self, err, scene):
        print scene
        self.emit('playScene',scene.get('_id'))


socketIO = SocketIO('localhost', 7000, Namespace)
socketIO.wait(seconds=20)

