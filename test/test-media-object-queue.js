'use strict';

var _ = require('lodash');
_.mixin(require('lodash-deep'));
var MediaObjectQueue = require('../src/media-object/media-object-queue');
var assert = require('chai').assert;
var chance = require('chance').Chance();
var timer = require('timer-shim');
var inherits = require('inherits');
var MediaObject = require('../src/media-object/media-object');
var TagMatcher = require('tag-matcher');

// Make FooMediaObject and BarMediaObject for testing the queue
function FooMediaObject (obj) {
    MediaObject.call(this, obj);
}
function BarMediaObject (obj) {
    MediaObject.call(this, obj);
}
inherits(BarMediaObject, MediaObject);
inherits(FooMediaObject, MediaObject);

FooMediaObject.typeName = 'foo';
BarMediaObject.typeName = 'bar';


function makeScene (ops) {
    var scene = [];

    if (ops) {
        ['bar', 'foo'].forEach(function(type) {
            for (var i = 0; i < ops[type] || 0; i++) {
                scene.push({
                    type: type,
                    _id: chance.guid(),
                    url: chance.url()
                });
            }    
        });
    }
    
    
    return {
        name: chance.string(),
        _id: chance.guid(),
        themes: {},
        scene: scene
    };
}

function moWithTags (type, tags) {
    return {
        type: type,
        url: chance.string(),
        tags: tags
    };
}

describe('MediaObjectQueue', function () {
    beforeEach(function () {
        timer.pause();
    });

    afterEach(function () {
        timer.resume();
    });

    describe('play()', function () {
        beforeEach(function () {
            var scene = makeScene({foo: 4});
            scene.maximumOnScreen = {foo: 2};
            this.queue = new MediaObjectQueue({foo: 2, bar: 2});
            this.queue.setScene(scene);
        });

        afterEach(function () {
            this.queue.stop(); 
        });

        it('should dispatch a show event immediately', function () {
            var showCount = 0;
            this.queue.on('show', function(mo) {
                showCount++;
            });

            this.queue.play();
            assert.strictEqual(showCount, 1);
        });

        it('should dispatch show events each displayInterval until maximumOnScreen is reached', function () {
            var showCount = 0;
            this.queue.on('show', function(mo) {
                showCount++;
            });

            this.queue.play();
            assert.strictEqual(showCount, 1);
            timer.wind(this.queue.displayInterval);
            assert.strictEqual(showCount, 2);
            timer.wind(this.queue.displayInterval);
            assert.strictEqual(showCount, 2);
        });

        it('should immediately dispatch a show event when a media object is transitioning', function () {
            var shownMo,
                showCount = 0;

            this.queue.on('show', function(mo) {
                showCount++;
                shownMo = mo;
            });

            this.queue.play();
            this.queue.mediaTransitioning(shownMo._id);
            assert.strictEqual(showCount, 2);
        });
    });

    describe('show event', function () {
        beforeEach(function (done) {
            var self = this;
            var scene = makeScene({foo: 4});
            scene.maximumOnScreen = {foo: 2};
            this.queue = new MediaObjectQueue({foo: 2});
            this.queue.setScene(scene);
            this.queue.on('show', function(data) {
                self.showEvent = data;
                done();
            });
            this.queue.play();
        });

        afterEach(function () {
            this.queue.stop(); 
        });

        it('should contain a media object to show', function () {
            assert.isObject(this.showEvent.mediaObject);
        });

        it('should contain a displayDuration', function () {
            assert.isNumber(this.showEvent.displayDuration); 
        });

        it('should contain a transitionDuration', function () {
            assert.isNumber(this.showEvent.transitionDuration);  
        });
    });


    describe('queue refilling behavior', function () {
        beforeEach(function () {
            this.queue = new MediaObjectQueue({foo: 2, bar: 2});
            this.queue.setScene(makeScene({foo: 1}));
        });

        afterEach(function () {
            this.queue.stop();
        });

        it('should show the same mediaObject after it has stopped', function () {
            var shownMos = [];

            this.queue.on('show', function(data) {
                shownMos.push(data.mediaObject);
            });

            this.queue.play();
            this.queue.mediaTransitioning(shownMos[0]._id);
            this.queue.mediaDone(shownMos[0]._id);
            timer.wind(this.queue.displayInterval);
            assert.strictEqual(shownMos[0], shownMos[1]);
        });
    });


    describe('scene attributes', function () {
        beforeEach(function () {
            this.queue = new MediaObjectQueue({foo: 2, bar: 2});
        });

        function checkAttributes (expectedValues) {
            _.forEach(expectedValues, function(value, key) {
                it('should default queue.' + key + ' to ' + value, function () {
                    assert.strictEqual(_.deepGet(this.queue, key), value);
                });
            });
        }

        describe('using defaults', function () {
            beforeEach(function () {
                this.queue.setScene({});
            });

            checkAttributes({
                displayInterval: 3000,
                displayDuration: 10000,
                transitionDuration: 1400
            });
        });

        describe('overridding defaults', function () {
            beforeEach(function () {
                this.queue.setScene({
                    displayInterval: 4,
                    displayDuration: 13,
                    transitionDuration: 3,
                    maximumOnScreen: {
                        image: 4,
                        text: 5,
                        video: 6,
                        audio: 7
                    }
                });
            });

            checkAttributes({
                displayInterval: 4000,
                displayDuration: 13000,
                transitionDuration: 3000
            }); 

        });
        
    });

    describe('tagFiltering behavior', function () {
        beforeEach(function () {
            this.queue = new MediaObjectQueue({foo: 2, bar: 2});

            var scene = makeScene();
            scene.scene = [
                moWithTags('foo', 'apples, bananas'),
                moWithTags('foo', 'apples'),
                moWithTags('bar', 'apples')
            ];

            this.queue.setScene(scene);
        });

        afterEach(function () {
            this.queue.stop();
        });

        var carrotsMatcher = new TagMatcher('carrots');

        it('should not fill the queue with media objects that dont match the active tagFilter', function () {
            this.queue.play();
            var shownMo;
            this.queue.on('show', function(mo) {
                shownMo = mo;
            });
            this.queue.setTagMatcher(carrotsMatcher);
            timer.wind(this.queue.displayInterval);
            
            assert.isUndefined(shownMo);
        });


        it('should trigger a transition event for any non-matching media objects', function () {
            var showId, transitionId;
            this.queue.on('show', function(mo) {
                showId = mo._id;
            });
            this.queue.on('transition', function(mo) {
                transitionId = mo._id;
            });
            
            this.queue.play();
            this.queue.setTagMatcher(carrotsMatcher);
            assert.strictEqual(showId, transitionId);
        });

        it('should not trigger transition events for any matching media objects that are playing', function () {
            this.queue.play();
            this.queue.on('transition', function(mo) {
                assert.fail();
            });

            this.queue.play();
            this.queue.setTagMatcher(new TagMatcher('apples'));
        });        
    });

    describe('edge cases', function () {
        
        describe('no scene set', function () {
            beforeEach(function () {
                this.queue = new MediaObjectQueue({foo: 2, bar: 2});
            });

            afterEach(function () {
                this.queue.stop(); 
            });
        
            describe('play()', function () {
                it('should not dispatch any show events', function () {
                    this.queue.on('show', function(mo) {
                        assert.fail();
                    });
                    this.queue.play();
                });
            });
        });    
    });
});