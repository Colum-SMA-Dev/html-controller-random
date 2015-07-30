# media-frameworks-html-controller-random [![Build Status](https://travis-ci.org/Colum-SMA-Dev/media-frameworks-html-controller-random.svg?branch=master)](https://travis-ci.org/Colum-SMA-Dev/media-frameworks-html-controller-random)
Subset of the html-controller that triggers a "humanized" random display of media objects

## API

API functionality is inherited from [media-frameworks-html-controller](https://github.com/Colum-SMA-Dev/media-frameworks-html-controller).  Refer to [it's api documentation](https://github.com/Colum-SMA-Dev/media-frameworks-html-controller#api) for those.

### Client Initiated Messages

#### play

`"play", "<id of scene>"`

Tells the controller to begin playing a specific scene.  The controller will sending `showMedia` messages to the client.

#### mediaTransitioning

`"mediaTransitioning", "<id of media object>"`

Client is beginning to transition out a piece of media.  Clients should send this immediately when they begin their transitions so that the controller can send at `showMedia` message back with a replacement if possible.

#### mediaDone

`"mediaDone", "<id of media object>"`

Client has completed the transitioning of a piece of media.  This will allow the controller to send that media object out again at a later time.  If this message is never sent to the controller, then that media object will never be redisplayed in the future.
