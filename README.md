# media-frameworks-html-controller-random [![Build Status](https://travis-ci.org/Colum-SMA-Dev/media-frameworks-html-controller-random.svg?branch=master)](https://travis-ci.org/Colum-SMA-Dev/media-frameworks-html-controller-random)

Subset of the html-controller that triggers a "humanized" random display of media objects

A typical flow of messages between a client and controller would like this:

```
          Client                                          Controller

"playScene, 'aonthao23244'"     ---------> Controller gets scene from hub
                                                    |
                                                    V
Client displays mediaObject 1   <--------- "showMedia, {transitionDuration: 2.5, displayDuration: 10, mediaObject {_id: 1, ...}"
Client displays mediaObject 2   <--------- "showMedia, {transitionDuration: 2.5, displayDuration: 10, mediaObject {_id: 2, ...}"
          |
          V
 Client begins to transition out media 1
          |
          V
"mediaTransitioning, 1"         ---------> Controller checks to see if it can send another piece of media
                                                      |
                                                      V
Client displays mediaObject 3   <--------- "showMedia, {transitionDuration: 2.5, displayDuration: 10, mediaObject {_id: 3, ...}"
            
Client completes transition off of mediaObject 1
           |
           V
"mediaDone, 2"                  ---------> Controller puts mediaObject 1 back in the queue of media to show

Client begins to transition out media 2
          |
          V
"mediaTransitioning, 2"         --------->  Controller checks to see if it can send another piece of media
                                                      |
                                                      V
Client displays mediaObject 1   <--------- "showMedia, {transitionDuration: 2.5, displayDuration: 10, mediaObject {_id: 1, ...}"
```


and on and on...


## Development

After cloning the repository, install the dependencies:

```
npm install
```

Copy the example environment file and edit as you'd like.  

```
cp env-example.sh env.sh
```

Here's what they do:
* `HUB_PASSWORD` - Password to connect to the [MediaHub](https://github.com/Colum-SMA-Dev/MediaHub) with
* `HUB_URL` - Url where the [MediaHub](https://github.com/Colum-SMA-Dev/MediaHub) can be reached 
* `PORT` - Port that the controller should listen for clients on

Make it executable

```
chmod 755 env.sh
```

Start up the server like so

```
./env.sh node app.js
```

## Deployment

Follow all of the development steps.  However, depending on your hosting environment, it may make more sense to configure the environment variables through their UI rather than the `env.sh` shell script.

## API

API functionality is inherited from [media-frameworks-html-controller](https://github.com/Colum-SMA-Dev/media-frameworks-html-controller).  Refer to [it's api documentation](https://github.com/Colum-SMA-Dev/media-frameworks-html-controller#api) for those.

### Client Initiated Messages

#### playScene

`"playScene", "<id of scene>", callback(error)`

Tells the controller to begin playing a specific scene.  The controller will sending `showMedia` messages to the client.

#### mediaTransitioning

`"mediaTransitioning", "<id of media object>"`

Client is beginning to transition out a piece of media.  Clients should send this immediately when they begin their transitions so that the controller can send at `showMedia` message back with a replacement if possible.

#### mediaDone

`"mediaDone", "<id of media object>"`

Client has completed the transitioning of a piece of media.  This will allow the controller to send that media object out again at a later time.  If this message is never sent to the controller, then that media object will never be redisplayed in the future.

### Controller Initiated Messages

#### showMedia

`"showMedia", data`

Message sent to the client containing a media object and how to display it.  `data` is an object containing the following properties:

* `mediaObject` - An object describing a piece of media.  Refer to the [media-scene-schema.json](https://github.com/Colum-SMA-Dev/MediaHub/blob/master/docs/media-scene-schema.json) for more information
* `transitionDuration` - Advised number of seconds that the piece of media should take to be transitioned on/off the client
* `displayDuration` - Advised number of seconds the media should be displayed for.  This can be disregarded with no harm to client/controller interaction
